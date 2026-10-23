/* ==========================================================
   Utility helpers (dates, formatting, DOM, toasts)
   ========================================================== */
const Utils = (() => {
  /** Format a Date as YYYY-MM-DD using local time (avoids UTC shifting). */
  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /** Parse YYYY-MM-DD into a local Date at midnight. */
  function parseISODate(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /** Count working days (Mon-Fri) between two ISO dates, inclusive. */
  function countWorkingDays(startISO, endISO) {
    if (!startISO || !endISO) return 0;
    let cur = parseISODate(startISO);
    const end = parseISODate(endISO);
    if (end < cur) return 0;
    let count = 0;
    while (cur <= end) {
      if (!isWeekend(cur)) count++;
      cur = addDays(cur, 1);
    }
    return count;
  }

  /** Return the nearest weekday on/after the given date. */
  function nextWeekday(date) {
    let d = new Date(date);
    while (isWeekend(d)) d = addDays(d, 1);
    return d;
  }

  /** Add N working days to a date (date itself counts as day 1). */
  function addWorkingDays(start, n) {
    let d = nextWeekday(start);
    let remaining = n - 1;
    while (remaining > 0) {
      d = addDays(d, 1);
      if (!isWeekend(d)) remaining--;
    }
    return d;
  }

  function formatDate(iso, opts = { day: "numeric", month: "short", year: "numeric" }) {
    return parseISODate(iso).toLocaleDateString(undefined, opts);
  }

  function formatRange(startISO, endISO) {
    if (startISO === endISO) return formatDate(startISO);
    const s = parseISODate(startISO);
    const e = parseISODate(endISO);
    const sameYear = s.getFullYear() === e.getFullYear();
    const startStr = s.toLocaleDateString(undefined, sameYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" });
    return `${startStr} – ${formatDate(endISO)}`;
  }

  function formatDateTime(isoString) {
    return new Date(isoString).toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && bStart <= aEnd; // ISO strings compare lexicographically
  }

  /** Escape user-provided text before inserting into HTML. */
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  }

  function uid(prefix = "id") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function formatDays(n) {
    const v = Number.isInteger(n) ? n : n.toFixed(1);
    return `${v} day${n === 1 ? "" : "s"}`;
  }

  function toast(message, type = "info", timeout = 3200) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add("hide");
      setTimeout(() => el.remove(), 300);
    }, timeout);
  }

  return {
    toISODate, parseISODate, today, addDays, isWeekend, countWorkingDays,
    nextWeekday, addWorkingDays, formatDate, formatRange, formatDateTime,
    rangesOverlap, escapeHtml, initials, uid, formatDays, toast,
  };
})();
