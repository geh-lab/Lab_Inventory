(function () {
  "use strict";

  const SVG = {
    dashboard: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z'/></svg>",
    boxes: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='m3 7 6-4 6 4-6 4-6-4Z'/><path d='m15 7 6 4-6 4-6-4'/><path d='M3 7v7l6 4 6-4V7'/></svg>",
    map: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z'/><path d='M9 3v15M15 6v15'/></svg>",
    tags: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M20 10 12 2H5v7l8 8a3 3 0 0 0 4 0l3-3a3 3 0 0 0 0-4Z'/><path d='M7.5 6.5h.01'/></svg>",
    shield: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'/><path d='m9 12 2 2 4-5'/></svg>",
    panel: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 5h16v14H4z'/><path d='M9 5v14'/><path d='m15 9-3 3 3 3'/></svg>",
    search: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.2-3.2'/></svg>",
    google: "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.43Z'/><path d='M12 22c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.6A10 10 0 0 0 12 22Z'/><path d='M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.06a10 10 0 0 0 0 9l3.34-2.6Z'/><path d='M12 5.98c1.47 0 2.78.5 3.81 1.49l2.87-2.87C16.96 2.99 14.7 2 12 2A10 10 0 0 0 3.06 7.5l3.34 2.6C7.19 7.74 9.4 5.98 12 5.98Z'/></svg>",
    plus: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.4'><path d='M12 5v14M5 12h14'/></svg>",
    sun: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'/></svg>",
    moon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z'/></svg>",
    x: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.4'><path d='M18 6 6 18M6 6l12 12'/></svg>",
    image: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 5h16v14H4z'/><path d='m4 15 4-4 4 4 3-3 5 5'/><circle cx='9' cy='9' r='1.5'/></svg>",
    upload: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 16V4'/><path d='m7 9 5-5 5 5'/><path d='M4 20h16'/></svg>",
    trash: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 6h18'/><path d='M8 6V4h8v2'/><path d='M6 6l1 18h10l1-18'/><path d='M10 11v6M14 11v6'/></svg>",
    box: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='m3 7 9-4 9 4-9 4-9-4Z'/><path d='M3 7v10l9 4 9-4V7'/><path d='M12 11v10'/></svg>"
  };
  const titles = { dashboard: "대시보드", items: "물품 목록", map: "공간 맵", categories: "분류", admin: "관리자" };

  function icon(name) { return SVG[name] || SVG.box; }

  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach((node) => {
      const key = node.dataset.icon;
      node.innerHTML = icon(key);
    });
  }

  function applyTheme(theme) {
    const safeTheme = theme === "light" ? "light" : "dark";
    const nextLabel = safeTheme === "light" ? "다크" : "라이트";
    const nextIcon = safeTheme === "light" ? "moon" : "sun";
    document.body.classList.toggle("theme-light", safeTheme === "light");
    document.body.classList.toggle("theme-dark", safeTheme !== "light");
    document.documentElement.style.colorScheme = safeTheme;
    localStorage.setItem("labInventoryTheme", safeTheme);
    document.querySelectorAll("[data-theme-toggle], #themeToggle, #themeToggleSide, #themeFab").forEach((button) => {
      const slot = button.querySelector("[data-icon]");
      if (slot) {
        slot.dataset.icon = nextIcon;
        slot.innerHTML = icon(nextIcon);
      }
      const text = button.querySelector("#themeToggleText, #themeToggleSideText, #themeFabText, .sidebar-theme-label, strong");
      if (text) text.textContent = nextLabel;
      const title = safeTheme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환";
      button.title = title;
      button.setAttribute("aria-label", title);
    });
  }

  function setView(view) {
    if (!view || !document.querySelector(`[data-view-section="${view}"]`)) return;
    document.body.className = document.body.className.replace(/\bview-\w+\b/g, "").trim();
    document.body.classList.add(`view-${view}`);
    document.querySelectorAll(".nav-item[data-view]").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
    document.querySelectorAll("[data-view-section]").forEach((section) => section.classList.toggle("active", section.dataset.viewSection === view));
    const title = document.getElementById("pageTitle");
    if (title) title.textContent = titles[view] || "Lab Inventory";
  }

  document.addEventListener("DOMContentLoaded", () => {
    hydrateIcons(document);
    applyTheme(localStorage.getItem("labInventoryTheme") || "dark");
    document.addEventListener("click", (event) => {
      const themeBtn = event.target.closest("[data-theme-toggle], #themeToggle, #themeToggleSide, #themeFab");
      if (themeBtn && !window.LabInventoryFullAppReady) {
        const isLight = document.body.classList.contains("theme-light");
        applyTheme(isLight ? "dark" : "light");
      }
      const viewBtn = event.target.closest("[data-view]");
      if (viewBtn && !window.LabInventoryFullAppReady) setView(viewBtn.dataset.view);
    });
  });

  window.LabInventoryFallback = { hydrateIcons, applyTheme, setView, icon };
})();
