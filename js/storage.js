/**
 * LeaveStore — data layer for the Employee Leave Manager demo.
 * Persists employees and leave requests in browser localStorage and
 * seeds realistic sample data (relative to today) on first run.
 */
const LeaveStore = (() => {
  'use strict';

  const STORAGE_KEY = 'elm.data.v1';

  const LEAVE_TYPES = {
    annual: { label: 'Annual Leave', allowance: 18, color: '#6366f1', icon: '🌴' },
    sick:   { label: 'Sick Leave',   allowance: 10, color: '#0ea5e9', icon: '🤒' },
    casual: { label: 'Casual Leave', allowance: 6,  color: '#f59e0b', icon: '☕' },
    unpaid: { label: 'Unpaid Leave', allowance: null, color: '#64748b', icon: '📄' },
  };

  const SAMPLE_EMPLOYEES = [
    { id: 'E001', name: 'Aarav Mehta',     title: 'Software Engineer',    department: 'Engineering' },
    { id: 'E002', name: 'Sophia Williams', title: 'Product Designer',     department: 'Design' },
    { id: 'E003', name: 'Rahul Verma',     title: 'QA Analyst',           department: 'Engineering' },
    { id: 'E004', name: 'Emily Chen',      title: 'Marketing Specialist', department: 'Marketing' },
    { id: 'E005', name: 'Daniel Okafor',   title: 'Sales Executive',      department: 'Sales' },
    { id: 'E006', name: 'Ananya Iyer',     title: 'HR Associate',         department: 'Human Resources' },
  ];

  // [employeeId, type, startOffsetDays, workingDays, status, reason, managerComment, submittedDaysAgo]
  const SAMPLE_REQUESTS = [
    ['E001', 'annual', 12, 5, 'pending',   'Family vacation to Goa', '', 2],
    ['E001', 'sick',  -40, 2, 'approved',  'Viral fever, doctor advised rest', 'Get well soon!', 40],
    ['E001', 'casual',-20, 1, 'rejected',  'Personal errand', 'Release day for Sprint 21 — please pick another date.', 25],
    ['E002', 'annual', -3, 7, 'approved',  'Trip to visit family in Boston', 'Enjoy your trip!', 20],
    ['E002', 'casual', 15, 1, 'pending',   'Moving to a new apartment', '', 1],
    ['E002', 'sick', -120, 2, 'cancelled', 'Dental surgery', '', 125],
    ['E003', 'annual', 20, 3, 'pending',   "Attending a friend's wedding", '', 3],
    ['E003', 'sick',  -60, 3, 'approved',  'Recovering from flu', 'Take care.', 60],
    ['E004', 'unpaid', 30, 10,'pending',   'Extended personal travel', '', 4],
    ['E004', 'annual',-90, 5, 'approved',  'Summer holiday', 'Approved — handover to Daniel.', 110],
    ['E005', 'casual',  2, 1, 'approved',  "Child's school annual day", 'Approved.', 6],
    ['E005', 'annual',  8, 4, 'rejected',  'Long weekend getaway', 'Quarter-end targets — let us revisit next month.', 9],
    ['E006', 'sick',  -10, 1, 'approved',  'Migraine', 'Hope you feel better.', 10],
    ['E006', 'annual', 45, 5, 'pending',   'Year-end holiday with family', '', 5],
  ];

  /* ---------- Date helpers ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()); c.setDate(c.getDate() + n); return c; };
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
  const nextWeekday = (d) => { let c = d; while (isWeekend(c)) c = addDays(c, 1); return c; };

  /** Working days (Mon–Fri) between two ISO dates, inclusive. */
  function countBusinessDays(startISO, endISO) {
    if (!startISO || !endISO) return 0;
    let d = parseISO(startISO);
    const end = parseISO(endISO);
    let count = 0;
    while (d <= end) { if (!isWeekend(d)) count++; d = addDays(d, 1); }
    return count;
  }

  /* ---------- Persistence ---------- */
  let memoryFallback = null;
  let data = null;

  function readRaw() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return memoryFallback; }
  }
  function writeRaw(str) {
    try { localStorage.setItem(STORAGE_KEY, str); } catch { memoryFallback = str; }
  }

  function buildSeed() {
    const t = today();
    const requests = SAMPLE_REQUESTS.map((r, i) => {
      const [employeeId, type, startOffset, len, status, reason, comment, submittedAgo] = r;
      const start = nextWeekday(addDays(t, startOffset));
      let end = start;
      for (let n = 1; n < len; n++) end = nextWeekday(addDays(end, 1)); // len = working days
      const created = addDays(t, -submittedAgo);
      created.setHours(9 + (i % 8), (i * 7) % 60);
      const decided = status === 'pending' ? null : new Date(created.getTime() + 26 * 3600 * 1000);
      return {
        id: `LR-${1001 + i}`,
        employeeId, type,
        startDate: toISO(start),
        endDate: toISO(end),
        days: countBusinessDays(toISO(start), toISO(end)),
        reason, status,
        managerComment: comment,
        createdAt: created.toISOString(),
        decidedAt: decided ? decided.toISOString() : null,
      };
    });
    return { version: 1, nextId: 1001 + requests.length, employees: SAMPLE_EMPLOYEES.map((e) => ({ ...e })), requests };
  }

  function load() {
    const raw = readRaw();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.employees) && Array.isArray(parsed.requests)) { data = parsed; return; }
      } catch { /* fall through to seed */ }
    }
    data = buildSeed();
    save();
  }
  function save() { writeRaw(JSON.stringify(data)); }

  /* ---------- Public API ---------- */
  function getEmployees() { return data.employees.slice(); }
  function getEmployee(id) { return data.employees.find((e) => e.id === id) || null; }
  function getRequests() { return data.requests.slice(); }
  function getRequestsFor(employeeId) { return data.requests.filter((r) => r.employeeId === employeeId); }

  function getBalance(employeeId, year = today().getFullYear()) {
    const result = {};
    Object.entries(LEAVE_TYPES).forEach(([key, meta]) => {
      const reqs = data.requests.filter((r) => r.employeeId === employeeId && r.type === key && parseISO(r.startDate).getFullYear() === year);
      const used = reqs.filter((r) => r.status === 'approved').reduce((s, r) => s + r.days, 0);
      const pending = reqs.filter((r) => r.status === 'pending').reduce((s, r) => s + r.days, 0);
      result[key] = {
        allowance: meta.allowance, used, pending,
        remaining: meta.allowance == null ? null : Math.max(meta.allowance - used - pending, 0),
      };
    });
    return result;
  }

  function findOverlap(employeeId, startISO, endISO) {
    return data.requests.find((r) => r.employeeId === employeeId &&
      (r.status === 'pending' || r.status === 'approved') &&
      r.startDate <= endISO && r.endDate >= startISO) || null;
  }

  function addRequest({ employeeId, type, startDate, endDate, reason }) {
    const req = {
      id: `LR-${data.nextId++}`,
      employeeId, type, startDate, endDate,
      days: countBusinessDays(startDate, endDate),
      reason: reason.trim(),
      status: 'pending',
      managerComment: '',
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    data.requests.push(req);
    save();
    return req;
  }

  function setStatus(id, status, comment = '') {
    const req = data.requests.find((r) => r.id === id);
    if (!req) return null;
    req.status = status;
    if (status !== 'cancelled') req.managerComment = comment.trim();
    req.decidedAt = new Date().toISOString();
    save();
    return req;
  }

  function reset() { data = buildSeed(); save(); }

  load();

  return {
    LEAVE_TYPES, toISO, parseISO, addDays, today, countBusinessDays,
    getEmployees, getEmployee, getRequests, getRequestsFor, getBalance,
    findOverlap, addRequest, setStatus, reset,
  };
})();
