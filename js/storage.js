/* =========================================================================
 * storage.js — Persistence layer using the browser's localStorage.
 * Builds the demo seed data on first run and exposes load/save/reset.
 * ========================================================================= */
(function (global) {
  'use strict';

  const { EMPLOYEES, SEED_TEMPLATES, MANAGER } = global.LeaveData;
  const U = global.LeaveUtils;

  const STORAGE_KEY = 'leaveflow.state.v1';
  const SCHEMA_VERSION = 1;

  /** Create the initial demo dataset relative to today's date. */
  function buildSeedState() {
    const today = U.todayISO();
    const requests = SEED_TEMPLATES.map((t, i) => {
      const startDate = U.nextWorkingDay(U.addDays(today, t.start));
      const endDate = t.halfDay ? startDate : U.endAfterWorkingDays(startDate, t.span);
      // Applied date must be on or before start date and not in the future.
      let appliedOn = U.addDays(today, t.applied);
      if (appliedOn > startDate) appliedOn = U.addDays(startDate, -1);
      const reviewed = t.status === 'Approved' || t.status === 'Rejected';
      let reviewedOn = reviewed ? U.addDays(appliedOn, 1) : null;
      if (reviewedOn && reviewedOn > today) reviewedOn = today;

      return {
        id: `LR-${String(1001 + i)}`,
        employeeId: t.emp,
        type: t.type,
        startDate,
        endDate,
        halfDay: !!t.halfDay,
        days: U.countWorkingDays(startDate, endDate, !!t.halfDay),
        reason: t.reason,
        status: t.status,
        appliedOn,
        reviewedOn,
        reviewedBy: reviewed ? MANAGER.name : null,
        managerComment: t.note || '',
        cancelledOn: t.status === 'Cancelled' ? U.addDays(appliedOn, 1) > today ? today : U.addDays(appliedOn, 1) : null
      };
    });

    return {
      version: SCHEMA_VERSION,
      seededOn: today,
      employees: EMPLOYEES.map((e) => ({ ...e })),
      requests,
      ui: { view: 'employee', currentEmployeeId: EMPLOYEES[0].id, theme: 'light' }
    };
  }

  function isValidState(s) {
    return s && s.version === SCHEMA_VERSION && Array.isArray(s.employees) && Array.isArray(s.requests) && s.ui;
  }

  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidState(parsed)) return parsed;
      }
    } catch (err) {
      console.warn('LeaveFlow: could not read saved data, re-seeding.', err);
    }
    const seed = buildSeedState();
    save(seed);
    return seed;
  }

  function save(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('LeaveFlow: could not save data.', err);
      return false;
    }
  }

  function reset(keepTheme) {
    const seed = buildSeedState();
    if (keepTheme) seed.ui.theme = keepTheme;
    save(seed);
    return seed;
  }

  global.LeaveStorage = Object.freeze({ STORAGE_KEY, load, save, reset, buildSeedState });
})(window);
