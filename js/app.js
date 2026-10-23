/* =========================================================================
 * app.js — UI controller for LeaveFlow (Employee Portal + Manager Dashboard)
 * ========================================================================= */
(function (global) {
  'use strict';

  const { LEAVE_TYPES, STATUSES, MANAGER } = global.LeaveData;
  const U = global.LeaveUtils;
  const Store = global.LeaveStorage;

  const STATUS_COLORS = {
    Pending: 'var(--warning)',
    Approved: 'var(--success)',
    Rejected: 'var(--danger)',
    Cancelled: 'var(--muted)'
  };
  const SICK_BACKDATE_LIMIT = 30; // sick leave may be logged up to 30 days in the past

  /* ---------------- State ---------------- */
  let state = Store.load();
  const ui = {
    historyFilter: 'All',
    statusFilter: 'Pending',
    search: '',
    typeFilter: 'all',
    deptFilter: 'all',
    sortBy: 'applied-desc',
    modal: null // { requestId, action }
  };

  /* ---------------- DOM helpers ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const esc = U.escapeHtml;

  function persist() {
    if (!Store.save(state)) toast('Could not save to localStorage (storage full or disabled).', 'error');
  }

  function employeeById(id) {
    return state.employees.find((e) => e.id === id) || { id, name: 'Unknown', department: '—', role: '', color: '#64748b' };
  }

  function currentEmployee() {
    return employeeById(state.ui.currentEmployeeId);
  }

  function avatar(emp, size) {
    return `<span class="avatar ${size || ''}" style="background:${esc(emp.color)}" aria-hidden="true">${esc(U.initials(emp.name))}</span>`;
  }

  function statusBadge(status) {
    return `<span class="badge badge-${status.toLowerCase()}">${esc(status)}</span>`;
  }

  function typePill(typeId) {
    const t = U.getLeaveType(typeId);
    return `<span class="type-pill" style="--c:${t.color}">${t.icon} ${esc(t.name)}</span>`;
  }

  function toast(message, kind) {
    const el = document.createElement('div');
    el.className = `toast toast-${kind || 'info'}`;
    el.textContent = message;
    $('#toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  /* =====================================================================
   * Initialisation
   * ===================================================================== */
  function init() {
    // Populate static selects
    $('#employeeSelect').innerHTML = state.employees
      .map((e) => `<option value="${esc(e.id)}">${esc(e.name)} — ${esc(e.department)}</option>`)
      .join('');

    $('#leaveType').innerHTML = LEAVE_TYPES
      .map((t) => `<option value="${t.id}">${t.icon} ${esc(t.name)}${t.allowance == null ? ' (no limit)' : ` (${t.allowance} days/yr)`}</option>`)
      .join('');

    $('#typeFilter').innerHTML = '<option value="all">All leave types</option>' +
      LEAVE_TYPES.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');

    const depts = [...new Set(state.employees.map((e) => e.department))].sort();
    $('#deptFilter').innerHTML = '<option value="all">All departments</option>' +
      depts.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');

    $('#todayLabel').textContent = U.formatDate(U.todayISO(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    bindEvents();
    setFormDefaults();
    applyTheme();
    render();
  }

  function bindEvents() {
    // Role tabs
    document.querySelectorAll('.role-tab').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.ui.view = btn.dataset.view;
        persist();
        render();
      })
    );

    // Employee switcher
    $('#employeeSelect').addEventListener('change', (e) => {
      state.ui.currentEmployeeId = e.target.value;
      ui.historyFilter = 'All';
      persist();
      clearFormError();
      render();
    });

    // Theme + reset
    $('#themeToggle').addEventListener('click', () => {
      state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
      persist();
      applyTheme();
    });
    $('#resetDemo').addEventListener('click', () => {
      if (!confirm('Reset all data to the original sample employees and leave requests? Your changes will be lost.')) return;
      state = Store.reset(state.ui.theme);
      ui.statusFilter = 'Pending';
      ui.historyFilter = 'All';
      setFormDefaults();
      render();
      toast('Demo data has been reset.', 'info');
    });

    // Leave form
    const form = $('#leaveForm');
    ['#leaveType', '#startDate', '#endDate', '#halfDay'].forEach((sel) =>
      $(sel).addEventListener('input', onFormChange)
    );
    $('#startDate').addEventListener('change', () => {
      const s = $('#startDate').value;
      if (s && (!$('#endDate').value || $('#endDate').value < s)) $('#endDate').value = s;
      $('#endDate').min = s || '';
      onFormChange();
    });
    $('#reason').addEventListener('input', () => {
      $('#reasonCount').textContent = $('#reason').value.length;
    });
    form.addEventListener('submit', onSubmitRequest);
    form.addEventListener('reset', () => {
      setTimeout(() => {
        setFormDefaults();
        clearFormError();
      }, 0);
    });

    // Delegated actions (cancel / approve / reject / filters)
    document.addEventListener('click', onDelegatedClick);

    // Manager toolbar
    $('#searchBox').addEventListener('input', (e) => { ui.search = e.target.value.trim().toLowerCase(); renderRequestsTable(); });
    $('#typeFilter').addEventListener('change', (e) => { ui.typeFilter = e.target.value; renderRequestsTable(); });
    $('#deptFilter').addEventListener('change', (e) => { ui.deptFilter = e.target.value; renderRequestsTable(); });
    $('#sortBy').addEventListener('change', (e) => { ui.sortBy = e.target.value; renderRequestsTable(); });

    // Modal
    $('#modalCancel').addEventListener('click', closeModal);
    $('#modalConfirm').addEventListener('click', confirmModal);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    });

    // Keep multiple tabs in sync
    global.addEventListener('storage', (e) => {
      if (e.key === Store.STORAGE_KEY) {
        state = Store.load();
        applyTheme();
        render();
      }
    });
  }

  function onDelegatedClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, value } = btn.dataset;
    switch (action) {
      case 'history-filter':
        ui.historyFilter = value;
        renderHistory();
        break;
      case 'status-filter':
        ui.statusFilter = value;
        renderRequestsTable();
        break;
      case 'cancel':
        cancelRequest(id);
        break;
      case 'approve':
      case 'reject':
        openModal(id, action);
        break;
      case 'stat-filter':
        ui.statusFilter = value;
        renderRequestsTable();
        $('#statusFilters').scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      default:
        break;
    }
  }

  function applyTheme() {
    const dark = state.ui.theme === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    $('#themeToggle').textContent = dark ? '☀️' : '🌙';
  }

  /* =====================================================================
   * Render root
   * ===================================================================== */
  function render() {
    const view = state.ui.view === 'manager' ? 'manager' : 'employee';
    document.querySelectorAll('.role-tab').forEach((b) => {
      const active = b.dataset.view === view;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    $('#view-employee').hidden = view !== 'employee';
    $('#view-manager').hidden = view !== 'manager';

    const pending = state.requests.filter((r) => r.status === 'Pending').length;
    const badge = $('#pendingBadge');
    badge.hidden = pending === 0;
    badge.textContent = pending;

    if (view === 'employee') renderEmployeeView();
    else renderManagerView();
  }

  /* =====================================================================
   * EMPLOYEE VIEW
   * ===================================================================== */
  function renderEmployeeView() {
    const emp = currentEmployee();
    $('#employeeSelect').value = emp.id;
    $('#employeeProfile').innerHTML = `
      ${avatar(emp, 'lg')}
      <div>
        <h2>Hello, ${esc(emp.name.split(' ')[0])} 👋</h2>
        <p>${esc(emp.role)} · ${esc(emp.department)} · <span class="muted">${esc(emp.id)}</span></p>
        <p class="muted small">Reports to ${esc(MANAGER.name)} (${esc(MANAGER.role)})</p>
      </div>`;
    renderBalances();
    renderStatusTrack();
    renderUpcoming();
    renderHolidays();
    renderHistory();
    onFormChange();
  }

  function renderBalances() {
    const emp = currentEmployee();
    const year = new Date().getFullYear();
    $('#balanceYear').textContent = `· ${year}`;
    $('#balanceGrid').innerHTML = LEAVE_TYPES.map((t) => {
      const b = U.getBalance(state.requests, emp.id, t.id, year);
      const unlimited = b.allowance == null;
      const usedPct = unlimited ? 0 : Math.min(100, (b.used / b.allowance) * 100);
      const pendPct = unlimited ? 0 : Math.min(100 - usedPct, (b.pending / b.allowance) * 100);
      return `
        <article class="balance-card" style="--c:${t.color}">
          <header><span class="balance-icon">${t.icon}</span><h3>${esc(t.name)}</h3></header>
          <p class="balance-big">${unlimited ? '∞' : U.fmtDays(b.available)}<small>${unlimited ? ' unlimited' : ` / ${b.allowance} days available`}</small></p>
          <div class="progress" role="img" aria-label="${U.fmtDays(b.used)} used, ${U.fmtDays(b.pending)} pending">
            <span class="progress-used" style="width:${usedPct}%"></span>
            <span class="progress-pending" style="width:${pendPct}%"></span>
          </div>
          <footer><span>✔ ${U.fmtDays(b.used)} used</span><span>⏳ ${U.fmtDays(b.pending)} pending</span></footer>
        </article>`;
    }).join('');
  }

  function myRequests() {
    const id = state.ui.currentEmployeeId;
    return state.requests.filter((r) => r.employeeId === id);
  }

  function renderStatusTrack() {
    const mine = myRequests();
    const counts = Object.fromEntries(STATUSES.map((s) => [s, mine.filter((r) => r.status === s).length]));
    const latest = [...mine].sort((a, b) => (b.appliedOn + b.id).localeCompare(a.appliedOn + a.id))[0];

    let stepper = '<p class="muted">No leave requests yet — submit your first one!</p>';
    if (latest) {
      const decided = latest.status !== 'Pending';
      const finalLabel = latest.status === 'Pending' ? 'Decision' : latest.status;
      const finalCls = latest.status === 'Approved' ? 'done ok' : latest.status === 'Pending' ? '' : 'done bad';
      stepper = `
        <div class="latest">
          <p class="small muted">Latest request · ${esc(latest.id)}</p>
          <p><strong>${esc(U.getLeaveType(latest.type).name)}</strong> · ${U.formatRange(latest.startDate, latest.endDate)} (${U.fmtDays(latest.days)} day${latest.days === 1 ? '' : 's'})</p>
          <ol class="stepper">
            <li class="done"><span>1</span>Submitted<small>${U.formatDate(latest.appliedOn)}</small></li>
            <li class="${decided ? 'done' : 'current'}"><span>2</span>Manager review<small>${decided ? 'Completed' : 'In progress'}</small></li>
            <li class="${finalCls}"><span>3</span>${esc(finalLabel)}<small>${latest.reviewedOn ? U.formatDate(latest.reviewedOn) : latest.cancelledOn ? U.formatDate(latest.cancelledOn) : 'Awaiting'}</small></li>
          </ol>
          ${latest.managerComment ? `<p class="note">💬 “${esc(latest.managerComment)}” — ${esc(latest.reviewedBy || MANAGER.name)}</p>` : ''}
        </div>`;
    }

    $('#statusTrack').innerHTML = `
      <div class="status-counts">
        ${STATUSES.map((s) => `
          <button class="status-count" data-action="history-filter" data-value="${s}" style="--c:${STATUS_COLORS[s]}">
            <strong>${counts[s]}</strong><span>${s}</span>
          </button>`).join('')}
      </div>
      ${stepper}`;
  }

  function renderUpcoming() {
    const today = U.todayISO();
    const list = myRequests()
      .filter((r) => r.status === 'Approved' && r.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    $('#upcomingList').innerHTML = list.length
      ? list.map((r) => {
          const inProgress = r.startDate <= today;
          const label = inProgress ? 'On leave now' : `in ${U.diffDays(today, r.startDate)} day(s)`;
          return `<li>${typePill(r.type)}<span>${U.formatRange(r.startDate, r.endDate)}</span><span class="muted small">${label}</span></li>`;
        }).join('')
      : '<li class="empty">No upcoming approved leave.</li>';
  }

  function renderHolidays() {
    const today = U.todayISO();
    const y = new Date().getFullYear();
    const list = [...U.holidaysForYear(y), ...U.holidaysForYear(y + 1)].filter((h) => h.date >= today).slice(0, 4);
    $('#holidayList').innerHTML = list
      .map((h) => `<li><span>🎉 ${esc(h.name)}</span><span class="muted small">${U.formatDate(h.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></li>`)
      .join('');
  }

  function renderHistory() {
    const filters = ['All', ...STATUSES];
    const mine = myRequests();
    $('#historyFilters').innerHTML = filters.map((f) => {
      const n = f === 'All' ? mine.length : mine.filter((r) => r.status === f).length;
      return `<button class="chip ${ui.historyFilter === f ? 'active' : ''}" data-action="history-filter" data-value="${f}" aria-pressed="${ui.historyFilter === f}">${f} <span>${n}</span></button>`;
    }).join('');

    const today = U.todayISO();
    const rows = mine
      .filter((r) => ui.historyFilter === 'All' || r.status === ui.historyFilter)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    $('#historyBody').innerHTML = rows.length
      ? rows.map((r) => {
          const canCancel = r.status === 'Pending' || (r.status === 'Approved' && r.startDate > today);
          return `
          <tr>
            <td data-label="Type">${typePill(r.type)}</td>
            <td data-label="Dates">${U.formatRange(r.startDate, r.endDate)}${r.halfDay ? ' <span class="muted small">(half day)</span>' : ''}</td>
            <td data-label="Days"><strong>${U.fmtDays(r.days)}</strong></td>
            <td data-label="Reason" class="reason">${esc(r.reason)}</td>
            <td data-label="Applied">${U.formatDate(r.appliedOn)}</td>
            <td data-label="Status">${statusBadge(r.status)}</td>
            <td data-label="Manager note" class="reason">${r.managerComment ? esc(r.managerComment) : '<span class="muted">—</span>'}</td>
            <td data-label="">${canCancel ? `<button class="btn btn-ghost btn-sm" data-action="cancel" data-id="${esc(r.id)}">${r.status === 'Approved' ? 'Withdraw' : 'Cancel'}</button>` : ''}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="8" class="empty">No ${ui.historyFilter === 'All' ? '' : ui.historyFilter.toLowerCase() + ' '}requests found.</td></tr>`;
  }

  /* ---------------- Leave request form ---------------- */
  function setFormDefaults() {
    const start = U.nextWorkingDay(U.addDays(U.todayISO(), 1));
    $('#leaveType').value = 'annual';
    $('#startDate').value = start;
    $('#endDate').value = start;
    $('#endDate').min = start;
    $('#halfDay').checked = false;
    $('#reason').value = '';
    $('#reasonCount').textContent = '0';
    onFormChange();
  }

  function readForm() {
    return {
      type: $('#leaveType').value,
      startDate: $('#startDate').value,
      endDate: $('#endDate').value,
      halfDay: $('#halfDay').checked,
      reason: $('#reason').value.trim()
    };
  }

  function onFormChange() {
    const f = readForm();
    const single = f.startDate && f.startDate === f.endDate;
    const halfBox = $('#halfDay');
    halfBox.disabled = !single;
    if (!single) halfBox.checked = false;

    const summary = $('#requestSummary');
    if (!f.startDate || !f.endDate) {
      summary.className = 'request-summary';
      summary.textContent = 'Select dates to see how many working days will be deducted.';
      return;
    }
    if (f.endDate < f.startDate) {
      summary.className = 'request-summary warn';
      summary.textContent = 'End date must be on or after the start date.';
      return;
    }
    const days = U.countWorkingDays(f.startDate, f.endDate, halfBox.checked);
    const bal = U.getBalance(state.requests, state.ui.currentEmployeeId, f.type, U.parseISO(f.startDate).getFullYear());
    const calDays = U.diffDays(f.startDate, f.endDate) + 1;
    const excluded = calDays - Math.ceil(days);
    const over = bal.available !== Infinity && days > bal.available;
    summary.className = `request-summary ${over || days === 0 ? 'warn' : 'ok'}`;
    summary.innerHTML = days === 0
      ? 'The selected range contains only weekends/public holidays — no working days.'
      : `<strong>${U.fmtDays(days)}</strong> working day${days === 1 ? '' : 's'} requested` +
        (excluded > 0 ? ` <span class="muted">(${excluded} weekend/holiday day${excluded === 1 ? '' : 's'} excluded)</span>` : '') +
        ` · Available ${bal.type.name.toLowerCase()}: <strong>${U.fmtDays(bal.available)}</strong>` +
        (over ? ' — <strong>exceeds your balance</strong>' : '');
  }

  function showFormError(msg) {
    const el = $('#formError');
    el.textContent = msg;
    el.hidden = false;
  }
  function clearFormError() {
    $('#formError').hidden = true;
  }

  function validateRequest(f, employeeId) {
    const today = U.todayISO();
    if (!f.type) return 'Please choose a leave type.';
    if (!f.startDate || !f.endDate) return 'Please select both a start date and an end date.';
    if (f.endDate < f.startDate) return 'End date must be on or after the start date.';
    if (f.type === 'sick') {
      if (U.diffDays(f.startDate, today) > SICK_BACKDATE_LIMIT) return `Sick leave can be back-dated by at most ${SICK_BACKDATE_LIMIT} days.`;
    } else if (f.startDate < today) {
      return 'Start date cannot be in the past (only sick leave can be back-dated).';
    }
    if (U.diffDays(f.startDate, f.endDate) > 120) return 'A single request cannot span more than 120 calendar days.';
    if (f.halfDay && f.startDate !== f.endDate) return 'Half-day leave is only allowed for a single day.';
    const days = U.countWorkingDays(f.startDate, f.endDate, f.halfDay);
    if (days === 0) return 'The selected dates contain no working days (weekends/holidays only).';
    if (f.reason.length < 5) return 'Please provide a reason (at least 5 characters).';

    const clash = state.requests.find((r) => r.employeeId === employeeId &&
      (r.status === 'Pending' || r.status === 'Approved') &&
      U.rangesOverlap(f.startDate, f.endDate, r.startDate, r.endDate));
    if (clash) return `These dates overlap with your ${clash.status.toLowerCase()} request ${clash.id} (${U.formatRange(clash.startDate, clash.endDate)}).`;

    const bal = U.getBalance(state.requests, employeeId, f.type, U.parseISO(f.startDate).getFullYear());
    if (bal.available !== Infinity && days > bal.available) {
      return `Insufficient ${bal.type.name.toLowerCase()} balance: requesting ${U.fmtDays(days)} day(s) but only ${U.fmtDays(bal.available)} available (including pending requests).`;
    }
    return null;
  }

  function onSubmitRequest(e) {
    e.preventDefault();
    const f = readForm();
    const empId = state.ui.currentEmployeeId;
    const error = validateRequest(f, empId);
    if (error) {
      showFormError(error);
      return;
    }
    clearFormError();
    const req = {
      id: U.uid('LR'),
      employeeId: empId,
      type: f.type,
      startDate: f.startDate,
      endDate: f.endDate,
      halfDay: f.halfDay,
      days: U.countWorkingDays(f.startDate, f.endDate, f.halfDay),
      reason: f.reason,
      status: 'Pending',
      appliedOn: U.todayISO(),
      reviewedOn: null,
      reviewedBy: null,
      managerComment: '',
      cancelledOn: null
    };
    state.requests.push(req);
    persist();
    $('#leaveForm').reset();
    ui.historyFilter = 'All';
    render();
    toast(`Request submitted for ${U.fmtDays(req.days)} day(s). Awaiting manager approval.`, 'success');
  }

  function cancelRequest(id) {
    const r = state.requests.find((x) => x.id === id);
    if (!r) return;
    const verb = r.status === 'Approved' ? 'withdraw this approved' : 'cancel this pending';
    if (!confirm(`Are you sure you want to ${verb} request (${U.formatRange(r.startDate, r.endDate)})?`)) return;
    r.status = 'Cancelled';
    r.cancelledOn = U.todayISO();
    persist();
    render();
    toast('Request cancelled.', 'info');
  }

  /* =====================================================================
   * MANAGER VIEW
   * ===================================================================== */
  function renderManagerView() {
    renderStats();
    renderCharts();
    renderWhosOut();
    renderTeamBalances();
    renderRequestsTable();
  }

  function renderStats() {
    const reqs = state.requests;
    const today = U.todayISO();
    const year = new Date().getFullYear();
    const count = (s) => reqs.filter((r) => r.status === s).length;
    const approved = count('Approved');
    const rejected = count('Rejected');
    const decided = approved + rejected;
    const approvedDays = U.sum(reqs.filter((r) => r.status === 'Approved' && U.parseISO(r.startDate).getFullYear() === year).map((r) => r.days));
    const onLeaveToday = new Set(reqs.filter((r) => r.status === 'Approved' && r.startDate <= today && r.endDate >= today).map((r) => r.employeeId)).size;

    const cards = [
      { label: 'Total requests', value: reqs.length, icon: '📨', filter: 'All', c: 'var(--primary)' },
      { label: 'Pending approval', value: count('Pending'), icon: '⏳', filter: 'Pending', c: 'var(--warning)' },
      { label: 'Approved', value: approved, icon: '✅', filter: 'Approved', c: 'var(--success)' },
      { label: 'Rejected', value: rejected, icon: '⛔', filter: 'Rejected', c: 'var(--danger)' },
      { label: 'Approval rate', value: decided ? `${Math.round((approved / decided) * 100)}%` : '—', icon: '📈', c: '#0891b2' },
      { label: `Approved days (${year})`, value: U.fmtDays(approvedDays), icon: '📅', c: '#7c3aed' },
      { label: 'On leave today', value: `${onLeaveToday}/${state.employees.length}`, icon: '🏝️', c: '#d97706' }
    ];
    $('#statsGrid').innerHTML = cards.map((c) => `
      <${c.filter ? `button data-action="stat-filter" data-value="${c.filter}"` : 'div'} class="stat-card" style="--c:${c.c}">
        <span class="stat-icon">${c.icon}</span>
        <div><p class="stat-value">${c.value}</p><p class="stat-label">${esc(c.label)}</p></div>
      </${c.filter ? 'button' : 'div'}>`).join('');
  }

  function barsHTML(items, unit) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return items.length
      ? items.map((i) => `
        <div class="bar-row">
          <span class="bar-label">${i.label}</span>
          <div class="bar-track"><span class="bar-fill" style="width:${(i.value / max) * 100}%;background:${i.color}"></span></div>
          <span class="bar-value">${i.display != null ? i.display : U.fmtDays(i.value)}${unit || ''}</span>
        </div>`).join('')
      : '<p class="empty">No data yet.</p>';
  }

  function renderCharts() {
    const reqs = state.requests;

    // Donut by status
    const total = reqs.length;
    let acc = 0;
    const segments = STATUSES.map((s) => {
      const n = reqs.filter((r) => r.status === s).length;
      const from = acc;
      acc += total ? (n / total) * 360 : 0;
      return { s, n, from, to: acc };
    });
    $('#statusDonut').style.background = total
      ? `conic-gradient(${segments.map((g) => `${STATUS_COLORS[g.s]} ${g.from}deg ${g.to}deg`).join(', ')})`
      : 'var(--border)';
    $('#donutTotal').innerHTML = `${total}<small>requests</small>`;
    $('#statusLegend').innerHTML = segments.map((g) => `
      <li><span class="dot" style="background:${STATUS_COLORS[g.s]}"></span>${g.s}<strong>${g.n}</strong>
      <span class="muted small">${total ? Math.round((g.n / total) * 100) : 0}%</span></li>`).join('');

    const approved = reqs.filter((r) => r.status === 'Approved');

    // Bars by type
    $('#typeBars').innerHTML = barsHTML(LEAVE_TYPES.map((t) => ({
      label: `${t.icon} ${esc(t.name)}`,
      value: U.sum(approved.filter((r) => r.type === t.id).map((r) => r.days)),
      color: t.color
    })), ' d');

    // Bars by department
    const depts = [...new Set(state.employees.map((e) => e.department))];
    const palette = ['#4f46e5', '#db2777', '#059669', '#d97706', '#0891b2', '#7c3aed', '#ea580c'];
    $('#deptBars').innerHTML = barsHTML(depts.map((d, i) => ({
      label: esc(d),
      value: U.sum(approved.filter((r) => employeeById(r.employeeId).department === d).map((r) => r.days)),
      color: palette[i % palette.length]
    })).sort((a, b) => b.value - a.value), ' d');
  }

  function renderWhosOut() {
    const today = U.todayISO();
    const horizon = U.addDays(today, 14);
    const list = state.requests
      .filter((r) => r.status === 'Approved' && U.rangesOverlap(r.startDate, r.endDate, today, horizon))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    $('#whosOut').innerHTML = list.length
      ? list.map((r) => {
          const emp = employeeById(r.employeeId);
          const now = r.startDate <= today;
          return `<li>${avatar(emp, 'sm')}<span><strong>${esc(emp.name)}</strong><br><span class="muted small">${esc(emp.department)}</span></span>
            <span class="right">${typePill(r.type)}<br><span class="small ${now ? 'live' : 'muted'}">${now ? '● Out now · until ' + U.formatDate(r.endDate, { day: 'numeric', month: 'short' }) : U.formatRange(r.startDate, r.endDate)}</span></span></li>`;
        }).join('')
      : '<li class="empty">Everyone is in for the next two weeks. 🎯</li>';
  }

  function renderTeamBalances() {
    const year = new Date().getFullYear();
    $('#teamBalances').innerHTML = barsHTML(state.employees.map((e) => {
      const b = U.getBalance(state.requests, e.id, 'annual', year);
      return { label: `${avatar(e, 'xs')} ${esc(e.name)}`, value: b.used, display: `${U.fmtDays(b.used)}/${b.allowance}`, color: e.color };
    }), ' d used');
    // scale against the allowance rather than the max used value
    const allowance = U.getLeaveType('annual').allowance;
    document.querySelectorAll('#teamBalances .bar-fill').forEach((el, i) => {
      const b = U.getBalance(state.requests, state.employees[i].id, 'annual', year);
      el.style.width = `${Math.min(100, (b.used / allowance) * 100)}%`;
    });
  }

  function filteredRequests() {
    const q = ui.search;
    const list = state.requests.filter((r) => {
      const emp = employeeById(r.employeeId);
      if (ui.statusFilter !== 'All' && r.status !== ui.statusFilter) return false;
      if (ui.typeFilter !== 'all' && r.type !== ui.typeFilter) return false;
      if (ui.deptFilter !== 'all' && emp.department !== ui.deptFilter) return false;
      if (q && !(`${emp.name} ${emp.department} ${r.reason} ${r.id}`.toLowerCase().includes(q))) return false;
      return true;
    });
    const sorters = {
      'applied-desc': (a, b) => (b.appliedOn + b.id).localeCompare(a.appliedOn + a.id),
      'applied-asc': (a, b) => (a.appliedOn + a.id).localeCompare(b.appliedOn + b.id),
      'start-asc': (a, b) => a.startDate.localeCompare(b.startDate),
      'start-desc': (a, b) => b.startDate.localeCompare(a.startDate),
      'days-desc': (a, b) => b.days - a.days
    };
    return list.sort(sorters[ui.sortBy] || sorters['applied-desc']);
  }

  function renderRequestsTable() {
    const filters = ['All', ...STATUSES];
    $('#statusFilters').innerHTML = filters.map((f) => {
      const n = f === 'All' ? state.requests.length : state.requests.filter((r) => r.status === f).length;
      return `<button class="chip ${ui.statusFilter === f ? 'active' : ''}" data-action="status-filter" data-value="${f}" aria-pressed="${ui.statusFilter === f}">${f} <span>${n}</span></button>`;
    }).join('');

    const rows = filteredRequests();
    $('#requestsBody').innerHTML = rows.length
      ? rows.map((r) => {
          const emp = employeeById(r.employeeId);
          let actions;
          if (r.status === 'Pending') {
            actions = `<div class="actions">
              <button class="btn btn-success btn-sm" data-action="approve" data-id="${esc(r.id)}">✓ Approve</button>
              <button class="btn btn-danger btn-sm" data-action="reject" data-id="${esc(r.id)}">✕ Reject</button></div>`;
          } else if (r.status === 'Cancelled') {
            actions = `<span class="muted small">Cancelled by employee${r.cancelledOn ? ' · ' + U.formatDate(r.cancelledOn) : ''}</span>`;
          } else {
            actions = `<span class="muted small">${esc(r.reviewedBy || MANAGER.name)} · ${U.formatDate(r.reviewedOn)}</span>` +
              (r.managerComment ? `<br><span class="small">💬 ${esc(r.managerComment)}</span>` : '');
          }
          return `
          <tr class="${r.status === 'Pending' ? 'row-pending' : ''}">
            <td data-label="Employee"><div class="emp-cell">${avatar(emp, 'sm')}<span><strong>${esc(emp.name)}</strong><br><span class="muted small">${esc(emp.department)}</span></span></div></td>
            <td data-label="Type">${typePill(r.type)}</td>
            <td data-label="Dates">${U.formatRange(r.startDate, r.endDate)}${r.halfDay ? ' <span class="muted small">(half day)</span>' : ''}</td>
            <td data-label="Days"><strong>${U.fmtDays(r.days)}</strong></td>
            <td data-label="Reason" class="reason">${esc(r.reason)}</td>
            <td data-label="Applied">${U.formatDate(r.appliedOn)}</td>
            <td data-label="Status">${statusBadge(r.status)}</td>
            <td data-label="Actions">${actions}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="8" class="empty">No requests match the current filters.</td></tr>';

    $('#requestsCount').textContent = `Showing ${rows.length} of ${state.requests.length} requests`;
  }

  /* ---------------- Approve / reject modal ---------------- */
  function openModal(requestId, action) {
    const r = state.requests.find((x) => x.id === requestId);
    if (!r || r.status !== 'Pending') return;
    ui.modal = { requestId, action };
    const emp = employeeById(r.employeeId);
    const year = U.parseISO(r.startDate).getFullYear();
    const bal = U.getBalance(state.requests, emp.id, r.type, year);
    // Balance check excluding this request's own pending days
    const availableForThis = bal.allowance == null ? Infinity : bal.remaining;
    const exceeds = r.days > availableForThis;

    const overlapping = state.requests.filter((x) => x.id !== r.id && x.status === 'Approved' &&
      employeeById(x.employeeId).department === emp.department &&
      x.employeeId !== emp.id && U.rangesOverlap(x.startDate, x.endDate, r.startDate, r.endDate));

    const approve = action === 'approve';
    $('#modalTitle').textContent = approve ? 'Approve leave request' : 'Reject leave request';
    $('#modalBody').innerHTML = `
      <div class="emp-cell">${avatar(emp)}<span><strong>${esc(emp.name)}</strong><br><span class="muted small">${esc(emp.role)} · ${esc(emp.department)}</span></span></div>
      <dl class="details">
        <dt>Request</dt><dd>${esc(r.id)}</dd>
        <dt>Leave type</dt><dd>${typePill(r.type)}</dd>
        <dt>Dates</dt><dd>${U.formatRange(r.startDate, r.endDate)} · <strong>${U.fmtDays(r.days)} day(s)</strong></dd>
        <dt>Reason</dt><dd>${esc(r.reason)}</dd>
        <dt>Balance</dt><dd>${bal.allowance == null ? 'Unlimited' : `${U.fmtDays(bal.used)} used of ${bal.allowance} · ${U.fmtDays(bal.remaining)} remaining`}</dd>
      </dl>
      ${exceeds && approve ? `<p class="alert alert-warn">⚠️ Approving will exceed ${esc(emp.name.split(' ')[0])}'s ${esc(bal.type.name.toLowerCase())} balance.</p>` : ''}
      ${overlapping.length ? `<p class="alert alert-info">👥 ${overlapping.length} other ${esc(emp.department)} team member(s) already approved for overlapping dates: ${overlapping.map((x) => esc(employeeById(x.employeeId).name)).join(', ')}.</p>` : ''}`;

    $('#commentLabel').innerHTML = approve ? 'Comment <span class="muted">(optional)</span>' : 'Reason for rejection <em>*</em>';
    $('#modalComment').value = '';
    $('#modalError').hidden = true;
    const confirmBtn = $('#modalConfirm');
    confirmBtn.className = `btn ${approve ? 'btn-success' : 'btn-danger'}`;
    confirmBtn.textContent = approve ? '✓ Approve' : '✕ Reject';
    $('#modal').hidden = false;
    setTimeout(() => $('#modalComment').focus(), 30);
  }

  function closeModal() {
    $('#modal').hidden = true;
    ui.modal = null;
  }

  function confirmModal() {
    if (!ui.modal) return;
    const r = state.requests.find((x) => x.id === ui.modal.requestId);
    const comment = $('#modalComment').value.trim();
    const approve = ui.modal.action === 'approve';
    if (!approve && comment.length < 3) {
      const err = $('#modalError');
      err.textContent = 'Please provide a reason for rejecting this request.';
      err.hidden = false;
      return;
    }
    r.status = approve ? 'Approved' : 'Rejected';
    r.reviewedOn = U.todayISO();
    r.reviewedBy = MANAGER.name;
    r.managerComment = comment;
    persist();
    closeModal();
    render();
    toast(`${employeeById(r.employeeId).name}'s request was ${r.status.toLowerCase()}.`, approve ? 'success' : 'error');
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
