# 🗓️ Employee Leave Manager

A modern, interactive **Employee Leave Management** web application built with plain **HTML, CSS, and JavaScript** — no frameworks, no build step, no backend. All data is stored in the browser's **localStorage**, and the app ships with sample employees and leave requests so it can be demonstrated immediately.

---

## ✨ Features

### 👤 Employee view
- **Switch between sample employees** (simulated sign-in) to see each person's data.
- **Leave balance cards** for every leave type showing remaining, used, and pending days with a progress bar.
- **Submit leave requests** with leave type, start/end dates, optional **half day**, and a reason.
  - Live calculation of **working days** (weekends excluded) and remaining balance.
  - Validation: end date after start date, no weekend-only requests, no overlap with existing requests, sufficient balance, and no past dates (except Sick and Bereavement leave, which can be logged retroactively).
- **Leave history** with status badges, a status timeline (Submitted → Under review → Decision), manager comments, and a status filter.
- **Cancel** pending requests.

### 📊 Manager dashboard
- **Statistics**: total requests, pending, approved, rejected, approval rate, days approved this year, and upcoming approved leave.
- **Charts**: approved days by leave type and requests by department.
- **Out of office today** list.
- **Requests table** with:
  - **Status filter tabs** (All / Pending / Approved / Rejected / Cancelled) with live counts
  - Search by employee, department, or reason
  - Leave-type filter and sorting
  - **Team overlap warnings** when colleagues in the same department are off at the same time
- **Approve or reject** with one click or through a review dialog. A comment is required when rejecting.

### 🎨 General
- Responsive layout for desktop, tablet, and mobile
- Light and dark mode (remembered between visits)
- Toast notifications and accessible markup (ARIA roles, labels, keyboard Escape to close dialogs)
- **Reset demo data** button to restore the original sample data
- User input is HTML-escaped before rendering

---

## 🗂️ Leave types & annual allowances

| Leave type | Allowance (days/year) |
|---|---|
| 🌴 Annual Leave | 20 |
| 🤒 Sick Leave | 10 |
| 🏠 Personal Leave | 5 |
| 👶 Parental Leave | 15 |
| 🕊️ Bereavement Leave | 5 |
| 💼 Unpaid Leave | No limit |

Allowances are configured in `js/data.js` (`LEAVE_TYPES`).

## 👥 Sample data

- **8 employees** across Engineering, Marketing, Sales, HR, Finance, and Design
- **23 leave requests**: 6 pending, 12 approved, 3 rejected, 2 cancelled

Sample dates are generated **relative to today** when the data is first loaded, so the demo always shows current, upcoming, and past leave.

---

## 🚀 Running locally

No installation or build step is required.

### Option 1 — Open the file directly
1. Clone the repository:
   ```bash
   git clone https://github.com/techbliss1/employee-leave-manager.git
   cd employee-leave-manager
   ```
2. Double-click `index.html` (or open it from your browser with **File → Open**).

### Option 2 — Use a local web server (recommended)
From the project folder, run one of the following:

```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .
```

Then open **http://localhost:8080** (or the URL shown by `serve`) in your browser.

> 💡 VS Code users can also use the **Live Server** extension: right-click `index.html` → **Open with Live Server**.

---

## 🧭 How to use the demo

1. **Employee view** (default): choose an employee from the *Signed in as* dropdown, review balances, and submit a new request.
2. Switch to **Manager Dashboard**: the new request appears under **Pending**. Approve it, or reject it with a comment.
3. Switch back to the **Employee** view to see the updated status, timeline, manager comment, and balance.
4. Click **↺ Reset demo data** at any time to restore the original sample data.

---

## 📁 Project structure

```
employee-leave-manager/
├── index.html        # App layout: header, employee view, manager dashboard, modal
├── assets/
│   └── favicon.svg   # App icon
├── css/
│   └── styles.css    # Theme variables (light/dark), layout, components, responsive rules
├── js/
│   ├── utils.js      # Date helpers, working-day calculation, formatting, HTML escaping, toasts
│   ├── data.js       # Leave types, sample employees, and sample request generator
│   ├── storage.js    # localStorage persistence + business rules (balances, validation, approve/reject/cancel)
│   ├── employee.js   # Employee view: balances, request form, leave history
│   ├── manager.js    # Manager dashboard: stats, charts, filters, approval workflow
│   └── app.js        # Bootstrap: view switching, theme toggle, reset, cross-tab sync
└── README.md
```

## 💾 Data storage

| localStorage key | Contents |
|---|---|
| `elm.data.v1` | Employees and leave requests |
| `elm.settings.v1` | UI preferences (theme, current view, selected employee) |

To clear everything, use **Reset demo data** or clear the site data in your browser's developer tools.

## ⚠️ Notes & limitations

- This is a **front-end demo**: there is no authentication, and data is stored only in the current browser.
- Working days exclude Saturdays and Sundays. Public holidays are not considered.
- Balances are calculated per calendar year, based on each request's start date.

## 🌐 Browser support

Latest versions of Chrome, Edge, Firefox, and Safari.

## 📄 License

MIT. Free to use and modify.
