/* ==========================================================
   Employee view: balances, request form, history
   ========================================================== */
const EmployeeView = (() => {
  let currentId = null;
  const $ = (id) => document.getElementById(id);

  function init() {
    const employees = Store.getEmployees();
    const saved = Store.getSettings().currentEmployeeId;
    currentId = employees.some((e) => e.id === saved) ? saved : employees[0].id;

    $("employeeSelect").innerHTML = employees
      .map((e) => `<option value="${e.id}">${Utils.escapeHtml(e.name)} — ${Utils.escapeHtml(e.department)}</option>`)
      .join("");
    $("employeeSelect").value = currentId;

    $("leaveType").innerHTML = LEAVE_TYPES
      .map((t) => `<option value="${t.id}">${t.icon} ${t.name}${t.allowance == null ? " (no limit)" : ""}</option>`)
      .join("");

    $("employeeSelect").addEventListener("change", (e) => {
      currentId = e.target.value;
      Store.setSetting("currentEmployeeId", currentId);
      resetForm();
      render();
    });

    ["leaveType", "startDate", "endDate", "halfDay"].forEach((id) =>
      $(id).addEventListener("change", onFormChange)
    );
    $("startDate").addEventListener("change", () => {
      // Convenience: default end date to start date.
      if (!$("endDate").value || $("endDate").value < $("startDate").value) {
        $("endDate").value = $("startDate").value;
      }
      $("endDate").min = $("startDate").value;
      onFormChange();
    });
    $("reason").addEventListener("input", () => {
      $("reasonCount").textContent = $("reason").value.length;
      $("formError").textContent = "";
    });

    $("leaveForm").addEventListener("submit", onSubmit);
    $("leaveForm").addEventListener("reset", () => setTimeout(resetForm, 0));
    $("historyFilter").addEventListener("change", renderHistory);
    $("historyList").addEventListener("click", onHistoryClick);

    resetForm();
  }

  function resetForm() {
    const todayISO = Utils.toISODate(Utils.today());
    $("leaveForm").reset();
    $("startDate").min = todayISO;
    $("endDate").min = todayISO;
    $("reasonCount").textContent = "0";
    $("formError").textContent = "";
    $("daySummary").className = "day-summary";
    $("daySummary").textContent = "Select dates to calculate working days.";
  }

  function onFormChange() {
    $("formError").textContent = "";
    const type = $("leaveType").value;
    // Sick and bereavement leave can be logged for past dates.
    const retro = type === "sick" || type === "bereavement";
    const minDate = retro ? "" : Utils.toISODate(Utils.today());
    $("startDate").min = minDate;
    $("endDate").min = $("startDate").value || minDate;

    const start = $("startDate").value;
    const end = $("endDate").value;
    const summary = $("daySummary");
    if (!start || !end) {
      summary.className = "day-summary";
      summary.textContent = "Select dates to calculate working days.";
      return;
    }
    if (end < start) {
      summary.className = "day-summary warn";
      summary.textContent = "End date is before the start date.";
      return;
    }
    const halfDay = $("halfDay").checked;
    const days = Store.calcDays(start, end, halfDay);
    const bal = Store.getBalances(currentId, Utils.parseISODate(start).getFullYear()).find((b) => b.type.id === type);
    let text = `📅 ${Utils.formatDays(days)} of ${bal.type.name.toLowerCase()} (weekends excluded).`;
    let warn = days === 0;
    if (bal.available != null) {
      text += ` Available: ${Utils.formatDays(bal.available)}.`;
      if (days > bal.available) warn = true;
    }
    if (halfDay && start !== end) {
      text = "Half day requests must be for a single date.";
      warn = true;
    }
    summary.className = `day-summary${warn ? " warn" : ""}`;
    summary.textContent = text;
  }

  function onSubmit(e) {
    e.preventDefault();
    const input = {
      employeeId: currentId,
      type: $("leaveType").value,
      startDate: $("startDate").value,
      endDate: $("endDate").value,
      halfDay: $("halfDay").checked,
      reason: $("reason").value,
    };
    try {
      const req = Store.addRequest(input);
      Utils.toast(`Request submitted: ${Utils.formatDays(req.days)} of ${Store.getLeaveType(req.type).name}.`, "success");
      resetForm();
      App.refresh();
    } catch (err) {
      $("formError").textContent = err.message;
    }
  }

  function onHistoryClick(e) {
    const btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    if (!confirm("Cancel this pending leave request?")) return;
    try {
      Store.cancel(btn.dataset.cancel, currentId);
      Utils.toast("Leave request cancelled.");
      App.refresh();
    } catch (err) {
      Utils.toast(err.message, "error");
    }
  }

  /* ---------- Rendering ---------- */
  function render() {
    const emp = Store.getEmployee(currentId);
    const avatar = $("currentAvatar");
    avatar.textContent = Utils.initials(emp.name);
    avatar.style.background = emp.color;
    $("currentMeta").textContent = `${emp.title} · ${emp.department}`;

    const year = Utils.today().getFullYear();
    const mine = Store.requestsFor(currentId);
    $("qsPending").textContent = mine.filter((r) => r.status === "Pending").length;
    $("qsApproved").textContent = mine.filter((r) => r.status === "Approved").length;
    const daysUsed = mine
      .filter((r) => r.status === "Approved" && Utils.parseISODate(r.startDate).getFullYear() === year)
      .reduce((a, r) => a + r.days, 0);
    $("qsDaysTaken").textContent = daysUsed;

    renderBalances(year);
    renderHistory();
    onFormChange();
  }

  function renderBalances(year) {
    $("balanceYear").textContent = `(${year})`;
    $("balanceGrid").innerHTML = Store.getBalances(currentId, year).map(({ type, used, pending, available }) => {
      const limited = type.allowance != null;
      const pct = limited ? Math.min(100, ((used + pending) / type.allowance) * 100) : 0;
      return `
        <div class="balance-card" style="--accent:${type.color}">
          <div class="label"><span>${type.icon}</span>${type.name}</div>
          <div class="value">${limited ? available : "∞"} <small>${limited ? `of ${type.allowance} days left` : "no limit"}</small></div>
          ${limited ? `<div class="progress" aria-label="${type.name} usage"><span style="width:${pct}%"></span></div>` : ""}
          <div class="foot"><span>Used: ${used}</span><span>Pending: ${pending}</span></div>
        </div>`;
    }).join("");
  }

  function renderHistory() {
    const filter = $("historyFilter").value;
    const list = Store.requestsFor(currentId)
      .filter((r) => filter === "all" || r.status === filter)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    if (!list.length) {
      $("historyList").innerHTML = `<div class="empty"><span class="icon">📭</span>No ${filter === "all" ? "" : filter.toLowerCase() + " "}leave requests yet.</div>`;
      return;
    }

    $("historyList").innerHTML = list.map((r) => {
      const type = Store.getLeaveType(r.type);
      const decided = r.status !== "Pending";
      const outcomeClass = r.status === "Approved" ? "ok" : (r.status === "Rejected" || r.status === "Cancelled") ? "no" : "";
      return `
        <article class="history-item" style="--pill:${type.color}">
          <div class="history-top">
            <span class="type-pill" style="--pill:${type.color}">${type.icon} ${type.name}</span>
            <span class="badge badge-${r.status}">${r.status}</span>
          </div>
          <p class="history-dates">${Utils.formatRange(r.startDate, r.endDate)} · ${Utils.formatDays(r.days)}${r.halfDay ? " (half day)" : ""}</p>
          <p class="history-reason">${Utils.escapeHtml(r.reason)}</p>
          ${r.managerComment ? `<p class="history-comment">💬 <strong>Manager:</strong> ${Utils.escapeHtml(r.managerComment)}</p>` : ""}
          <div class="timeline" aria-label="Status timeline">
            <span class="step done"><span class="dot"></span>Submitted</span>
            <span class="line done"></span>
            <span class="step done"><span class="dot"></span>Under review</span>
            <span class="line ${decided ? "done" : ""}"></span>
            <span class="step ${decided ? "done " + outcomeClass : ""}"><span class="dot"></span>${decided ? r.status : "Decision"}</span>
          </div>
          <div class="history-foot">
            <span>Submitted ${Utils.formatDateTime(r.submittedAt)}${r.decidedAt ? ` · ${r.status} ${Utils.formatDateTime(r.decidedAt)}` : ""}</span>
            ${r.status === "Pending" ? `<button class="btn btn-ghost btn-sm" data-cancel="${r.id}">Cancel</button>` : ""}
          </div>
        </article>`;
    }).join("");
  }

  return { init, render };
})();
