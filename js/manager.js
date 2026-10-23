/* ==========================================================
   Manager dashboard: statistics, filters, approve / reject
   ========================================================== */
const ManagerView = (() => {
  const $ = (id) => document.getElementById(id);
  const filters = { status: "Pending", search: "", type: "all", sort: "submitted-desc" };
  let activeRequestId = null;

  function init() {
    $("typeFilter").innerHTML = `<option value="all">All leave types</option>` +
      LEAVE_TYPES.map((t) => `<option value="${t.id}">${t.icon} ${t.name}</option>`).join("");

    $("statusTabs").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      filters.status = chip.dataset.status;
      renderTable();
    });
    $("managerSearch").addEventListener("input", (e) => { filters.search = e.target.value.trim().toLowerCase(); renderTable(); });
    $("typeFilter").addEventListener("change", (e) => { filters.type = e.target.value; renderTable(); });
    $("sortOrder").addEventListener("change", (e) => { filters.sort = e.target.value; renderTable(); });

    $("requestsBody").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === "review") openModal(id);
      else if (action === "approve") quickDecide(id, "Approved");
      else if (action === "reject") openModal(id, true);
    });

    $("modalCancel").addEventListener("click", closeModal);
    $("modalApprove").addEventListener("click", () => decideFromModal("Approved"));
    $("modalReject").addEventListener("click", () => decideFromModal("Rejected"));
    $("decisionModal").addEventListener("click", (e) => { if (e.target.id === "decisionModal") closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("decisionModal").hidden) closeModal(); });
  }

  function render() {
    renderStats();
    renderCharts();
    renderOnLeaveToday();
    renderTable();
  }

  /* ---------- Statistics ---------- */
  function renderStats() {
    const reqs = Store.getRequests();
    const count = (s) => reqs.filter((r) => r.status === s).length;
    const approved = count("Approved");
    const rejected = count("Rejected");
    const decided = approved + rejected;
    const rate = decided ? Math.round((approved / decided) * 100) : 0;
    const year = Utils.today().getFullYear();
    const daysApproved = reqs
      .filter((r) => r.status === "Approved" && Utils.parseISODate(r.startDate).getFullYear() === year)
      .reduce((a, r) => a + r.days, 0);
    const todayISO = Utils.toISODate(Utils.today());
    const upcoming = reqs.filter((r) => r.status === "Approved" && r.startDate > todayISO).length;

    const cards = [
      { icon: "📋", label: "Total requests", value: reqs.length, bg: "var(--primary-50)" },
      { icon: "⏳", label: "Pending approval", value: count("Pending"), bg: "var(--warning-50)" },
      { icon: "✅", label: "Approved", value: approved, bg: "var(--success-50)" },
      { icon: "❌", label: "Rejected", value: rejected, bg: "var(--danger-50)" },
      { icon: "📈", label: "Approval rate", value: `${rate}%`, bg: "var(--primary-50)" },
      { icon: "🗓️", label: `Days approved (${year})`, value: daysApproved, bg: "var(--neutral-50)" },
      { icon: "✈️", label: "Upcoming approved", value: upcoming, bg: "var(--neutral-50)" },
    ];
    $("statsGrid").innerHTML = cards.map((c) => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${c.bg}">${c.icon}</div>
        <div><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div></div>
      </div>`).join("");

    // Counts on status chips
    document.querySelectorAll("[data-count]").forEach((el) => {
      const s = el.dataset.count;
      el.textContent = s === "all" ? reqs.length : count(s);
    });
  }

  function renderCharts() {
    const reqs = Store.getRequests();

    const byType = LEAVE_TYPES.map((t) => ({
      label: t.name.replace(" Leave", ""),
      color: t.color,
      value: reqs.filter((r) => r.type === t.id && r.status === "Approved").reduce((a, r) => a + r.days, 0),
    }));
    $("chartByType").innerHTML = barChart(byType);

    const palette = ["#4f46e5", "#0891b2", "#db2777", "#16a34a", "#9333ea", "#ea580c", "#0d9488"];
    const depts = [...new Set(Store.getEmployees().map((e) => e.department))].sort();
    const byDept = depts.map((d, i) => ({
      label: d,
      color: palette[i % palette.length],
      value: reqs.filter((r) => Store.getEmployee(r.employeeId)?.department === d).length,
    }));
    $("chartByDept").innerHTML = barChart(byDept);
  }

  function barChart(rows) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r) => `
      <div class="bar-row" title="${Utils.escapeHtml(r.label)}: ${r.value}">
        <span>${Utils.escapeHtml(r.label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(r.value / max) * 100}%;background:${r.color}"></div></div>
        <span class="bar-value">${r.value}</span>
      </div>`).join("");
  }

  function renderOnLeaveToday() {
    const todayISO = Utils.toISODate(Utils.today());
    const out = Store.getRequests().filter(
      (r) => r.status === "Approved" && r.startDate <= todayISO && r.endDate >= todayISO
    );
    if (!out.length) {
      $("onLeaveToday").innerHTML = `<div class="empty"><span class="icon">🎉</span>Everyone is in today.</div>`;
      return;
    }
    $("onLeaveToday").innerHTML = out.map((r) => {
      const emp = Store.getEmployee(r.employeeId);
      const type = Store.getLeaveType(r.type);
      return `
        <div class="on-leave-item">
          <span class="avatar" style="background:${emp.color}">${Utils.initials(emp.name)}</span>
          <div>${Utils.escapeHtml(emp.name)}
            <small>${type.icon} ${type.name} · back after ${Utils.formatDate(r.endDate, { day: "numeric", month: "short" })}</small>
          </div>
        </div>`;
    }).join("");
  }

  /* ---------- Requests table ---------- */
  function filteredRequests() {
    const list = Store.getRequests().filter((r) => {
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.type !== "all" && r.type !== filters.type) return false;
      if (filters.search) {
        const emp = Store.getEmployee(r.employeeId);
        const hay = `${emp?.name} ${emp?.department} ${r.reason}`.toLowerCase();
        if (!hay.includes(filters.search)) return false;
      }
      return true;
    });
    const [field, dir] = filters.sort.split("-");
    const key = field === "start" ? "startDate" : "submittedAt";
    list.sort((a, b) => (dir === "asc" ? 1 : -1) * a[key].localeCompare(b[key]));
    return list;
  }

  function renderTable() {
    document.querySelectorAll("#statusTabs .chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.status === filters.status)
    );

    const list = filteredRequests();
    $("resultCount").textContent = `Showing ${list.length} request${list.length === 1 ? "" : "s"}`;

    if (!list.length) {
      $("requestsBody").innerHTML = `<tr><td colspan="7"><div class="empty"><span class="icon">🔍</span>No requests match the current filters.</div></td></tr>`;
      return;
    }

    $("requestsBody").innerHTML = list.map((r) => {
      const emp = Store.getEmployee(r.employeeId);
      const type = Store.getLeaveType(r.type);
      const conflicts = r.status === "Pending" ? Store.teamConflicts(r) : [];
      const actions = r.status === "Pending"
        ? `<button class="btn btn-outline-success btn-sm" data-action="approve" data-id="${r.id}" title="Approve">✓ Approve</button>
           <button class="btn btn-outline-danger btn-sm" data-action="reject" data-id="${r.id}" title="Reject">✕ Reject</button>
           <button class="btn btn-ghost btn-sm" data-action="review" data-id="${r.id}">Review</button>`
        : `<span class="muted small">${r.decidedAt ? Utils.formatDate(r.decidedAt.slice(0, 10)) : "—"}</span>`;
      return `
        <tr>
          <td><div class="emp-cell">
            <span class="avatar" style="background:${emp.color}">${Utils.initials(emp.name)}</span>
            <div>${Utils.escapeHtml(emp.name)}<small>${Utils.escapeHtml(emp.department)}</small></div>
          </div></td>
          <td><span class="type-pill" style="--pill:${type.color}">${type.icon} ${type.name}</span></td>
          <td>${Utils.formatRange(r.startDate, r.endDate)}
            ${conflicts.length ? `<span class="conflict" title="${conflicts.map((c) => Utils.escapeHtml(Store.getEmployee(c.employeeId).name)).join(", ")}">⚠ Overlaps ${conflicts.length} teammate${conflicts.length > 1 ? "s" : ""}</span>` : ""}
          </td>
          <td>${r.days}${r.halfDay ? " (½)" : ""}</td>
          <td class="reason-cell">${Utils.escapeHtml(r.reason)}${r.managerComment ? `<br><small>💬 ${Utils.escapeHtml(r.managerComment)}</small>` : ""}</td>
          <td><span class="badge badge-${r.status}">${r.status}</span></td>
          <td><div class="actions-cell">${actions}</div></td>
        </tr>`;
    }).join("");
  }

  /* ---------- Decisions ---------- */
  function quickDecide(id, status) {
    try {
      const req = Store.decide(id, status);
      const emp = Store.getEmployee(req.employeeId);
      Utils.toast(`${status} ${emp.name}'s leave request.`, "success");
      App.refresh();
    } catch (err) {
      Utils.toast(err.message, "error");
    }
  }

  function openModal(id, focusReject = false) {
    const r = Store.getRequest(id);
    if (!r) return;
    activeRequestId = id;
    const emp = Store.getEmployee(r.employeeId);
    const type = Store.getLeaveType(r.type);
    const bal = Store.getBalances(r.employeeId, Utils.parseISODate(r.startDate).getFullYear()).find((b) => b.type.id === r.type);
    const conflicts = Store.teamConflicts(r);

    $("modalTitle").textContent = focusReject ? "Reject leave request" : "Review leave request";
    $("modalBody").innerHTML = `
      <dl>
        <dt>Employee</dt><dd>${Utils.escapeHtml(emp.name)} (${Utils.escapeHtml(emp.department)})</dd>
        <dt>Leave type</dt><dd>${type.icon} ${type.name}</dd>
        <dt>Dates</dt><dd>${Utils.formatRange(r.startDate, r.endDate)}</dd>
        <dt>Working days</dt><dd>${Utils.formatDays(r.days)}</dd>
        <dt>Balance</dt><dd>${bal.type.allowance == null ? "No limit" : `${bal.used} used, ${bal.pending} pending of ${bal.type.allowance}`}</dd>
        <dt>Reason</dt><dd>${Utils.escapeHtml(r.reason)}</dd>
        <dt>Team overlap</dt><dd>${conflicts.length
          ? "⚠ " + conflicts.map((c) => `${Utils.escapeHtml(Store.getEmployee(c.employeeId).name)} (${c.status.toLowerCase()})`).join(", ")
          : "None"}</dd>
      </dl>`;
    $("managerComment").value = "";
    $("modalError").textContent = "";
    $("modalApprove").hidden = focusReject;
    $("decisionModal").hidden = false;
    $("managerComment").focus();
  }

  function closeModal() {
    $("decisionModal").hidden = true;
    activeRequestId = null;
  }

  function decideFromModal(status) {
    try {
      const req = Store.decide(activeRequestId, status, $("managerComment").value);
      const emp = Store.getEmployee(req.employeeId);
      closeModal();
      Utils.toast(`${status} ${emp.name}'s leave request.`, status === "Approved" ? "success" : "info");
      App.refresh();
    } catch (err) {
      $("modalError").textContent = err.message;
    }
  }

  return { init, render };
})();
