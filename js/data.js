/* ==========================================================
   Static configuration + sample (seed) data
   Sample request dates are generated relative to "today" so the
   demo always looks current whenever the app is opened.
   ========================================================== */
const LEAVE_TYPES = [
  { id: "annual",      name: "Annual Leave",      allowance: 20,   color: "#4f46e5", icon: "🌴" },
  { id: "sick",        name: "Sick Leave",        allowance: 10,   color: "#ef4444", icon: "🤒" },
  { id: "personal",    name: "Personal Leave",    allowance: 5,    color: "#0ea5e9", icon: "🏠" },
  { id: "parental",    name: "Parental Leave",    allowance: 15,   color: "#db2777", icon: "👶" },
  { id: "bereavement", name: "Bereavement Leave", allowance: 5,    color: "#64748b", icon: "🕊️" },
  { id: "unpaid",      name: "Unpaid Leave",      allowance: null, color: "#f59e0b", icon: "💼" }, // null = no limit
];

const SAMPLE_EMPLOYEES = [
  { id: "emp-1", name: "Ava Thompson",   department: "Engineering", title: "Senior Developer",   color: "#4f46e5" },
  { id: "emp-2", name: "Liam Patel",     department: "Engineering", title: "QA Engineer",        color: "#0891b2" },
  { id: "emp-3", name: "Sofia Garcia",   department: "Marketing",   title: "Marketing Lead",     color: "#db2777" },
  { id: "emp-4", name: "Noah Kim",       department: "Sales",       title: "Account Executive",  color: "#16a34a" },
  { id: "emp-5", name: "Emma Johansson", department: "HR",          title: "HR Generalist",      color: "#9333ea" },
  { id: "emp-6", name: "Mateo Rossi",    department: "Finance",     title: "Financial Analyst",  color: "#ea580c" },
  { id: "emp-7", name: "Chloe Dubois",   department: "Design",      title: "Product Designer",   color: "#0d9488" },
  { id: "emp-8", name: "Ethan Nguyen",   department: "Sales",       title: "Sales Manager",      color: "#2563eb" },
];

/**
 * Seed definitions. `start` is a calendar-day offset from today (snapped
 * forward to the next weekday) and `days` is the number of working days.
 * `submitted` is a calendar-day offset (negative = in the past).
 */
const SEED_REQUESTS = [
  // --- Currently on leave (today) ---
  { emp: "emp-3", type: "annual",   start: 0,    days: 3, status: "Approved", submitted: -14, reason: "Family trip to the coast.", comment: "Enjoy your break!" },
  { emp: "emp-6", type: "sick",     start: 0,    days: 1, status: "Approved", submitted: -1,  reason: "Flu symptoms, doctor advised rest.", comment: "Get well soon." },

  // --- Pending (future) ---
  { emp: "emp-1", type: "annual",   start: 14,   days: 5, status: "Pending",  submitted: -2,  reason: "Holiday abroad booked with family." },
  { emp: "emp-2", type: "annual",   start: 15,   days: 3, status: "Pending",  submitted: -1,  reason: "Attending a friend's wedding." },
  { emp: "emp-4", type: "personal", start: 7,    days: 1, status: "Pending",  submitted: -3,  reason: "Moving to a new apartment." },
  { emp: "emp-7", type: "annual",   start: 28,   days: 4, status: "Pending",  submitted: 0,   reason: "Design conference + a few rest days." },
  { emp: "emp-5", type: "unpaid",   start: 40,   days: 2, status: "Pending",  submitted: -4,  reason: "Extended personal travel." },
  { emp: "emp-8", type: "parental", start: 21,   days: 10, status: "Pending", submitted: -6,  reason: "Welcoming our second child." },

  // --- Future approved ---
  { emp: "emp-1", type: "personal", start: 4,    days: 1, status: "Approved", submitted: -10, reason: "Personal appointment.", comment: "Approved." },
  { emp: "emp-5", type: "annual",   start: 10,   days: 2, status: "Approved", submitted: -12, reason: "Long weekend getaway.", comment: "" },

  // --- Past approved ---
  { emp: "emp-1", type: "annual",   start: -60,  days: 5, status: "Approved", submitted: -80, reason: "Summer vacation.", comment: "Have fun!" },
  { emp: "emp-1", type: "sick",     start: -30,  days: 2, status: "Approved", submitted: -30, reason: "Migraine.", comment: "" },
  { emp: "emp-2", type: "sick",     start: -20,  days: 1, status: "Approved", submitted: -20, reason: "Dental surgery recovery.", comment: "" },
  { emp: "emp-3", type: "sick",     start: -45,  days: 3, status: "Approved", submitted: -45, reason: "Recovering from a cold.", comment: "" },
  { emp: "emp-4", type: "annual",   start: -75,  days: 8, status: "Approved", submitted: -100, reason: "Annual trip to visit family overseas.", comment: "Approved — coverage arranged with Ethan." },
  { emp: "emp-6", type: "annual",   start: -40,  days: 4, status: "Approved", submitted: -55, reason: "Short holiday.", comment: "" },
  { emp: "emp-7", type: "bereavement", start: -25, days: 3, status: "Approved", submitted: -26, reason: "Family bereavement.", comment: "Our condolences. Take the time you need." },
  { emp: "emp-8", type: "annual",   start: -15,  days: 2, status: "Approved", submitted: -30, reason: "Long weekend.", comment: "" },

  // --- Rejected ---
  { emp: "emp-2", type: "annual",   start: -10,  days: 5, status: "Rejected", submitted: -25, reason: "Ski trip.", comment: "Conflicts with the release window. Please choose other dates." },
  { emp: "emp-4", type: "unpaid",   start: -5,   days: 3, status: "Rejected", submitted: -18, reason: "Personal project.", comment: "End-of-quarter sales push — not possible this time." },
  { emp: "emp-6", type: "personal", start: 20,   days: 2, status: "Rejected", submitted: -5,  reason: "Personal errands.", comment: "Month-end close. Could you move this a week later?" },

  // --- Cancelled ---
  { emp: "emp-3", type: "personal", start: -35,  days: 1, status: "Cancelled", submitted: -40, reason: "Appointment (rescheduled)." },
  { emp: "emp-7", type: "annual",   start: 35,   days: 2, status: "Cancelled", submitted: -8,  reason: "Plans changed." },
];

/** Build concrete leave requests from the seed definitions. */
function buildSampleRequests() {
  const base = Utils.today();
  return SEED_REQUESTS.map((s, i) => {
    const start = Utils.nextWeekday(Utils.addDays(base, s.start));
    const end = Utils.addWorkingDays(start, s.days);
    const submittedAt = Utils.addDays(base, s.submitted);
    submittedAt.setHours(9 + (i % 8), (i * 7) % 60);

    const req = {
      id: `req-${String(i + 1).padStart(3, "0")}`,
      employeeId: s.emp,
      type: s.type,
      startDate: Utils.toISODate(start),
      endDate: Utils.toISODate(end),
      days: s.days,
      halfDay: false,
      reason: s.reason,
      status: s.status,
      submittedAt: submittedAt.toISOString(),
      decidedAt: null,
      managerComment: s.comment || "",
    };

    if (s.status === "Approved" || s.status === "Rejected" || s.status === "Cancelled") {
      const decided = new Date(submittedAt);
      decided.setDate(decided.getDate() + 1);
      // never later than now
      req.decidedAt = (decided > new Date() ? new Date() : decided).toISOString();
    }
    return req;
  });
}
