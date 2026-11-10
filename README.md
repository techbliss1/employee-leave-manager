# 🌴 LeaveFlow — Employee Leave Manager

A modern, interactive **Employee Leave Management** web app built with plain **HTML, CSS and JavaScript** — no frameworks, no build step, no backend. All data is stored in the browser's **localStorage**, and sample employees and leave requests are loaded automatically so you can demo the app right away.

## ✨ Features

### 👤 Employee view
- **Switch between 6 sample employees** with the "Signed in as" selector.
- **Leave balance cards** for each leave type: remaining, used and pending days, with a progress bar.
- **Submit leave requests**: choose the leave type, start and end dates, and enter a reason.
  - Live duration preview in **working days** (weekends are not counted).
  - Validation: no past dates (sick leave can be back-dated up to 30 days), end date on or after start date, no overlap with your pending or approved leave, enough balance left, and a reason is required.
- **Leave history** with status badges (Pending / Approved / Rejected / Cancelled), manager comments, and filter chips.
- **Cancel** your own pending requests.

### 📊 Manager dashboard
- **Statistics:** total requests, pending, approved, rejected, approval rate, number of people on leave today, and total approved days.
- **Leave days by type** bar chart showing approved and pending days.
- **Who's away:** approved leave that is happening now or starts in the next 30 days.
- **Requests table** with **status tabs** (All / Pending / Approved / Rejected / Cancelled), **search**, and **leave type** and **department** filters.
- **Approve / Reject** in a confirmation dialog. Comments are optional when approving and **required** when rejecting.
- A badge in the navigation shows how many requests are pending.

### 🎨 UI and UX
- Responsive layout. On mobile, the table turns into stacked cards.
- Automatic **dark mode** that follows your OS setting (`prefers-color-scheme`).
- Toast notifications, modal dialogs, keyboard support (Esc closes dialogs), and ARIA labels.
- **↺ Reset demo** restores the original sample data.

## 🗂️ Project structure

```
employee-leave-manager/
├── index.html        # App layout: top bar, employee view, manager view, modal, toasts
├── css/
│   └── styles.css    # Design system, components, dark mode, responsive rules
├── js/
│   ├── storage.js    # LeaveStore: localStorage, sample data, date helpers, balances
│   └── app.js        # UI logic: rendering, validation, filters, approvals, events
├── .gitignore
└── README.md
```

## 🚀 Run locally

You only need a modern web browser (Chrome, Edge, Firefox or Safari).

1. **Clone the repository**
   ```bash
   git clone https://github.com/techbliss1/employee-leave-manager.git
   cd employee-leave-manager
   ```
2. **Open the app.** Choose one option:
   - **Option A: open the file directly.** Double-click `index.html`, or drag it into your browser.
   - **Option B: use a local web server (recommended)**
     ```bash
     # Python 3
     python -m http.server 8080
     # or Node.js
     npx serve .
     ```
     Then open <http://localhost:8080> (`npx serve` prints its own URL, usually <http://localhost:3000>).
   - **Option C: VS Code.** Install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.

## 🧪 Try it out

1. In **Employee** view, choose **Aarav Mehta**, submit a request, and watch the balance and history update.
2. Switch to **Manager** view. The new request appears under **Pending**.
3. **Approve** or **Reject** it (rejecting requires a comment).
4. Switch back to the employee to see the new status and the manager's comment.
5. Click **↺ Reset demo** at any time to restore the sample data.

## 📦 Sample data

| ID | Employee | Role | Department |
|----|----------|------|------------|
| E001 | Aarav Mehta | Software Engineer | Engineering |
| E002 | Sophia Williams | Product Designer | Design |
| E003 | Rahul Verma | QA Analyst | Engineering |
| E004 | Emily Chen | Marketing Specialist | Marketing |
| E005 | Daniel Okafor | Sales Executive | Sales |
| E006 | Ananya Iyer | HR Associate | Human Resources |

There are **14 sample leave requests** across all statuses. Their dates are generated **relative to today**, so the demo always shows past, ongoing and upcoming leave.

| Leave type | Yearly allowance |
|------------|------------------|
| 🌴 Annual Leave | 18 days |
| 🤒 Sick Leave | 10 days |
| ☕ Casual Leave | 6 days |
| 📄 Unpaid Leave | No limit |

## 💾 Data storage

- Requests and employees are saved in `localStorage` under the key **`elm.data.v1`**. The selected view and employee are saved under **`elm.prefs.v1`**.
- Data stays in your browser only. To start fresh, click **↺ Reset demo** or clear the site data in your browser's developer tools.
- Leave allowances are set in `LEAVE_TYPES` in `js/storage.js`, and sample data is in `SAMPLE_EMPLOYEES` and `SAMPLE_REQUESTS`.

> ⚠️ This is a front-end demo with no authentication or server. Don't use it to store real employee data.

## 📄 License

MIT. Free to use and adapt.
