(function () {
  "use strict";

  // Mobile drawer enhancer for Lab Inventory
  // - 모바일에서 사이드바를 슬라이드 드로어로 사용
  // - 별도 fixed 햄버거 버튼(#mobileSidebarToggle) 사용
  // - 백드롭/외부 탭, ESC, 네비 선택 시 자동 닫힘
  // - 데스크탑 폭으로 돌아오면 sidebar-open 상태 정리

  const MOBILE_MAX = 860;
  const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;

  const getMobileToggle = () => document.getElementById("mobileSidebarToggle");

  function syncToggleA11y() {
    const button = getMobileToggle();
    if (!button) return;
    const open = document.body.classList.contains("sidebar-open");
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    button.title = open ? "메뉴 닫기" : "메뉴 열기";
  }

  function setSidebar(open) {
    document.body.classList.toggle("sidebar-open", open);
    document.body.classList.toggle("sidebar-collapsed", !open);
    syncToggleA11y();
  }

  function closeSidebar() {
    if (!document.body.classList.contains("sidebar-open")) return;
    setSidebar(false);
  }

  function toggleSidebar() {
    setSidebar(!document.body.classList.contains("sidebar-open"));
  }

  function boot() {
    document.body.classList.add("mobile-drawer-ready");

    const mobileToggle = getMobileToggle();
    if (mobileToggle) {
      mobileToggle.addEventListener("click", (event) => {
        if (!isMobile()) return;
        event.preventDefault();
        event.stopPropagation();
        toggleSidebar();
      });
    }

    // 모바일 첫 진입 시 본문이 가려지지 않도록 기본은 닫힘 상태로 정리합니다.
    if (isMobile()) setSidebar(false);
    else syncToggleA11y();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // 1) 사이드바 바깥/백드롭 탭하면 닫기
  document.addEventListener("click", (event) => {
    if (!isMobile()) return;
    if (!document.body.classList.contains("sidebar-open")) return;

    const sidebar = document.querySelector(".sidebar");
    const mobileToggle = getMobileToggle();
    const legacyToggle = document.getElementById("sidebarToggle");

    if (sidebar && sidebar.contains(event.target)) return;
    if (mobileToggle && mobileToggle.contains(event.target)) return;
    if (legacyToggle && legacyToggle.contains(event.target)) return;

    closeSidebar();
  }, true);

  // 2) ESC 키로 닫기
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMobile()) closeSidebar();
  });

  // 3) 모바일에서 사이드바 안의 네비/뷰 버튼을 누르면 자동으로 닫기
  document.addEventListener("click", (event) => {
    if (!isMobile()) return;
    const navBtn = event.target.closest(".sidebar [data-view], .sidebar .nav-item");
    if (!navBtn) return;
    setTimeout(closeSidebar, 50);
  });

  // 4) 데스크탑 폭으로 돌아오면 sidebar-open 상태 정리
  let lastMobile = isMobile();
  window.addEventListener("resize", () => {
    const nowMobile = isMobile();
    if (lastMobile && !nowMobile) {
      document.body.classList.remove("sidebar-open");
      syncToggleA11y();
    }
    if (!lastMobile && nowMobile) {
      setSidebar(false);
    }
    lastMobile = nowMobile;
  });
})();
