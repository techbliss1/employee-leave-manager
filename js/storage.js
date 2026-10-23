/* ==========================================================
   Data layer: localStorage persistence + leave business rules
   ========================================================== */
const Store = (() => {
  const KEY = "elm.data.v1";
  const SETTINGS_KEY = "elm.settings.v1";
  let state = null;

  function seed() {
    state = {
      employees: SAMPLE_EMPLOYEES.map((e) => ({ ...e })),
      requests: buildSampleRequests(),
      seededAt: new Date().toISOString(),
    };
    save();
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.employees) && Array.isArray(parsed.requests)) {
        state = parsed;
        return;
      }
    } catch (err) {
      console.warn("Stored data was unreadable; restoring sample data.", err);
    }
    seed();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error("Unable to save to localStorage", err);
      Utils.toast("Could not save data to local storage.", "error");
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
    seed();
  }

  /* ---------- Settings (theme, signed-in demo employee) ---------- */
  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch {
      return {};
    }
  }
  function setSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  /* ---------- Queries ---------- */
  const getEmployees = () => state.employees;
  const getEmployee = (id) => state.employees.find((e) => e.id === id);
  const getRequests = () => state.requests;
  const getRequest = (id) => state.requests.find((r) => r.id === id);
  const getLeaveType = (id) => LEAVE_TYPES.find((t) => t.id === id);
  const requestsFor = (employeeId) => state.requests.filter((r) => r.employeeId === employeeId);

  /**
   * Balance per leave type for an employee in a given calendar year.
   * used = approved days, pending = days awaiting approval,
   * available = allowance - used - pending (null when unlimited).
   */
  function getBalances(employeeId, year = Utils.today().getFullYear()) {
    const reqs = requestsFor(employeeId).filter((r) => Utils.parseISODate(r.startDate).getFullYear() === year);
    return LEAVE_TYPES.map((type) => {
      const ofType = reqs.filter((r) => r.type === type.id);
      const used = sum(ofType.filter((r) => r.status === "Approved"));
      const pending = sum(ofType.filter((r) => r.status === "Pending"));
      const available = type.allowance == null ? null : Math.max(0, type.allowance - used - pending);
      return { type, used, pending, available };
    });
  }
  const sum = (list) => list.reduce((acc, r) => acc + r.days, 0);

  /** Validate a new request; returns an error string or null. */
  function validateRequest({ employeeId, type, startDate, endDate, halfDay, reason }) {
    if (!type || !getLeaveType(type)) return "Please choose a leave type.";
    if (!startDate || !endDate) return "Please choose both a start and end date.";
    if (endDate < startDate) return "End date cannot be before the start date.";
    if (halfDay && startDate !== endDate) return "A half day request must start and end on the same date.";
    if (!reason || reason.trim().length < 3) return "Please provide a short reason (at least 3 characters).";

    const days = calcDays(startDate, endDate, halfDay);
    if (days <= 0) return "The selected dates contain no working days (weekends are excluded).";

    const leaveType = getLeaveType(type);
    // Sick & bereavement leave may be recorded retroactively; other types must be today or later.
    const retroAllowed = type === "sick" || type === "bereavement";
    if (!retroAllowed && startDate < Utils.toISODate(Utils.today())) {
      return `${leaveType.name} must start today or in the future.`;
    }

    const overlap = requestsFor(employeeId).find(
      (r) => (r.status === "Pending" || r.status === "Approved") &&
        Utils.rangesOverlap(startDate, endDate, r.startDate, r.endDate)
    );
    if (overlap) {
      return `These dates overlap an existing ${overlap.status.toLowerCase()} request (${Utils.formatRange(overlap.startDate, overlap.endDate)}).`;
    }

    if (leaveType.allowance != null) {
      const year = Utils.parseISODate(startDate).getFullYear();
      const bal = getBalances(employeeId, year).find((b) => b.type.id === type);
      if (days > bal.available) {
        return `Insufficient ${leaveType.name.toLowerCase()} balance: ${Utils.formatDays(bal.available)} available, ${Utils.formatDays(days)} requested.`;
      }
    }
    return null;
  }

  function calcDays(startDate, endDate, halfDay) {
    const days = Utils.countWorkingDays(startDate, endDate);
    return halfDay && days === 1 ? 0.5 : days;
  }

  /* ---------- Mutations ---------- */
  function addRequest(input) {
    const error = validateRequest(input);
    if (error) throw new Error(error);
    const req = {
      id: Utils.uid("req"),
      employeeId: input.employeeId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      days: calcDays(input.startDate, input.endDate, input.halfDay),
      halfDay: !!input.halfDay,
      reason: input.reason.trim(),
      status: "Pending",
      submittedAt: new Date().toISOString(),
      decidedAt: null,
      managerComment: "",
    };
    state.requests.push(req);
    save();
    return req;
  }

  function decide(id, status, comment = "") {
    const req = getRequest(id);
    if (!req) throw new Error("Request not found.");
    if (req.status !== "Pending") throw new Error(`This request is already ${req.status.toLowerCase()}.`);
    if (!["Approved", "Rejected"].includes(status)) throw new Error("Invalid decision.");
    if (status === "Rejected" && !comment.trim()) throw new Error("Please add a comment explaining the rejection.");
    req.status = status;
    req.managerComment = comment.trim();
    req.decidedAt = new Date().toISOString();
    save();
    return req;
  }

  function cancel(id, employeeId) {
    const req = getRequest(id);
    if (!req || req.employeeId !== employeeId) throw new Error("Request not found.");
    if (req.status !== "Pending") throw new Error("Only pending requests can be cancelled.");
    req.status = "Cancelled";
    req.decidedAt = new Date().toISOString();
    save();
    return req;
  }

  /** Requests that overlap the given one from colleagues in the same department. */
  function teamConflicts(req) {
    const emp = getEmployee(req.employeeId);
    return state.requests.filter((r) => {
      if (r.id === req.id || r.employeeId === req.employeeId) return false;
      if (r.status !== "Approved" && r.status !== "Pending") return false;
      const other = getEmployee(r.employeeId);
      return other && emp && other.department === emp.department &&
        Utils.rangesOverlap(req.startDate, req.endDate, r.startDate, r.endDate);
    });
  }

  return {
    load, reset, save, getSettings, setSetting,
    getEmployees, getEmployee, getRequests, getRequest, getLeaveType, requestsFor,
    getBalances, validateRequest, calcDays, addRequest, decide, cancel, teamConflicts,
  };
})();
