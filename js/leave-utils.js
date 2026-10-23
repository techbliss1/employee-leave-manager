/* =========================================================================
 * leave-utils.js — Pure helper functions (dates, day counting, balances).
 * All dates are handled as local "YYYY-MM-DD" strings to avoid time-zone bugs.
 * ========================================================================= */
(function (global) {
  'use strict';

  const { LEAVE_TYPES, HOLIDAYS } = global.LeaveData;
  const DAY_MS = 24 * 60 * 60 * 1000;

  /* ---------- Date helpers ---------- */
  function parseISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function todayISO() {
    return toISO(new Date());
  }

  function addDays(iso, n) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  function isWeekend(iso) {
    const day = parseISO(iso).getDay();
    return day === 0 || day === 6;
  }

  function holidayName(iso) {
    const md = iso.slice(5);
    const h = HOLIDAYS.find((x) => x.md === md);
    return h ? h.name : null;
  }

  function isWorkingDay(iso) {
    return !isWeekend(iso) && !holidayName(iso);
  }

  /** Move forward to the next working day (returns same date if already one). */
  function nextWorkingDay(iso) {
    let cur = iso;
    while (!isWorkingDay(cur)) cur = addDays(cur, 1);
    return cur;
  }

  /** Return the date after adding `count` working days, inclusive of start. */
  function endAfterWorkingDays(startISO, count) {
    let cur = nextWorkingDay(startISO);
    let remaining = Math.max(1, Math.ceil(count)) - 1;
    while (remaining > 0) {
      cur = addDays(cur, 1);
      if (isWorkingDay(cur)) remaining--;
    }
    return cur;
  }

  /** Count working days between two dates (inclusive). Half-day = 0.5. */
  function countWorkingDays(startISO, endISO, halfDay) {
    if (!startISO || !endISO || endISO < startISO) return 0;
    let count = 0;
    let cur = startISO;
    while (cur <= endISO) {
      if (isWorkingDay(cur)) count++;
      cur = addDays(cur, 1);
    }
    if (halfDay && startISO === endISO && count === 1) return 0.5;
    return count;
  }

  function diffDays(aISO, bISO) {
    return Math.round((parseISO(bISO) - parseISO(aISO)) / DAY_MS);
  }

  function formatDate(iso, opts) {
    if (!iso) return '—';
    return parseISO(iso).toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatRange(startISO, endISO) {
    if (startISO === endISO) return formatDate(startISO);
    const s = parseISO(startISO);
    const e = parseISO(endISO);
    const sameYear = s.getFullYear() === e.getFullYear();
    const startStr = formatDate(startISO, sameYear ? { day: 'numeric', month: 'short' } : undefined);
    return `${startStr} – ${formatDate(endISO)}`;
  }

  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && bStart <= aEnd;
  }

  /** Holidays (with full dates) for a given year. */
  function holidaysForYear(year) {
    return HOLIDAYS.map((h) => ({ date: `${year}-${h.md}`, name: h.name }));
  }

  /* ---------- Leave domain helpers ---------- */
  function getLeaveType(id) {
    return LEAVE_TYPES.find((t) => t.id === id) || { id, name: id, allowance: null, color: '#64748b', icon: '📄' };
  }

  /**
   * Calculate a balance summary for an employee + leave type in a given year.
   * used     = approved days
   * pending  = days in pending requests
   * remaining = allowance - used
   * available = remaining - pending (what can still be requested)
   */
  function getBalance(requests, employeeId, typeId, year) {
    const type = getLeaveType(typeId);
    const relevant = requests.filter(
      (r) => r.employeeId === employeeId && r.type === typeId && parseISO(r.startDate).getFullYear() === year
    );
    const used = sum(relevant.filter((r) => r.status === 'Approved').map((r) => r.days));
    const pending = sum(relevant.filter((r) => r.status === 'Pending').map((r) => r.days));
    if (type.allowance == null) {
      return { type, allowance: null, used, pending, remaining: Infinity, available: Infinity };
    }
    const remaining = Math.max(0, type.allowance - used);
    const available = Math.max(0, remaining - pending);
    return { type, allowance: type.allowance, used, pending, remaining, available };
  }

  function sum(arr) {
    return arr.reduce((a, b) => a + (Number(b) || 0), 0);
  }

  function fmtDays(n) {
    if (n === Infinity) return '∞';
    const v = Math.round(n * 10) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }

  function uid(prefix) {
    return `${prefix || 'LR'}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  global.LeaveUtils = Object.freeze({
    parseISO, toISO, todayISO, addDays, isWeekend, holidayName, isWorkingDay, nextWorkingDay,
    endAfterWorkingDays, countWorkingDays, diffDays, formatDate, formatRange, rangesOverlap,
    holidaysForYear, getLeaveType, getBalance, sum, fmtDays, escapeHtml, initials, uid
  });
})(window);
