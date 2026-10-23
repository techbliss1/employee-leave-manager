# 🌿 LeaveFlow — Employee Leave Manager

A modern, interactive **Employee Leave Management** web application built with plain **HTML, CSS and JavaScript** — no frameworks, no build step, no backend.
All data is stored in the browser using **`localStorage`**, and the app ships with sample employees and leave requests so it can be demonstrated immediately.

---

## ✨ Features

### 👤 Employee Portal
- **Demo sign-in switcher** – pick any of the 8 sample employees to act as them.
- **Leave balance cards** for each leave type, showing available, used and pending days with progress bars.
- **Leave request form**
  - Choose a leave type, start/end dates, optional **half day** (single-day requests) and a reason.
  - Live summary of **working days** requested (weekends and public holidays are excluded automatically) versus the available balance.
  - Validation: required fields, end ≥ start, no past dates (sick leave can be back-dated up to 30 days), max 120 calendar days, no overlap with your own pending/approved leave, and sufficient balance.
- **Status tracker** – counts per status and a 3-step progress tracker (Submitted → Manager review → Decision) for the latest request, including the manager's comment.
- **Upcoming approved leave** and upcoming **public holidays**.
- **Leave history** table with status filters; cancel pending requests or withdraw approved leave that hasn't started yet.

### 📊 Manager Dashboard
- **Statistics cards**: total requests, pending, approved, rejected, approval rate, approved days this year and employees on leave today (click a card to filter the table).
- **Charts** (pure CSS): requests by status (donut), approved days by leave type and by department.
- **Who's out** in the next 14 days and **team annual-leave balances**.
- **Requests table** with status filter chips, search (employee, department, reason, ID), leave-type and department filters, and sorting.
- **Approve / Reject** workflow in a modal with balance check, warning if approval exceeds the balance, team-overlap warning, and comments (a reason is required to reject).
- Pending-count badge on the dashboard tab.

### 🧩 General
- Light / **dark mode** toggle (remembered).
- Responsive layout (tables turn into cards on mobile), keyboard accessible, `Esc` closes dialogs.
- **Reset demo data** button restores the original sample data.
- Changes sync between open browser tabs.

---

## 🗂️ Project structure

```
employee-leave-manager/
├── index.html            # App shell: header, Employee Portal, Manager Dashboard, modal
├── css/
│   └── styles.css        # Theme variables, layout, components, dark mode, responsive rules
├── js/
│   ├── data.js           # Leave types, employees, manager, holidays and sample-request templates
│   ├── leave-utils.js    # Date helpers, working-day counting, balance calculation, HTML escaping
│   ├── storage.js        # localStorage load/save/reset + demo seed generation
│   └── app.js            # UI rendering, events, validation, approval workflow
├── assets/
│   └── favicon.svg       # App icon
└── README.md
```

---

## 🚀 Run locally

### Option 1 — Open the file directly (simplest)
1. Clone or download the repository:
   ```bash
   git clone https://github.com/techbliss1/employee-leave-manager.git
   cd employee-leave-manager
   ```
2. Double-click **`index.html`** (or open it from your browser with *File → Open*).

> The app uses classic `<script>` tags (no ES modules), so it works straight from the file system.

### Option 2 — Use a local web server (recommended)
Any static server works. For example:

```bash
# Python 3
python -m http.server 8080

# or Node.js
npx serve .
```

Then open **http://localhost:8080** in your browser.

### Option 3 — VS Code Live Server
Open the folder in VS Code, install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.

### Option 4 — GitHub Pages (optional)
In the repository go to **Settings → Pages**, choose **Deploy from a branch**, select `main` / `root`, and save. The app will be available at `https://techbliss1.github.io/employee-leave-manager/`.

---

## 🎬 Demo walkthrough

1. **Employee Portal** – you start as *Alex Johnson*. Review the balance cards and history.
2. Submit a new request (e.g. *Annual Leave*, next week, 2 days). Watch the live day count and the balance update in the *pending* bar.
3. Try an invalid request (overlapping dates or more days than available) to see validation messages.
4. Switch to **Manager Dashboard** – the new request appears in the *Pending* list with a badge on the tab.
5. **Approve** or **Reject** (rejection requires a comment). Statistics and charts update instantly.
6. Go back to the Employee Portal – the status tracker shows the decision and manager's note.
7. Use **↺ Reset demo data** at any time to restore the sample data.

---

## 📚 Sample data

| Item | Details |
|---|---|
| Employees | 8 employees across Engineering, Design, Marketing, Sales, Human Resources and Product |
| Manager | Priya Sharma — HR & Operations Manager |
| Leave requests | 23 requests: 6 Pending, 12 Approved, 3 Rejected, 2 Cancelled |
| Dates | Generated **relative to today**, so the demo always shows past, current and upcoming leave |

### Leave types & yearly allowances

| Leave type | Allowance (working days / year) |
|---|---|
| 🏖️ Annual Leave | 20 |
| 🤒 Sick Leave | 10 |
| ☕ Casual Leave | 6 |
| 👶 Parental Leave | 30 |
| 📄 Unpaid Leave | Unlimited |

Public holidays excluded from day counts: New Year's Day (01‑01), Labour Day (05‑01), Christmas Day (12‑25), Boxing Day (12‑26).

---

## ⚙️ Customisation

- **Employees, leave types, allowances, holidays, sample requests** → edit `js/data.js`.
- **Colours / theme** → edit the CSS variables at the top of `css/styles.css`.
- After changing seed data, click **↺ Reset demo data** (or clear the `leaveflow.state.v1` key in your browser's localStorage) to reload it.

---

## 🔒 Notes & limitations

- This is a **front-end demo**. There is no authentication or server; the employee switcher and manager view are for demonstration only.
- Data is stored only in the current browser's `localStorage`; clearing site data removes it.
- All user-entered text is HTML-escaped before rendering.

## 🧰 Tech stack

HTML5 · CSS3 (custom properties, grid, `conic-gradient`, `color-mix`) · Vanilla JavaScript (ES2017+) · Web Storage API

Works in current versions of Chrome, Edge, Firefox and Safari.
