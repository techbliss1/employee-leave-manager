/* ==========================================================
   App bootstrap: view switching, theme, reset
   ========================================================== */
const App = (() => {
  let currentView = "employee";

  function init() {
    Store.load();

    const settings = Store.getSettings();
    applyTheme(settings.theme || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    currentView = settings.view === "manager" ? "manager" : "employee";

    EmployeeView.init();
    ManagerView.init();

    document.querySelectorAll(".tab-btn").forEach((btn) =>
      btn.addEventListener("click", () => switchView(btn.dataset.view))
    );

    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      Store.setSetting("theme", next);
    });

    document.getElementById("resetDemo").addEventListener("click", () => {
      if (!confirm("Reset all leave requests to the original sample data? Your changes will be lost.")) return;
      Store.reset();
      Utils.toast("Demo data has been reset.", "success");
      refresh();
    });

    // Keep multiple open tabs in sync.
    window.addEventListener("storage", (e) => {
      if (e.key === "elm.data.v1") { Store.load(); refresh(); }
    });

    switchView(currentView);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.getElementById("themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function switchView(view) {
    currentView = view;
    Store.setSetting("view", view);
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
    refresh();
  }

  function refresh() {
    EmployeeView.render();
    ManagerView.render();
  }

  return { init, refresh };
})();

document.addEventListener("DOMContentLoaded", App.init);
