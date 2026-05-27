const firebaseConfig = {
  apiKey: "AIzaSyCzMpS-PnOPEnCL6Fqk8VteNzHMrpXMmS8",
  authDomain: "lab-inventory-b7a6b.firebaseapp.com",
  databaseURL: "https://lab-inventory-b7a6b-default-rtdb.firebaseio.com",
  projectId: "lab-inventory-b7a6b",
  storageBucket: "lab-inventory-b7a6b.firebasestorage.app",
  messagingSenderId: "218879100576",
  appId: "1:218879100576:web:74e6b66f3400cc5c286bc5"
};

// 관리자 이메일만 물품/공간을 추가·수정·삭제할 수 있습니다.
// 관리자 계정을 바꾸려면 아래 배열의 이메일을 수정하세요.
const ADMIN_EMAILS = ["envlab1315@gmail.com"];
const CATEGORY_NONE = "해당 없음";

const DEFAULT_LOCATIONS = [
  { id: "greenhouse-storage", label: "온실-창고", group: "온실", major: "온실", middle: "창고", minor: "자재 보관", type: "greenhouse", icon: "warehouse", desc: "상토, 비료, 농자재, 온실 작업 도구 보관" },
  { id: "greenhouse", label: "온실", group: "온실", major: "온실", middle: "재배 공간", minor: "", type: "greenhouse", icon: "sprout", desc: "온실 재배·처리·생육조사 관련 물품" },
  { id: "office", label: "사무실", group: "사무실", major: "사무실", middle: "공용", minor: "", type: "common", icon: "desk", desc: "문서, 노트북, 라벨지, 행정/공용 물품" },
  { id: "lab-storage", label: "실험실-창고", group: "실험실", major: "실험실", middle: "창고", minor: "소모품 보관", type: "lab", icon: "archive", desc: "실험 소모품, 예비 장비, 보관 박스" },
  { id: "lab", label: "실험실", group: "실험실", major: "실험실", middle: "실험 공간", minor: "", type: "lab", icon: "flask", desc: "실험대, 분석, 전처리 관련 물품" },
  { id: "instrument", label: "공동기기실", group: "실험실", major: "실험실", middle: "공동기기실", minor: "분석 장비", type: "lab", icon: "microscope", desc: "공동 장비, 계측기, 분석 장비" },
  { id: "ktng", label: "KT&G", group: "외부", major: "외부", middle: "KT&G", minor: "", type: "common", icon: "building", desc: "외부 협력 장소 또는 KT&G 관련 보관 물품" },
  { id: "second-floor", label: "2층", group: "건물", major: "건물", middle: "2층", minor: "", type: "common", icon: "stairs", desc: "2층 공간 및 임시 보관 구역" },
  { id: "etc", label: "기타", group: "기타", major: "기타", middle: "미지정", minor: "", type: "common", icon: "more", desc: "아직 세부 위치를 정하지 않은 물품" }
];

const PROJECTS = [
  { id: "field", label: "노지", icon: "field" },
  { id: "greenhouse", label: "온실", icon: "sprout" },
  { id: "both", label: "모두", icon: "layers" }
];

const DEFAULT_CATEGORIES = [CATEGORY_NONE, "HPLC 분석", "흡광도 분석", "장비", "소모품", "시약", "종자", "토양/상토", "비료", "공구", "안전용품", "문서", "기타"];

const state = {
  view: "dashboard",
  search: "",
  locationFilter: "all",
  projectFilter: "all",
  categoryFilter: "all",
  selectedMapMajor: "",
  selectedMapLocation: "greenhouse-storage",
  selectedAdminLocation: "greenhouse-storage",
  theme: localStorage.getItem("labInventoryTheme") || "dark"
};

let inventoryRaw = {};
let settingsRaw = { locations: {}, hiddenLocations: {}, categories: {}, hiddenCategories: {} };
let customCategories = new Set(DEFAULT_CATEGORIES);
let currentUser = null;
let editingItem = null;
let editingLocationId = null;
let tempImageData = null;
let tempLocationImageData = null;
let dialogResolver = null;
let itemsCache = null;
let searchRenderTimer = null;
let renderFrame = null;
let webpSupported = null;

let app = null;
let db = null;
let auth = null;
let provider = null;
let firebaseReady = false;
let firebaseBooting = false;
let firebaseError = null;
const fb = {};

const els = {
  sidebarToggle: document.getElementById("sidebarToggle"),
  searchInput: document.getElementById("searchInput"),
  themeToggle: document.getElementById("themeToggle"),
  themeToggleText: document.getElementById("themeToggleText"),
  themeToggleSide: document.getElementById("themeToggleSide"),
  themeToggleSideText: document.getElementById("themeToggleSideText"),
  themeFab: document.getElementById("themeFab"),
  themeFabText: document.getElementById("themeFabText"),
  authBtn: document.getElementById("authBtn"),
  authBtnText: document.getElementById("authBtnText"),
  authAvatar: document.getElementById("authAvatar"),
  authMiniTitle: document.getElementById("authMiniTitle"),
  authMiniSub: document.getElementById("authMiniSub"),
  pageTitle: document.getElementById("pageTitle"),
  statGrid: document.getElementById("statGrid"),
  dashboardMap: document.getElementById("dashboardMap"),
  attentionList: document.getElementById("attentionList"),
  locationFilterBar: document.getElementById("locationFilterBar"),
  projectFilterBar: document.getElementById("projectFilterBar"),
  categoryFilterBar: document.getElementById("categoryFilterBar"),
  itemGrid: document.getElementById("itemGrid"),
  listMeta: document.getElementById("listMeta"),
  spaceMap: document.getElementById("spaceMap"),
  mapSpaceTabs: document.getElementById("mapSpaceTabs"),
  mapDetailPanel: document.getElementById("mapDetailPanel"),
  categoryBoard: document.getElementById("categoryBoard"),
  adminStatusPanel: document.getElementById("adminStatusPanel"),
  locationManageList: document.getElementById("locationManageList"),
  itemModal: document.getElementById("itemModal"),
  itemModalTitle: document.getElementById("itemModalTitle"),
  itemNameInput: document.getElementById("itemNameInput"),
  itemLocationSelect: document.getElementById("itemLocationSelect"),
  itemDetailLocationInput: document.getElementById("itemDetailLocationInput"),
  itemQtyInput: document.getElementById("itemQtyInput"),
  projectSegmented: document.getElementById("projectSegmented"),
  categoryChecklist: document.getElementById("categoryChecklist"),
  customCategoryInput: document.getElementById("customCategoryInput"),
  addCategoryBtn: document.getElementById("addCategoryBtn"),
  itemUsageInput: document.getElementById("itemUsageInput"),
  itemImagePreview: document.getElementById("itemImagePreview"),
  itemImagePlaceholder: document.getElementById("itemImagePlaceholder"),
  itemImageInput: document.getElementById("itemImageInput"),
  itemImageUrlInput: document.getElementById("itemImageUrlInput"),
  imagePickBtn: document.getElementById("imagePickBtn"),
  removeItemImageBtn: document.getElementById("removeItemImageBtn"),
  saveItemBtn: document.getElementById("saveItemBtn"),
  deleteItemBtn: document.getElementById("deleteItemBtn"),
  readOnlyBadge: document.getElementById("readOnlyBadge"),
  locationModal: document.getElementById("locationModal"),
  locationModalTitle: document.getElementById("locationModalTitle"),
  locationNameInput: document.getElementById("locationNameInput"),
  locationGroupInput: document.getElementById("locationGroupInput"),
  locationMiddleInput: document.getElementById("locationMiddleInput"),
  locationSmallInput: document.getElementById("locationSmallInput"),
  locationMajorSuggestions: document.getElementById("locationMajorSuggestions"),
  locationMiddleSuggestions: document.getElementById("locationMiddleSuggestions"),
  locationMinorSuggestions: document.getElementById("locationMinorSuggestions"),
  locationMajorChips: document.getElementById("locationMajorChips"),
  locationMiddleChips: document.getElementById("locationMiddleChips"),
  locationMinorChips: document.getElementById("locationMinorChips"),
  locationTypeSelect: document.getElementById("locationTypeSelect"),
  locationIconSelect: document.getElementById("locationIconSelect"),
  locationDescInput: document.getElementById("locationDescInput"),
  locationImagePreview: document.getElementById("locationImagePreview"),
  locationImagePlaceholder: document.getElementById("locationImagePlaceholder"),
  locationImageInput: document.getElementById("locationImageInput"),
  locationImageUrlInput: document.getElementById("locationImageUrlInput"),
  locationImagePickBtn: document.getElementById("locationImagePickBtn"),
  removeLocationImageBtn: document.getElementById("removeLocationImageBtn"),
  saveLocationBtn: document.getElementById("saveLocationBtn"),
  dialogModal: document.getElementById("dialogModal"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogMessage: document.getElementById("dialogMessage"),
  dialogCancelBtn: document.getElementById("dialogCancelBtn"),
  dialogOkBtn: document.getElementById("dialogOkBtn")
};

const SVG = {
  dashboard: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z'/></svg>",
  boxes: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='m3 7 6-4 6 4-6 4-6-4Z'/><path d='m15 7 6 4-6 4-6-4'/><path d='M3 7v7l6 4 6-4V7'/><path d='M15 15v6l6-4v-6'/></svg>",
  map: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z'/><path d='M9 3v15M15 6v15'/></svg>",
  tags: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M20 10 12 2H5v7l8 8a3 3 0 0 0 4 0l3-3a3 3 0 0 0 0-4Z'/><path d='M7.5 6.5h.01'/><path d='m14 14 4 4'/></svg>",
  panel: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 5h16v14H4z'/><path d='M9 5v14'/><path d='m15 9-3 3 3 3'/></svg>",
  search: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.2-3.2'/></svg>",
  google: "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.43Z'/><path d='M12 22c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.6A10 10 0 0 0 12 22Z'/><path d='M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.06a10 10 0 0 0 0 9l3.34-2.6Z'/><path d='M12 5.98c1.47 0 2.78.5 3.81 1.49l2.87-2.87C16.96 2.99 14.7 2 12 2A10 10 0 0 0 3.06 7.5l3.34 2.6C7.19 7.74 9.4 5.98 12 5.98Z'/></svg>",
  plus: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.4'><path d='M12 5v14M5 12h14'/></svg>",
  sun: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'/></svg>",
  moon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z'/></svg>",
  trash: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 6h18'/><path d='M8 6V4h8v2'/><path d='M6 6l1 18h10l1-18'/><path d='M10 11v6M14 11v6'/></svg>",
  warehouse: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 10 12 4l9 6'/><path d='M5 10v10h14V10'/><path d='M9 20v-6h6v6'/><path d='M9 10h6'/></svg>",
  sprout: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 20V10'/><path d='M12 10C8 10 5 7 5 3c4 0 7 3 7 7Z'/><path d='M12 12c4 0 7-3 7-7-4 0-7 3-7 7Z'/></svg>",
  desk: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 8h16v5H4z'/><path d='M6 13v7M18 13v7M10 13v7M14 13v7'/><path d='M8 4h8v4H8z'/></svg>",
  archive: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 7h16v14H4z'/><path d='M3 3h18v4H3z'/><path d='M10 12h4'/></svg>",
  flask: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M9 2h6'/><path d='M10 2v6l-5 9a4 4 0 0 0 3.5 6h7a4 4 0 0 0 3.5-6l-5-9V2'/><path d='M7 16h10'/></svg>",
  microscope: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M9 3h4l-2 7H7l2-7Z'/><path d='m11 10 3 3'/><path d='M16 13a5 5 0 0 1-5 5H6'/><path d='M6 21h12'/><path d='M18 21v-3'/></svg>",
  building: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 21V5a2 2 0 0 1 2-2h8v18'/><path d='M14 8h6v13'/><path d='M8 7h2M8 11h2M8 15h2M17 12h1M17 16h1'/></svg>",
  stairs: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 19h5v-4h5v-4h6V5'/></svg>",
  more: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='5' cy='12' r='1'/><circle cx='12' cy='12' r='1'/><circle cx='19' cy='12' r='1'/></svg>",
  field: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 17c4-4 8-4 12 0 2 2 4 2 6 0'/><path d='M3 12c4-4 8-4 12 0 2 2 4 2 6 0'/><path d='M3 7c4-4 8-4 12 0 2 2 4 2 6 0'/></svg>",
  layers: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='m12 2 9 5-9 5-9-5 9-5Z'/><path d='m3 12 9 5 9-5'/><path d='m3 17 9 5 9-5'/></svg>",
  image: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 5h16v14H4z'/><path d='m4 15 4-4 4 4 3-3 5 5'/><circle cx='9' cy='9' r='1.5'/></svg>",
  upload: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 16V4'/><path d='m7 9 5-5 5 5'/><path d='M4 20h16'/></svg>",
  x: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.4'><path d='M18 6 6 18M6 6l12 12'/></svg>",
  box: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='m3 7 9-4 9 4-9 4-9-4Z'/><path d='M3 7v10l9 4 9-4V7'/><path d='M12 11v10'/></svg>",
  alert: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 9v4'/><path d='M12 17h.01'/><path d='M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z'/></svg>",
  shield: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'/><path d='m9 12 2 2 4-5'/></svg>",
  lock: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 10V8a6 6 0 0 1 12 0v2'/><path d='M5 10h14v11H5z'/></svg>",
  user: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='8' r='4'/><path d='M4 22a8 8 0 0 1 16 0'/></svg>",
  check: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.4'><path d='m4 12 5 5L20 6'/></svg>",
  location: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 21s7-4.4 7-11a7 7 0 0 0-14 0c0 6.6 7 11 7 11Z'/><circle cx='12' cy='10' r='2'/></svg>"
};

function init() {
  applyTheme();
  hydrateIcons();
  populateLocationSelect();
  bindEvents();
  restoreSidebarState();
  renderAll();
  window.LabInventoryFullAppReady = true;
  initFirebase();
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    const key = node.dataset.icon;
    node.innerHTML = icon(key);
  });
}

function bindEvents() {
  els.sidebarToggle.addEventListener("click", toggleSidebar);
  document.querySelectorAll("[data-theme-toggle], #themeToggle, #themeToggleSide, #themeFab").forEach((button) => {
    button.addEventListener("click", toggleTheme);
  });
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    scheduleItemSearchRender();
  });
  els.authBtn.addEventListener("click", handleAuthClick);
  document.getElementById("addItemBtn").addEventListener("click", () => openItemModal());
  document.querySelectorAll("[data-open-add]").forEach((btn) => btn.addEventListener("click", () => openItemModal()));
  els.imagePickBtn.addEventListener("click", () => els.itemImageInput.click());
  els.removeItemImageBtn.addEventListener("click", clearItemImage);
  els.itemImageInput.addEventListener("change", handleImageSelect);
  els.itemImageUrlInput.addEventListener("change", handleItemImageUrlChange);
  els.itemImageUrlInput.addEventListener("blur", handleItemImageUrlChange);
  els.locationImagePickBtn.addEventListener("click", () => els.locationImageInput.click());
  els.removeLocationImageBtn.addEventListener("click", clearLocationImage);
  els.locationImageInput.addEventListener("change", handleLocationImageSelect);
  els.locationImageUrlInput.addEventListener("change", handleLocationImageUrlChange);
  els.locationImageUrlInput.addEventListener("blur", handleLocationImageUrlChange);
  els.addCategoryBtn.addEventListener("click", addCategoryFromInput);
  els.projectSegmented.addEventListener("click", handleProjectSegmentClick);
  els.projectSegmented.addEventListener("keydown", handleSelectableLabelKeydown);
  els.projectSegmented.addEventListener("change", syncItemModalSelectors);
  els.categoryChecklist.addEventListener("click", handleCategoryCheckClick);
  els.categoryChecklist.addEventListener("keydown", handleSelectableLabelKeydown);
  els.categoryChecklist.addEventListener("change", handleCategoryToggle);
  els.saveLocationBtn.addEventListener("click", saveLocation);
  [els.locationGroupInput, els.locationMiddleInput, els.locationSmallInput].forEach((input) => {
    input?.addEventListener("input", updateLocationHierarchyOptions);
    input?.addEventListener("focus", updateLocationHierarchyOptions);
  });
  els.customCategoryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCategoryFromInput();
    }
  });
  els.saveItemBtn.addEventListener("click", saveItem);
  els.deleteItemBtn.addEventListener("click", deleteItem);
  els.dialogOkBtn.addEventListener("click", () => closeDialog(true));
  els.dialogCancelBtn.addEventListener("click", () => closeDialog(false));

  document.addEventListener("click", (event) => {
    const closeBtn = event.target.closest("[data-close-modal]");
    if (closeBtn) closeModal(closeBtn.dataset.closeModal);

    const modalOverlay = event.target.classList.contains("modal-overlay") ? event.target : null;
    if (modalOverlay && modalOverlay.id !== "dialogModal") closeModal(modalOverlay.id);

    const viewBtn = event.target.closest("[data-view]");
    if (viewBtn) setView(viewBtn.dataset.view);

    const locBtn = event.target.closest("[data-location-filter]");
    if (locBtn) {
      state.locationFilter = locBtn.dataset.locationFilter;
      setView("items");
      renderAll();
    }

    const projectBtn = event.target.closest("[data-project-filter]");
    if (projectBtn) {
      state.projectFilter = projectBtn.dataset.projectFilter;
      setView("items");
      renderAll();
    }

    const categoryBtn = event.target.closest("[data-category-filter]");
    if (categoryBtn) {
      state.categoryFilter = categoryBtn.dataset.categoryFilter;
      setView("items");
      renderAll();
    }

    const itemCard = event.target.closest("[data-item-ref]");
    if (itemCard) {
      const item = findItemByRef(itemCard.dataset.itemRef);
      if (item) openItemModal(item);
    }

    const mapMajorBtn = event.target.closest("[data-map-major]");
    if (mapMajorBtn) {
      state.selectedMapMajor = mapMajorBtn.dataset.mapMajor || "";
      ensureSelectedLocation();
      setView("map");
      renderSpaceMap();
      renderMapDetail();
    }

    const mapZone = event.target.closest("[data-map-location]");
    if (mapZone) {
      state.selectedMapLocation = mapZone.dataset.mapLocation;
      const selectedLocation = getLocation(state.selectedMapLocation);
      state.selectedMapMajor = locationMajorValue(selectedLocation);
      setView("map");
      renderSpaceMap();
      renderMapDetail();
    }

    const adminLocationTab = event.target.closest("[data-admin-location-tab]");
    if (adminLocationTab) {
      state.selectedAdminLocation = adminLocationTab.dataset.adminLocationTab;
      renderAdminPanel();
    }

    const openLocationBtn = event.target.closest("[data-open-location-modal]");
    if (openLocationBtn) openLocationModal();

    const editLocationBtn = event.target.closest("[data-edit-location]");
    if (editLocationBtn) openLocationModal(getLocation(editLocationBtn.dataset.editLocation));

    const deleteLocationBtn = event.target.closest("[data-delete-location]");
    if (deleteLocationBtn) deleteLocation(deleteLocationBtn.dataset.deleteLocation);

    const saveCategoryBtn = event.target.closest("[data-save-category]");
    if (saveCategoryBtn) saveCategoryFromBoard();

    const deleteCategoryBtn = event.target.closest("[data-delete-category]");
    if (deleteCategoryBtn) deleteCategory(deleteCategoryBtn.dataset.deleteCategory);

    const restoreCategoryBtn = event.target.closest("[data-restore-category]");
    if (restoreCategoryBtn) restoreCategory(restoreCategoryBtn.dataset.restoreCategory);

    const restoreLocationBtn = event.target.closest("[data-restore-location]");
    if (restoreLocationBtn) restoreLocation(restoreLocationBtn.dataset.restoreLocation);

    const hierarchyBtn = event.target.closest("[data-location-hierarchy-field]");
    if (hierarchyBtn) {
      applyLocationHierarchySuggestion(hierarchyBtn.dataset.locationHierarchyField, hierarchyBtn.dataset.locationHierarchyValue || "");
    }

    const qtyBtn = event.target.closest("[data-qty-delta]");
    if (qtyBtn) {
      const delta = Number(qtyBtn.dataset.qtyDelta) || 0;
      changeQty(delta);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target?.id === "categoryAdminInput") {
      event.preventDefault();
      saveCategoryFromBoard();
      return;
    }
    if (event.key === "Escape") {
      if (els.dialogModal.classList.contains("open")) closeDialog(false);
      else if (els.locationModal.classList.contains("open")) closeModal("locationModal");
      else if (els.itemModal.classList.contains("open")) closeModal("itemModal");
    }
    if (event.key === "Enter" && els.dialogModal.classList.contains("open")) {
      event.preventDefault();
      closeDialog(true);
    }
  });
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-collapsed");
  document.body.classList.toggle("sidebar-open", !document.body.classList.contains("sidebar-collapsed"));
  localStorage.setItem("labInventorySidebarCollapsed", document.body.classList.contains("sidebar-collapsed") ? "1" : "0");
}

function restoreSidebarState() {
  const isCollapsed = localStorage.getItem("labInventorySidebarCollapsed") === "1";
  document.body.classList.toggle("sidebar-collapsed", isCollapsed);
  document.body.classList.toggle("sidebar-open", !isCollapsed);
}

function applyTheme() {
  const theme = state.theme === "light" ? "light" : "dark";
  const nextThemeLabel = theme === "light" ? "다크" : "라이트";
  const nextThemeIcon = theme === "light" ? "moon" : "sun";
  const nextThemeTitle = theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환";

  state.theme = theme;
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme !== "light");
  document.documentElement.style.colorScheme = theme;

  [
    [els.themeToggle, els.themeToggleText],
    [els.themeToggleSide, els.themeToggleSideText],
    [els.themeFab, els.themeFabText]
  ].forEach(([button, label]) => {
    if (!button) return;
    const iconSlot = button.querySelector("[data-icon]");
    if (iconSlot) {
      iconSlot.dataset.icon = nextThemeIcon;
      iconSlot.innerHTML = icon(nextThemeIcon);
    }
    if (label) label.textContent = nextThemeLabel;
    button.title = nextThemeTitle;
    button.setAttribute("aria-label", nextThemeTitle);
  });
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  localStorage.setItem("labInventoryTheme", state.theme);
  applyTheme();
}

async function initFirebase() {
  if (firebaseReady || firebaseBooting) return;
  firebaseBooting = true;
  try {
    const [appModule, databaseModule, authModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js")
    ]);

    fb.ref = databaseModule.ref;
    fb.onValue = databaseModule.onValue;
    fb.set = databaseModule.set;
    fb.remove = databaseModule.remove;
    fb.signInWithPopup = authModule.signInWithPopup;
    fb.signOut = authModule.signOut;
    fb.onAuthStateChanged = authModule.onAuthStateChanged;

    app = appModule.initializeApp(firebaseConfig);
    db = databaseModule.getDatabase(app);
    auth = authModule.getAuth(app);
    provider = new authModule.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    firebaseReady = true;
    firebaseError = null;
    watchAuth();
    watchInventory();
    watchSettings();
    updateAuthUI();
    renderAdminPanel();
  } catch (error) {
    firebaseError = error;
    firebaseReady = false;
    console.error("Firebase 초기화 실패", error);
    updateAuthUI();
    renderAdminPanel();
  } finally {
    firebaseBooting = false;
  }
}

function canUseFirebase() {
  return firebaseReady && db && auth && provider && fb.ref && fb.set && fb.remove;
}

function explainFirebaseError() {
  if (location.protocol === "file:") {
    return "현재 file:// 방식으로 열린 것 같습니다. 화면 전환과 테마 변경은 가능하지만 Google 로그인/저장은 로컬 서버에서 테스트해야 안정적으로 동작합니다. 터미널에서 python3 -m http.server 5500 실행 후 http://localhost:5500 으로 접속해주세요.";
  }
  if (firebaseError?.message) return firebaseError.message;
  return "Firebase SDK를 불러오지 못했습니다. 인터넷 연결, Firebase Authorized domains, 또는 브라우저 콘솔 오류를 확인해주세요.";
}

function dbRef(path) {
  if (!canUseFirebase()) throw new Error(explainFirebaseError());
  return fb.ref(db, path);
}

function dbSet(path, value) {
  return fb.set(dbRef(path), value);
}

function dbRemove(path) {
  return fb.remove(dbRef(path));
}

function watchAuth() {
  fb.onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    updateAuthUI();
    updateFormAccess();
    renderAdminPanel();
  });
}

function watchInventory() {
  const inventoryRef = fb.ref(db, "inventory");
  fb.onValue(inventoryRef, (snapshot) => {
    inventoryRaw = snapshot.val() || {};
    invalidateCaches();
    rebuildCategorySet();
    renderAll();
  }, (error) => {
    showDialog("데이터 읽기 오류", `Firebase에서 데이터를 불러오지 못했습니다.
${error.message}`, { alertOnly: true });
  });
}

function watchSettings() {
  const settingsRef = fb.ref(db, "settings");
  fb.onValue(settingsRef, (snapshot) => {
    const value = snapshot.val() || {};
    settingsRaw = {
      locations: value.locations || {},
      hiddenLocations: value.hiddenLocations || {},
      categories: value.categories || {},
      hiddenCategories: value.hiddenCategories || {}
    };
    invalidateCaches();
    rebuildCategorySet();
    renderAll();
  }, (error) => {
    showDialog("설정 읽기 오류", `Firebase에서 공간 설정을 불러오지 못했습니다.
${error.message}`, { alertOnly: true });
  });
}

async function handleAuthClick() {
  if (!firebaseReady) await initFirebase();
  if (!canUseFirebase()) {
    showDialog("Firebase 연결 필요", explainFirebaseError(), { alertOnly: true });
    return;
  }

  if (currentUser) {
    const ok = await showDialog("로그아웃", "현재 Google 계정에서 로그아웃하시겠습니까?");
    if (ok) fb.signOut(auth);
    return;
  }

  if (!/^https?:$/.test(location.protocol)) {
    showDialog("로컬 서버 필요", explainFirebaseError(), { alertOnly: true });
    return;
  }

  try {
    await fb.signInWithPopup(auth, provider);
  } catch (error) {
    showDialog("로그인 실패", error.message || "Google 로그인 중 오류가 발생했습니다.", { alertOnly: true });
  }
}

function adminEmailSet() {
  return new Set(ADMIN_EMAILS.map((email) => String(email).trim().toLowerCase()).filter(Boolean));
}

function isAdminUser(user = currentUser) {
  if (!user) return false;
  const admins = adminEmailSet();
  if (!admins.size) return true;
  return admins.has(String(user.email || "").trim().toLowerCase());
}

function canEdit() {
  return isAdminUser();
}

function updateAuthUI() {
  const editable = canEdit();
  document.body.classList.toggle("editor-mode", editable);
  document.body.classList.toggle("admin-mode", editable);
  if (els.itemModal?.classList.contains("open") || els.locationModal?.classList.contains("open")) {
    updateFormAccess();
  }
  if (currentUser) {
    els.authBtnText.textContent = "로그아웃";
    els.authMiniTitle.textContent = currentUser.displayName || currentUser.email || "Google 사용자";
    els.authMiniSub.textContent = editable ? "관리자 · 편집 가능" : "읽기 전용 · 관리자 아님";
    if (currentUser.photoURL) {
      els.authAvatar.innerHTML = `<img src="${escapeAttr(currentUser.photoURL)}" alt="Google profile" />`;
    } else {
      els.authAvatar.textContent = initials(currentUser.displayName || currentUser.email || "G");
    }
  } else {
    els.authBtnText.textContent = firebaseError && !firebaseReady ? "연결 확인" : "Google 로그인";
    els.authMiniTitle.textContent = firebaseError && !firebaseReady ? "Firebase 연결 실패" : "로그인 필요";
    els.authMiniSub.textContent = firebaseError && !firebaseReady ? "설정/로컬 서버 확인" : "관리자 계정으로 편집";
    els.authAvatar.textContent = firebaseError && !firebaseReady ? "!" : "G";
  }
}

function setView(view) {
  if (!view || !document.querySelector(`[data-view-section="${view}"]`)) return;
  state.view = view;
  document.body.className = document.body.className.replace(/\bview-\w+\b/g, "").trim();
  document.body.classList.add(`view-${view}`);
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  document.querySelectorAll("[data-view-section]").forEach((section) => section.classList.toggle("active", section.dataset.viewSection === view));
  const titleMap = { dashboard: "대시보드", items: "물품 목록", map: "공간 맵", categories: "분류", admin: "관리자" };
  els.pageTitle.textContent = titleMap[view] || "Lab Inventory";
}

function renderAll() {
  if (renderFrame) {
    cancelAnimationFrame(renderFrame);
    renderFrame = null;
  }
  populateLocationSelect();
  renderFilters();
  renderDashboard();
  renderItems();
  ensureSelectedLocation();
  renderSpaceMap();
  renderMapDetail();
  renderCategoryBoard();
  renderAdminPanel();
  hydrateIcons();
}

function invalidateCaches() {
  itemsCache = null;
}

function scheduleItemSearchRender() {
  clearTimeout(searchRenderTimer);
  searchRenderTimer = setTimeout(() => {
    if (renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(() => {
      renderFrame = null;
      renderItems();
    });
  }, 130);
}

function getItems() {
  if (itemsCache) return itemsCache;
  const items = [];
  Object.entries(inventoryRaw || {}).forEach(([bucketId, bucketValue]) => {
    if (!bucketValue || typeof bucketValue !== "object" || Array.isArray(bucketValue)) return;
    Object.entries(bucketValue).forEach(([id, raw]) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      if (!("name" in raw) && !("qty" in raw) && !("usage" in raw)) return;
      items.push(normalizeItem(id, bucketId, raw));
    });
  });
  itemsCache = items.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return itemsCache;
}

function normalizeItem(id, sourcePath, raw) {
  const locationId = normalizeLocationId(raw.locationId || sourcePath);
  const categories = normalizeCategories(raw.categories, raw.cat);
  const project = normalizeProject(raw.project || raw.relation || raw.projectRelation);
  const location = getLocation(locationId);
  const item = {
    ...raw,
    id,
    sourcePath,
    refKey: `${sourcePath}/${id}`,
    locationId,
    location,
    name: raw.name || "이름 없음",
    qty: Number.isFinite(Number(raw.qty)) ? Number(raw.qty) : 0,
    loc: raw.loc || raw.detailLocation || "",
    usage: raw.usage || raw.desc || raw.description || "",
    categories,
    cat: categories[0] || CATEGORY_NONE,
    project,
    img: raw.img || raw.image || null,
    updatedAt: raw.updatedAt || raw.createdAt || ""
  };
  item.searchText = createItemSearchText(item);
  return item;
}

function createItemSearchText(item) {
  return [
    item.name,
    item.loc,
    item.usage,
    item.location.label,
    hierarchyText(item.location),
    getProject(item.project).label,
    ...item.categories
  ].join(" ").toLowerCase();
}

function normalizeLocationId(value) {
  const legacyMap = {
    greenhouse_storage: "greenhouse-storage",
    greenhouseWarehouse: "greenhouse-storage",
    greenhouse: "greenhouse",
    lab_storage: "lab-storage",
    labWarehouse: "lab-storage",
    lab: "lab",
    common_equipment: "instrument",
    equipment: "instrument",
    shared: "instrument",
    secondfloor: "second-floor",
    second_floor: "second-floor",
    floor2: "second-floor",
    office: "office",
    ktng: "ktng",
    etc: "etc"
  };
  return legacyMap[value] || value || "etc";
}

function normalizeCategories(categories, cat) {
  const merged = [];
  if (Array.isArray(categories)) merged.push(...categories);
  if (typeof categories === "string") merged.push(categories);
  if (cat) merged.push(cat);

  let values = [...new Set(merged.map(normalizeCategoryName).filter(Boolean))];
  if (!values.length) return [CATEGORY_NONE];
  if (values.length > 1 && values.includes(CATEGORY_NONE)) values = values.filter((value) => value !== CATEGORY_NONE);
  return values;
}

function normalizeCategoryName(value) {
  const clean = String(value ?? "").trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();
  if (["미분류", "없음", "none", "n/a", "na", "해당없음", "해당 없음"].includes(lower) || ["미분류", "없음", "해당없음", "해당 없음"].includes(clean)) {
    return CATEGORY_NONE;
  }
  return clean;
}

function normalizeProject(project) {
  const map = {
    noji: "field",
    field: "field",
    openfield: "field",
    "노지": "field",
    greenhouse: "greenhouse",
    "온실": "greenhouse",
    all: "both",
    both: "both",
    "모두": "both",
    "전체": "both"
  };
  return map[String(project || "").trim().toLowerCase()] || map[String(project || "").trim()] || "both";
}

function rebuildCategorySet() {
  customCategories = new Set(DEFAULT_CATEGORIES);
  Object.values(settingsRaw.categories || {}).forEach((category) => {
    const label = normalizeCategoryName(category?.label || category?.name || category);
    if (label) customCategories.add(label);
  });
  getItems().forEach((item) => item.categories.forEach((category) => customCategories.add(category)));
}

function getCategoryKey(label) {
  return normalizeLocationKey(label) || "category-none";
}

function isDefaultCategory(label) {
  return DEFAULT_CATEGORIES.includes(label);
}

function getHiddenCategoryKeys() {
  return new Set(Object.entries(settingsRaw.hiddenCategories || {})
    .filter(([, value]) => Boolean(value))
    .map(([id]) => id));
}

function isCategoryHidden(label) {
  return getHiddenCategoryKeys().has(getCategoryKey(label));
}

function getCategoryCounts(items = getItems()) {
  const counts = new Map();
  items.forEach((item) => item.categories.forEach((category) => counts.set(category, (counts.get(category) || 0) + 1)));
  return counts;
}

function getCategoryRecords() {
  const counts = getCategoryCounts();
  const labels = new Set(DEFAULT_CATEGORIES);
  Object.values(settingsRaw.categories || {}).forEach((category) => {
    const label = normalizeCategoryName(category?.label || category?.name || category);
    if (label) labels.add(label);
  });
  counts.forEach((_, label) => labels.add(label));
  return [...labels].map((label) => ({
    id: getCategoryKey(label),
    label,
    count: counts.get(label) || 0,
    builtIn: isDefaultCategory(label),
    hidden: isCategoryHidden(label),
    fromItems: counts.has(label)
  })).sort((a, b) => {
    if (a.hidden !== b.hidden) return a.hidden ? 1 : -1;
    return b.count - a.count || a.label.localeCompare(b.label, "ko");
  });
}

function getActiveCategoryLabels(options = {}) {
  const { includeZero = true, includeHiddenSelected = "" } = options;
  const selected = normalizeCategoryName(includeHiddenSelected);
  return getCategoryRecords()
    .filter((record) => {
      if (record.hidden && record.label !== selected) return false;
      if (!includeZero && record.count === 0 && record.label !== selected) return false;
      return true;
    })
    .map((record) => record.label);
}

function getHiddenLocationIds() {
  return new Set(Object.entries(settingsRaw.hiddenLocations || {})
    .filter(([, value]) => Boolean(value))
    .map(([id]) => id));
}

function isDefaultLocation(id) {
  return DEFAULT_LOCATIONS.some((location) => location.id === id);
}

function normalizeLocationRecord(id, raw = {}, fallback = {}) {
  const label = raw.label || fallback.label || id || "이름 없는 공간";
  const major = cleanText(raw.major ?? raw.group ?? fallback.major ?? fallback.group) || "기타";
  const middle = cleanText(raw.middle ?? fallback.middle) || "";
  const minor = cleanText(raw.minor ?? fallback.minor) || "";
  const inferredType = inferLocationType(`${major} ${middle} ${minor} ${label}`);
  const type = ["greenhouse", "lab", "common"].includes(raw.type || fallback.type) ? (raw.type || fallback.type) : inferredType;
  const iconName = SVG[raw.icon || fallback.icon] ? (raw.icon || fallback.icon) : "location";
  return {
    ...fallback,
    ...raw,
    id,
    label,
    group: major,
    major,
    middle,
    minor,
    type,
    icon: iconName,
    desc: raw.desc || fallback.desc || "사용자 추가 보관 공간",
    image: raw.image || raw.img || fallback.image || fallback.img || null
  };
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/권역$/u, "").trim();
}

function inferLocationType(value) {
  const text = String(value || "");
  if (/온실|greenhouse/i.test(text)) return "greenhouse";
  if (/실험|랩|lab|hplc|공동기기|기기실|분석/i.test(text)) return "lab";
  return "common";
}

function locationMajorValue(location) {
  return cleanText(location?.major ?? location?.group ?? "") || "기타";
}

function locationMiddleValue(location) {
  return cleanText(location?.middle ?? "");
}

function locationMinorValue(location) {
  return cleanText(location?.minor ?? "");
}

function uniqueSorted(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

function getLocationMajorGroups(locations = getAllLocationsFromData(), items = getItems()) {
  const counts = countBy(items, "locationId");
  const groups = new Map();
  locations.forEach((location) => {
    const label = locationMajorValue(location);
    if (!groups.has(label)) {
      groups.set(label, {
        id: normalizeLocationKey(label) || "major",
        label,
        icon: location.icon || "map",
        type: location.type || inferLocationType(label),
        itemCount: 0,
        locationCount: 0,
        locations: []
      });
    }
    const group = groups.get(label);
    group.locations.push(location);
    group.locationCount += 1;
    group.itemCount += counts.get(location.id) || 0;
  });

  return [...groups.values()].sort((a, b) => {
    const firstA = a.locations[0];
    const firstB = b.locations[0];
    const order = sortLocations(firstA, firstB);
    return order || a.label.localeCompare(b.label, "ko");
  });
}

function ensureSelectedMapMajor(groups = null) {
  const sourceGroups = groups || getLocationMajorGroups();
  if (!sourceGroups.length) {
    state.selectedMapMajor = "";
    return "";
  }
  if (!sourceGroups.some((group) => group.label === state.selectedMapMajor)) {
    state.selectedMapMajor = sourceGroups[0].label;
  }
  return state.selectedMapMajor;
}

function getHierarchySuggestionLists({ major = "", middle = "" } = {}) {
  const locations = getAdminLocations();
  const selectedMajor = cleanText(major);
  const selectedMiddle = cleanText(middle);
  const majors = uniqueSorted(locations.map(locationMajorValue));
  const majorScoped = selectedMajor ? locations.filter((location) => locationMajorValue(location) === selectedMajor) : locations;
  const middles = uniqueSorted(majorScoped.map(locationMiddleValue));
  const middleScoped = selectedMiddle
    ? majorScoped.filter((location) => locationMiddleValue(location) === selectedMiddle)
    : majorScoped;
  const minors = uniqueSorted(middleScoped.map(locationMinorValue));
  return { majors, middles, minors };
}

function populateDatalist(datalist, values) {
  if (!datalist) return;
  datalist.innerHTML = values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function renderHierarchyChips(container, values, fieldName) {
  if (!container) return;
  container.innerHTML = values.length
    ? values.slice(0, 18).map((value) => `<button class="hierarchy-suggestion-chip" type="button" data-location-hierarchy-field="${escapeAttr(fieldName)}" data-location-hierarchy-value="${escapeAttr(value)}">${escapeHtml(value)}</button>`).join("")
    : `<span class="hierarchy-empty">기존 목록 없음</span>`;
}

function updateLocationHierarchyOptions() {
  const major = els.locationGroupInput?.value || "";
  const middle = els.locationMiddleInput?.value || "";
  const { majors, middles, minors } = getHierarchySuggestionLists({ major, middle });
  populateDatalist(els.locationMajorSuggestions, majors);
  populateDatalist(els.locationMiddleSuggestions, middles);
  populateDatalist(els.locationMinorSuggestions, minors);
  renderHierarchyChips(els.locationMajorChips, majors, "major");
  renderHierarchyChips(els.locationMiddleChips, middles, "middle");
  renderHierarchyChips(els.locationMinorChips, minors, "minor");
}

function applyLocationHierarchySuggestion(field, value) {
  if (!value) return;
  if (field === "major" && els.locationGroupInput) els.locationGroupInput.value = value;
  if (field === "middle" && els.locationMiddleInput) els.locationMiddleInput.value = value;
  if (field === "minor" && els.locationSmallInput) els.locationSmallInput.value = value;
  updateLocationHierarchyOptions();
}

function hierarchyParts(location) {
  return [locationMajorValue(location), locationMiddleValue(location), locationMinorValue(location)]
    .map(cleanText)
    .filter(Boolean);
}

function hierarchyText(location, fallback = "미분류 공간") {
  const parts = hierarchyParts(location);
  return parts.length ? parts.join(" › ") : fallback;
}

function locationOptionLabel(location) {
  const sub = hierarchyParts(location).slice(1).join(" › ");
  return sub ? `${sub} · ${location.label}` : location.label;
}

function getConfiguredLocations() {
  const hiddenIds = getHiddenLocationIds();
  const overrides = settingsRaw.locations || {};
  const defaultLocations = DEFAULT_LOCATIONS
    .filter((location) => !hiddenIds.has(location.id))
    .map((location) => normalizeLocationRecord(location.id, overrides[location.id] || {}, { ...location, builtIn: true }));

  const customLocations = Object.entries(overrides)
    .filter(([id]) => !isDefaultLocation(id) && !hiddenIds.has(id))
    .map(([id, raw]) => normalizeLocationRecord(id, raw, { builtIn: false }));

  return [...defaultLocations, ...customLocations].sort(sortLocations);
}

function getAdminLocations() {
  const hiddenIds = getHiddenLocationIds();
  const overrides = settingsRaw.locations || {};
  const defaultLocations = DEFAULT_LOCATIONS.map((location) => ({
    ...normalizeLocationRecord(location.id, overrides[location.id] || {}, { ...location, builtIn: true }),
    hidden: hiddenIds.has(location.id)
  }));
  const customLocations = Object.entries(overrides)
    .filter(([id]) => !isDefaultLocation(id))
    .map(([id, raw]) => ({ ...normalizeLocationRecord(id, raw, { builtIn: false }), hidden: hiddenIds.has(id) }));
  return [...defaultLocations, ...customLocations].sort(sortLocations);
}

function sortLocations(a, b) {
  const orderA = DEFAULT_LOCATIONS.findIndex((location) => location.id === a.id);
  const orderB = DEFAULT_LOCATIONS.findIndex((location) => location.id === b.id);
  const safeA = orderA === -1 ? 1000 : orderA;
  const safeB = orderB === -1 ? 1000 : orderB;
  return safeA - safeB || a.label.localeCompare(b.label, "ko");
}

function getLocation(id) {
  const normalizedId = normalizeLocationId(id);
  const configured = getConfiguredLocations().find((location) => location.id === normalizedId);
  if (configured) return configured;
  const defaultLocation = DEFAULT_LOCATIONS.find((location) => location.id === normalizedId);
  if (defaultLocation) return { ...defaultLocation, hidden: true };
  return {
    id: normalizedId,
    label: normalizedId || "기타",
    group: "기타",
    major: "기타",
    middle: "사용자 데이터",
    minor: "",
    type: inferLocationType(normalizedId),
    icon: "location",
    desc: "사용자 데이터에 존재하는 보관 장소"
  };
}

function getAllLocationsFromData() {
  const locations = getConfiguredLocations();
  const ids = new Set(locations.map((location) => location.id));
  getItems().forEach((item) => ids.add(item.locationId));
  return [...ids].map(getLocation).sort(sortLocations);
}

function getMapLocations() {
  const locations = getAllLocationsFromData();
  const groups = getLocationMajorGroups(locations);
  const selectedMajor = ensureSelectedMapMajor(groups);
  return selectedMajor ? locations.filter((location) => locationMajorValue(location) === selectedMajor) : locations;
}

function ensureSelectedLocation() {
  const locations = getMapLocations();
  if (!locations.some((location) => location.id === state.selectedMapLocation)) {
    state.selectedMapLocation = locations[0]?.id || "etc";
  }
}

function getProject(projectId) {
  return PROJECTS.find((project) => project.id === projectId) || PROJECTS[2];
}

function itemMatchesFilters(item) {
  if (state.locationFilter !== "all" && item.locationId !== state.locationFilter) return false;
  if (state.categoryFilter !== "all" && !item.categories.includes(state.categoryFilter)) return false;
  if (state.projectFilter !== "all") {
    if (state.projectFilter === "field" && !["field", "both"].includes(item.project)) return false;
    else if (state.projectFilter === "greenhouse" && !["greenhouse", "both"].includes(item.project)) return false;
    else if (state.projectFilter === "both" && item.project !== "both") return false;
  }
  if (!state.search) return true;
  return item.searchText.includes(state.search);
}

function getFilteredItems() {
  return getItems().filter(itemMatchesFilters);
}

function renderFilters() {
  const items = getItems();
  const locationCounts = countBy(items, "locationId");
  const categoryCounts = getCategoryCounts(items);
  const visibleLocations = getAllLocationsFromData().filter((location) => {
    const count = locationCounts.get(location.id) || 0;
    return count > 0 || state.locationFilter === location.id || state.selectedMapLocation === location.id;
  });
  const visibleCategories = getActiveCategoryLabels({ includeZero: false, includeHiddenSelected: state.categoryFilter });

  els.locationFilterBar.innerHTML = [
    filterChip("전체", "all", state.locationFilter, "location", items.length, "location-filter"),
    ...visibleLocations.map((location) => filterChip(location.label, location.id, state.locationFilter, location.icon, locationCounts.get(location.id) || 0, "location-filter"))
  ].join("");

  els.projectFilterBar.innerHTML = [
    filterChip("전체", "all", state.projectFilter, "layers", items.length, "project-filter"),
    filterChip("노지", "field", state.projectFilter, "field", items.filter((item) => ["field", "both"].includes(item.project)).length, "project-filter"),
    filterChip("온실", "greenhouse", state.projectFilter, "sprout", items.filter((item) => ["greenhouse", "both"].includes(item.project)).length, "project-filter"),
    filterChip("모두", "both", state.projectFilter, "layers", items.filter((item) => item.project === "both").length, "project-filter")
  ].join("");

  els.categoryFilterBar.innerHTML = [
    filterChip("전체", "all", state.categoryFilter, "tags", items.length, "category-filter"),
    ...visibleCategories.map((category) => filterChip(category, category, state.categoryFilter, "tags", categoryCounts.get(category) || 0, "category-filter"))
  ].join("");
}

function filterChip(label, value, current, iconName, count, dataName) {
  const attr = `data-${dataName}`;
  return `<button class="chip ${current === value ? "active" : ""}" type="button" ${attr}="${escapeAttr(value)}">
    ${icon(iconName)}<span>${escapeHtml(label)}</span><span class="count">${count}</span>
  </button>`;
}

function renderDashboard() {
  const items = getItems();
  const stats = calculateStats(items);
  els.statGrid.innerHTML = [
    statCard("전체 물품", stats.total, `${stats.quantityTotal.toLocaleString()}개 수량`, "boxes"),
    statCard("사용 중인 공간", stats.activeLocations, `${getConfiguredLocations().length}개 관리 장소`, "map"),
    statCard("확인 필요", stats.lowStock, "수량 1개 이하", "alert"),
    statCard("분류 수", stats.categoryCount, "체크형 분류", "tags")
  ].join("");

  const topLocations = getLocationsWithCounts(items).slice(0, 6);
  els.dashboardMap.innerHTML = topLocations.length
    ? topLocations.map(({ location, count }) => miniZone(location, count)).join("")
    : `<div class="empty-note">아직 등록된 물품이 없습니다.</div>`;

  const attention = items.filter((item) => item.qty <= 1).sort((a, b) => a.qty - b.qty).slice(0, 6);
  els.attentionList.innerHTML = attention.length
    ? attention.map(compactItem).join("")
    : `<div class="empty-note">수량 확인이 필요한 물품이 없습니다.</div>`;
}

function calculateStats(items) {
  const activeLocations = new Set(items.map((item) => item.locationId)).size;
  const categories = new Set();
  let quantityTotal = 0;
  let lowStock = 0;
  items.forEach((item) => {
    quantityTotal += item.qty;
    if (item.qty <= 1) lowStock += 1;
    item.categories.forEach((category) => categories.add(category));
  });
  return { total: items.length, quantityTotal, activeLocations, lowStock, categoryCount: categories.size };
}

function statCard(label, value, sub, iconName) {
  return `<article class="stat-card">
    <div class="stat-top"><span>${escapeHtml(label)}</span><span class="stat-icon">${icon(iconName)}</span></div>
    <div class="stat-value">${Number(value).toLocaleString()}</div>
    <div class="stat-sub">${escapeHtml(sub)}</div>
  </article>`;
}

function getLocationsWithCounts(items) {
  const counts = countBy(items, "locationId");
  return getAllLocationsFromData()
    .map((location) => ({ location, count: counts.get(location.id) || 0 }))
    .sort((a, b) => b.count - a.count || a.location.label.localeCompare(b.location.label, "ko"));
}

function miniZone(location, count) {
  return `<button class="mini-zone zone-${escapeAttr(location.type)}" type="button" data-map-location="${escapeAttr(location.id)}">
    <span class="zone-icon">${icon(location.icon)}</span>
    <span class="zone-title">${escapeHtml(location.label)}</span>
    <span class="zone-meta">${count}개 물품 · ${escapeHtml(hierarchyText(location))}</span>
  </button>`;
}

function renderItems() {
  const items = getFilteredItems();
  const total = getItems().length;
  els.listMeta.textContent = `${total.toLocaleString()}개 중 ${items.length.toLocaleString()}개 표시`;
  els.itemGrid.innerHTML = items.length
    ? items.map(itemCard).join("")
    : `<div class="empty-note" style="grid-column: 1 / -1;">조건에 맞는 물품이 없습니다.</div>`;
}

function itemCard(item) {
  const project = getProject(item.project);
  const media = item.img
    ? `<img src="${escapeAttr(item.img)}" alt="${escapeAttr(item.name)}" loading="lazy" decoding="async">`
    : `<div class="card-placeholder" style="background:${placeholderGradient(item.name)}">${escapeHtml(firstChar(item.name))}</div>`;
  const tags = item.categories.length
    ? item.categories.slice(0, 4).map((category) => `<span class="tag-pill">${escapeHtml(category)}</span>`).join("")
    : `<span class="tag-pill">${CATEGORY_NONE}</span>`;

  return `<article class="item-card" data-item-ref="${escapeAttr(item.refKey)}">
    <div class="card-media">
      ${media}
      <div class="card-grad"></div>
      <span class="location-badge">${icon(item.location.icon)}${escapeHtml(item.location.label)}</span>
      <span class="project-badge">${icon(project.icon)}${escapeHtml(project.label)}</span>
      <div class="card-title">${escapeHtml(item.name)}</div>
    </div>
    <div class="card-body">
      <div class="card-info-row">
        <span>📍 ${escapeHtml(item.loc || "세부 위치 미지정")}</span>
        <strong class="qty-pill">${item.qty.toLocaleString()}개</strong>
      </div>
      <div class="category-line">${tags}</div>
      <div class="card-desc">${escapeHtml(item.usage || "물품 상세 설명 없음")}</div>
    </div>
  </article>`;
}

function renderSpaceMap() {
  const items = getItems();
  const counts = countBy(items, "locationId");
  const allLocations = getAllLocationsFromData();
  const majorGroups = getLocationMajorGroups(allLocations, items);
  const selectedMajor = ensureSelectedMapMajor(majorGroups);
  const locations = selectedMajor ? allLocations.filter((location) => locationMajorValue(location) === selectedMajor) : allLocations;

  if (!locations.some((location) => location.id === state.selectedMapLocation)) {
    state.selectedMapLocation = locations[0]?.id || "etc";
  }

  if (els.mapSpaceTabs) {
    els.mapSpaceTabs.innerHTML = majorGroups.length
      ? majorGroups.map((group) => `<button class="space-tab-chip ${state.selectedMapMajor === group.label ? "active" : ""}" type="button" data-map-major="${escapeAttr(group.label)}" title="${escapeAttr(group.label)} 대분류">
          <span class="space-tab-icon">${icon(group.icon)}</span>
          <span>${escapeHtml(group.label)}</span>
          <strong>${group.itemCount.toLocaleString()}</strong>
        </button>`).join("")
      : `<div class="empty-note">대분류가 없습니다. 관리자 화면에서 공간을 추가해주세요.</div>`;
  }

  els.spaceMap.innerHTML = locations.length ? locations.map((location) => {
    const count = counts.get(location.id) || 0;
    const active = state.selectedMapLocation === location.id;
    const typeClass = location.type === "greenhouse" ? "zone-greenhouse" : location.type === "lab" ? "zone-lab" : "zone-common";
    const imageStyle = location.image ? ` style="--zone-image:url('${escapeCssUrl(location.image)}')"` : "";
    const imageLayer = location.image ? `<span class="map-zone-photo" aria-hidden="true"></span>` : "";
    return `<button class="map-zone ${typeClass} zone-${classToken(location.id)} ${location.image ? "has-photo" : ""} ${active ? "active" : ""}" type="button" data-map-location="${escapeAttr(location.id)}"${imageStyle}>
      ${imageLayer}
      <div class="map-zone-main">
        <div>
          <strong>${escapeHtml(location.label)}</strong>
          <span>${escapeHtml(hierarchyText(location))}</span>
        </div>
        <span class="map-zone-icon">${icon(location.icon)}</span>
      </div>
      <div class="map-zone-desc">${escapeHtml(location.desc)}</div>
      <div class="map-zone-bottom">
        <span class="map-count">${count}</span>
        <span class="map-label">items</span>
      </div>
    </button>`;
  }).join("") : `<div class="empty-note">이 대분류에 등록된 공간이 없습니다. 관리자 화면에서 공간을 추가해주세요.</div>`;
}
function renderMapDetail() {
  ensureSelectedLocation();
  const location = getLocation(state.selectedMapLocation);
  const items = getItems().filter((item) => item.locationId === state.selectedMapLocation).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const locationPhoto = location.image
    ? `<img class="map-detail-photo" src="${escapeAttr(location.image)}" alt="${escapeAttr(location.label)} 위치 사진" loading="lazy" decoding="async">`
    : `<div class="map-detail-photo placeholder">${icon("image")}<span>위치 사진 없음</span></div>`;
  els.mapDetailPanel.innerHTML = `<div class="map-detail-head">
      <div>
        <span class="eyebrow">${escapeHtml(hierarchyText(location))}</span>
        <h3>${escapeHtml(location.label)}</h3>
        <p class="map-detail-desc">${escapeHtml(location.desc)}</p>
      </div>
      <span class="zone-icon zone-${escapeAttr(location.type)}">${icon(location.icon)}</span>
    </div>
    ${locationPhoto}
    <button class="btn ghost" type="button" data-location-filter="${escapeAttr(location.id)}">
      ${icon("boxes")}<span>이 장소만 목록에서 보기</span>
    </button>
    <div class="map-detail-list">
      ${items.length ? items.map(compactItem).join("") : `<div class="empty-note">이 장소에 등록된 물품이 없습니다.</div>`}
    </div>`;
}

function compactItem(item) {
  const thumb = item.img
    ? `<img src="${escapeAttr(item.img)}" alt="${escapeAttr(item.name)}" loading="lazy" decoding="async">`
    : escapeHtml(firstChar(item.name));
  return `<button class="compact-item" type="button" data-item-ref="${escapeAttr(item.refKey)}">
    <span class="compact-thumb" style="${item.img ? "" : `background:${placeholderGradient(item.name)}`}">${thumb}</span>
    <span class="compact-main">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.location.label)} · ${escapeHtml(item.loc || "세부 위치 미지정")}</span>
    </span>
    <span class="compact-qty">${item.qty.toLocaleString()}개</span>
  </button>`;
}

function renderCategoryBoard() {
  const records = getCategoryRecords();
  const addPanel = `<article class="category-admin-card editable-only">
    <span class="eyebrow">Category Management</span>
    <h3>분류 추가</h3>
    <p>필터와 물품 등록 화면에 사용할 분류를 관리합니다. 삭제한 분류는 숨김 처리되며 복구할 수 있습니다.</p>
    <div class="inline-add always-inline">
      <input id="categoryAdminInput" type="text" placeholder="예: HPLC 분석 / 흡광도 분석 / 해당 없음" />
      <button class="btn primary small" type="button" data-save-category>추가</button>
    </div>
  </article>`;

  const cards = records.length
    ? records.map(categoryCard).join("")
    : `<div class="empty-note">분류가 없습니다.</div>`;

  els.categoryBoard.innerHTML = addPanel + cards;
}

function categoryCard(record) {
  const status = record.hidden ? "숨김" : record.builtIn ? "기본" : "추가";
  const actions = record.hidden
    ? `<button class="btn primary small editable-only" type="button" data-restore-category="${escapeAttr(record.label)}">복구</button>`
    : `<button class="btn ghost small" type="button" data-category-filter="${escapeAttr(record.label)}">이 분류 보기</button>
       <button class="btn danger small editable-only" type="button" data-delete-category="${escapeAttr(record.label)}">삭제</button>`;
  return `<article class="category-card ${record.hidden ? "is-hidden" : ""}">
    <div class="category-card-top">
      <strong>${escapeHtml(record.label)}</strong>
      <span class="location-kind-badge">${status}</span>
    </div>
    <span>${record.count.toLocaleString()}개 물품에 사용 중</span>
    <div class="category-card-actions">${actions}</div>
  </article>`;
}

function renderAdminPanel() {
  if (!els.adminStatusPanel || !els.locationManageList) return;
  const items = getItems();
  const editable = canEdit();
  const loggedIn = Boolean(currentUser);
  const adminEmails = ADMIN_EMAILS.map((email) => String(email).trim()).filter(Boolean);
  const firebaseIssue = !firebaseReady && firebaseError;
  const statusTitle = firebaseIssue ? "Firebase 연결 실패" : editable ? "관리자 모드" : loggedIn ? "읽기 전용 계정" : "로그인 필요";
  const statusDesc = firebaseIssue
    ? "화면 전환과 테마 변경은 사용할 수 있지만, Google 로그인과 Firebase 저장은 연결 복구 후 가능합니다."
    : editable
      ? "현재 계정은 물품과 공간을 추가·수정·삭제할 수 있습니다."
      : loggedIn
        ? "로그인은 되어 있지만 관리자 이메일 목록에 없는 계정입니다. 조회만 가능합니다."
        : firebaseBooting
          ? "Firebase 연결을 준비하는 중입니다."
          : "Google 관리자 계정으로 로그인하면 편집 기능이 활성화됩니다.";

  const itemsByLocation = items.reduce((acc, item) => {
    if (!acc.has(item.locationId)) acc.set(item.locationId, []);
    acc.get(item.locationId).push(item);
    return acc;
  }, new Map());
  const locations = getAdminLocations();
  if (!locations.some((location) => location.id === state.selectedAdminLocation)) {
    state.selectedAdminLocation = locations.find((location) => !location.hidden)?.id || locations[0]?.id || "";
  }
  const selectedLocation = locations.find((location) => location.id === state.selectedAdminLocation) || locations[0] || null;

  els.adminStatusPanel.innerHTML = `<div class="admin-status-card compact">
    <div class="admin-status-top">
      <span class="admin-status-icon">${icon(editable ? "shield" : "lock")}</span>
      <div>
        <span class="eyebrow">Access Control</span>
        <h3>${statusTitle}</h3>
      </div>
    </div>
    <p>${escapeHtml(statusDesc)}</p>
    <div class="admin-pill-row">
      <span class="admin-pill ${loggedIn ? "ok" : "warn"}">${icon(loggedIn ? "user" : "lock")}${loggedIn ? escapeHtml(currentUser.email || "Google 사용자") : "로그인 안 됨"}</span>
      <span class="admin-pill ${editable ? "ok" : "warn"}">${icon(editable ? "check" : "lock")}${editable ? "편집 가능" : "읽기 전용"}</span>
      <span class="admin-pill">${icon("map")}${getConfiguredLocations().length}개 활성 공간</span>
      <span class="admin-pill">${icon("boxes")}${items.length}개 물품</span>
    </div>
    <div class="admin-note compact-note">
      관리자 이메일: ${adminEmails.length ? escapeHtml(adminEmails.join(", ")) : "ADMIN_EMAILS가 비어 있어 Google 로그인 사용자를 관리자로 처리합니다."}
    </div>
  </div>
  <div class="admin-space-tab-panel">
    <div class="admin-space-tab-head">
      <span class="eyebrow">Spaces</span>
      <strong>공간 탭</strong>
    </div>
    <div class="admin-space-tabs">
      ${locations.length ? locations.map((location) => adminLocationTab(location, itemsByLocation.get(location.id) || [])).join("") : `<div class="empty-note">등록된 공간이 없습니다.</div>`}
    </div>
  </div>`;

  els.locationManageList.innerHTML = selectedLocation
    ? locationManageDetail(selectedLocation, itemsByLocation.get(selectedLocation.id) || [])
    : `<div class="empty-note">왼쪽에서 공간을 선택해주세요.</div>`;
}

function adminLocationTab(location, locationItems) {
  const active = state.selectedAdminLocation === location.id;
  const photo = location.image
    ? `<span class="admin-space-tab-icon has-photo"><img src="${escapeAttr(location.image)}" alt="${escapeAttr(location.label)} 위치 사진" loading="lazy" decoding="async"></span>`
    : `<span class="admin-space-tab-icon">${icon(location.icon)}</span>`;
  return `<button class="admin-space-tab ${active ? "active" : ""} ${location.hidden ? "is-hidden" : ""}" type="button" data-admin-location-tab="${escapeAttr(location.id)}">
    ${photo}
    <span class="admin-space-tab-main">
      <strong>${escapeHtml(location.label)}</strong>
      <em>${escapeHtml(hierarchyText(location))}</em>
    </span>
    <span class="admin-space-tab-count">${locationItems.length.toLocaleString()}</span>
  </button>`;
}

function locationManageDetail(location, locationItems) {
  const count = locationItems.length;
  const kind = location.builtIn ? "기본" : "추가";
  const actions = location.hidden
    ? `<button class="btn primary small editable-only" type="button" data-restore-location="${escapeAttr(location.id)}">복구</button>`
    : `<button class="btn ghost small editable-only" type="button" data-edit-location="${escapeAttr(location.id)}">공간 수정</button>
       <button class="btn danger small editable-only" type="button" data-delete-location="${escapeAttr(location.id)}">공간 삭제</button>`;
  const photo = location.image
    ? `<div class="location-detail-photo"><img src="${escapeAttr(location.image)}" alt="${escapeAttr(location.label)} 위치 사진" loading="lazy" decoding="async"></div>`
    : `<div class="location-detail-photo placeholder">${icon(location.icon)}<span>위치 사진 없음</span></div>`;
  const itemList = count
    ? `<div class="location-item-list detail-list">
        ${locationItems.map(adminLocationItem).join("")}
      </div>`
    : `<div class="location-item-list empty">등록된 물품이 없습니다.</div>`;
  return `<article class="location-manage-detail ${location.hidden ? "is-hidden" : ""}">
    <div class="location-detail-head">
      ${photo}
      <div class="location-detail-main">
        <span class="eyebrow">${escapeHtml(hierarchyText(location))}</span>
        <h3>${escapeHtml(location.label)}</h3>
        <p>${escapeHtml(location.desc)}</p>
        <div class="admin-pill-row">
          <span class="location-kind-badge">${location.hidden ? "숨김" : kind}</span>
          <span class="location-count-badge">${count.toLocaleString()}개 물품</span>
        </div>
      </div>
    </div>
    <div class="location-detail-actions">
      <button class="btn ghost small" type="button" data-location-filter="${escapeAttr(location.id)}">이 공간 물품 보기</button>
      ${actions}
    </div>
    ${itemList}
  </article>`;
}

function adminLocationItem(item) {
  const thumb = item.img
    ? `<img src="${escapeAttr(item.img)}" alt="${escapeAttr(item.name)}" loading="lazy" decoding="async">`
    : escapeHtml(firstChar(item.name));
  return `<button class="location-item-row" type="button" data-item-ref="${escapeAttr(item.refKey)}">
    <span class="location-item-thumb" style="${item.img ? "" : `background:${placeholderGradient(item.name)}`}">${thumb}</span>
    <span class="location-item-main">
      <strong>${escapeHtml(item.name)}</strong>
      <em>${escapeHtml(item.loc || "세부 위치 미지정")}</em>
    </span>
    <span class="location-item-qty">${item.qty.toLocaleString()}개</span>
  </button>`;
}

function openLocationModal(location = null) {
  if (!canEdit()) {
    showDialog("관리자 로그인 필요", "공간을 추가·수정하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  editingLocationId = location?.id || null;
  els.locationModalTitle.textContent = location ? "공간 수정" : "공간 추가";
  els.locationNameInput.value = location?.label || "";
  els.locationGroupInput.value = location?.major || location?.group || state.selectedMapMajor || "기타";
  if (els.locationMiddleInput) els.locationMiddleInput.value = location?.middle || "";
  if (els.locationSmallInput) els.locationSmallInput.value = location?.minor || "";
  if (els.locationTypeSelect) els.locationTypeSelect.value = location?.type || inferLocationType(`${location?.major || location?.group || ""} ${location?.label || ""}`);
  els.locationIconSelect.value = location?.icon || "location";
  els.locationDescInput.value = location?.desc || "";
  tempLocationImageData = location?.image || "";
  els.locationImageUrlInput.value = tempLocationImageData && !String(tempLocationImageData).startsWith("data:") ? tempLocationImageData : "";
  renderLocationImagePreview(tempLocationImageData);
  updateLocationHierarchyOptions();
  openModal("locationModal");
  setTimeout(() => els.locationNameInput.focus(), 50);
}

function setButtonBusy(button, busy, label = "저장 중...") {
  if (!button) return () => {};
  const previousHtml = button.innerHTML;
  const previousDisabled = button.disabled;
  if (busy) {
    button.disabled = true;
    button.innerHTML = label;
  }
  return () => {
    button.disabled = previousDisabled;
    button.innerHTML = previousHtml;
  };
}

async function saveLocation() {
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "공간을 저장하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  const label = els.locationNameInput.value.trim();
  if (!label) {
    showDialog("입력 필요", "공간 이름을 입력해주세요.", { alertOnly: true });
    els.locationNameInput.focus();
    return;
  }

  const id = editingLocationId || createLocationId(label);
  const now = new Date().toISOString();
  const previous = (settingsRaw.locations || {})[id] || {};
  const major = cleanText(els.locationGroupInput.value) || "기타";
  const middle = cleanText(els.locationMiddleInput?.value) || "";
  const minor = cleanText(els.locationSmallInput?.value) || "";
  const autoType = inferLocationType(`${major} ${middle} ${minor} ${label}`);
  const payload = {
    label,
    group: major,
    major,
    middle,
    minor,
    type: autoType,
    icon: els.locationIconSelect.value || "location",
    desc: els.locationDescInput.value.trim() || "사용자 추가 보관 공간",
    image: tempLocationImageData || normalizedUrlValue(els.locationImageUrlInput.value) || null,
    createdAt: previous.createdAt || now,
    createdBy: previous.createdBy || currentUser?.email || "",
    updatedAt: now,
    updatedBy: currentUser?.email || ""
  };

  const restoreSaveButton = setButtonBusy(els.saveLocationBtn, true);
  try {
    await dbSet(`settings/locations/${id}`, payload);
    await dbRemove(`settings/hiddenLocations/${id}`);
    settingsRaw.locations = { ...(settingsRaw.locations || {}), [id]: payload };
    if (settingsRaw.hiddenLocations) delete settingsRaw.hiddenLocations[id];
    invalidateCaches();
    state.selectedMapMajor = major;
    state.selectedMapLocation = id;
    state.selectedAdminLocation = id;
    closeModal("locationModal");
    renderAll();
  } catch (error) {
    showDialog("공간 저장 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
  } finally {
    restoreSaveButton();
  }
}

async function deleteLocation(locationId) {
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "공간을 삭제하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  const location = getLocation(locationId);
  const count = getItems().filter((item) => item.locationId === locationId).length;
  if (count > 0) {
    showDialog("삭제 불가", `「${location.label}」 공간에 등록된 물품이 ${count.toLocaleString()}개 있습니다.
먼저 해당 물품의 보관 장소를 다른 공간으로 옮긴 뒤 삭제해주세요.`, { alertOnly: true });
    return;
  }

  const ok = await showDialog("공간 삭제", `「${location.label}」 공간을 삭제하시겠습니까?`);
  if (!ok) return;

  try {
    if (isDefaultLocation(locationId)) {
      await dbSet(`settings/hiddenLocations/${locationId}`, true);
      settingsRaw.hiddenLocations = { ...(settingsRaw.hiddenLocations || {}), [locationId]: true };
    } else {
      await dbRemove(`settings/locations/${locationId}`);
      if (settingsRaw.locations) delete settingsRaw.locations[locationId];
    }
    if (state.locationFilter === locationId) state.locationFilter = "all";
    if (state.selectedMapLocation === locationId) ensureSelectedLocation();
    if (state.selectedAdminLocation === locationId) state.selectedAdminLocation = getAdminLocations().find((location) => !location.hidden)?.id || "";
    invalidateCaches();
    ensureSelectedMapMajor();
    ensureSelectedLocation();
    renderAll();
  } catch (error) {
    showDialog("공간 삭제 실패", error.message || "Firebase 삭제 중 오류가 발생했습니다.", { alertOnly: true });
  }
}

async function restoreLocation(locationId) {
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "공간을 복구하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  try {
    await dbRemove(`settings/hiddenLocations/${locationId}`);
    if (settingsRaw.hiddenLocations) delete settingsRaw.hiddenLocations[locationId];
    invalidateCaches();
    state.selectedMapMajor = locationMajorValue(getLocation(locationId));
    state.selectedMapLocation = locationId;
    state.selectedAdminLocation = locationId;
    renderAll();
  } catch (error) {
    showDialog("공간 복구 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
  }
}

async function saveCategoryFromBoard() {
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "분류를 추가하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  const input = document.getElementById("categoryAdminInput");
  const label = normalizeCategoryName(input?.value || "");
  if (!label) {
    showDialog("입력 필요", "추가할 분류 이름을 입력해주세요.", { alertOnly: true });
    input?.focus();
    return;
  }

  const id = getCategoryKey(label);
  const now = new Date().toISOString();
  const payload = {
    label,
    createdAt: settingsRaw.categories?.[id]?.createdAt || now,
    createdBy: settingsRaw.categories?.[id]?.createdBy || currentUser?.email || "",
    updatedAt: now,
    updatedBy: currentUser?.email || ""
  };

  try {
    await dbSet(`settings/categories/${id}`, payload);
    await dbRemove(`settings/hiddenCategories/${id}`);
    settingsRaw.categories = { ...(settingsRaw.categories || {}), [id]: payload };
    if (settingsRaw.hiddenCategories) delete settingsRaw.hiddenCategories[id];
    customCategories.add(label);
    if (input) input.value = "";
    renderAll();
  } catch (error) {
    showDialog("분류 저장 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
  }
}

async function deleteCategory(label) {
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "분류를 삭제하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }
  const normalized = normalizeCategoryName(label);
  if (!normalized) return;
  if (normalized === CATEGORY_NONE) {
    const okNone = await showDialog("분류 숨김", "「해당 없음」도 숨길 수 있지만, 분류가 없는 물품은 계속 해당 없음으로 저장됩니다. 숨기시겠습니까?");
    if (!okNone) return;
  } else {
    const count = getCategoryCounts().get(normalized) || 0;
    const ok = await showDialog("분류 삭제", `「${normalized}」 분류를 숨기시겠습니까?${count ? `\n현재 ${count.toLocaleString()}개 물품에 사용 중인 값은 삭제하지 않고 카드 태그로만 유지됩니다.` : ""}`);
    if (!ok) return;
  }

  const id = getCategoryKey(normalized);
  try {
    await dbSet(`settings/hiddenCategories/${id}`, true);
    settingsRaw.hiddenCategories = { ...(settingsRaw.hiddenCategories || {}), [id]: true };
    if (!isDefaultCategory(normalized) && !(getCategoryCounts().get(normalized) || 0)) {
      await dbRemove(`settings/categories/${id}`);
      if (settingsRaw.categories) delete settingsRaw.categories[id];
    }
    if (state.categoryFilter === normalized) state.categoryFilter = "all";
    renderAll();
  } catch (error) {
    showDialog("분류 삭제 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
  }
}

async function restoreCategory(label) {
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "분류를 복구하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }
  const normalized = normalizeCategoryName(label);
  if (!normalized) return;
  const id = getCategoryKey(normalized);
  try {
    await dbRemove(`settings/hiddenCategories/${id}`);
    if (settingsRaw.hiddenCategories) delete settingsRaw.hiddenCategories[id];
    customCategories.add(normalized);
    renderAll();
  } catch (error) {
    showDialog("분류 복구 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
  }
}

function createLocationId(label) {
  const base = normalizeLocationKey(label) || `space-${Date.now()}`;
  const existingIds = new Set(getAdminLocations().map((location) => location.id));
  if (!existingIds.has(base)) return base;
  let index = 2;
  while (existingIds.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function classToken(value) {
  return normalizeLocationKey(value) || "custom";
}

function normalizeLocationKey(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[.#$\/\[\]]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function openItemModal(item = null) {
  if (!item && !canEdit()) {
    showDialog("관리자 로그인 필요", "물품을 등록하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  editingItem = item;
  tempImageData = item?.img || null;
  els.itemImageUrlInput.value = tempImageData && !String(tempImageData).startsWith("data:") ? tempImageData : "";
  els.itemModalTitle.textContent = item ? "물품 상세" : "새 물품 등록";
  els.deleteItemBtn.hidden = !item;

  populateLocationSelect();
  renderProjectOptions(item?.project || "both");
  renderCategoryChecklist(new Set(item ? item.categories : [CATEGORY_NONE]));

  els.itemNameInput.value = item?.name || "";
  els.itemLocationSelect.value = item?.locationId || "greenhouse-storage";
  els.itemDetailLocationInput.value = item?.loc || "";
  els.itemQtyInput.value = item?.qty ?? 1;
  els.itemUsageInput.value = item?.usage || "";
  els.customCategoryInput.value = "";
  renderImagePreview(tempImageData);
  updateFormAccess();
  openModal("itemModal");
  setTimeout(() => els.itemNameInput.focus(), 50);
}

function populateLocationSelect() {
  if (!els.itemLocationSelect) return;
  const previousValue = els.itemLocationSelect.value;
  const grouped = getAllLocationsFromData().reduce((acc, location) => {
    const groupLabel = locationMajorValue(location);
    if (!acc.has(groupLabel)) acc.set(groupLabel, []);
    acc.get(groupLabel).push(location);
    return acc;
  }, new Map());
  els.itemLocationSelect.innerHTML = [...grouped.entries()].map(([group, locations]) => `<optgroup label="${escapeAttr(group)}">
    ${locations.map((location) => `<option value="${escapeAttr(location.id)}">${escapeHtml(locationOptionLabel(location))}</option>`).join("")}
  </optgroup>`).join("");
  if (previousValue && [...els.itemLocationSelect.options].some((option) => option.value === previousValue)) {
    els.itemLocationSelect.value = previousValue;
  }
}

function renderProjectOptions(selectedProject) {
  els.projectSegmented.innerHTML = PROJECTS.map((project) => `<label class="selectable-label ${project.id === selectedProject ? "is-selected" : ""}" tabindex="0" role="button" aria-pressed="${project.id === selectedProject ? "true" : "false"}">
    <input type="radio" name="projectRelation" value="${escapeAttr(project.id)}" ${project.id === selectedProject ? "checked" : ""}>
    <span>${icon(project.icon)}${escapeHtml(project.label)}</span>
  </label>`).join("");
  syncItemModalSelectors();
}

function renderCategoryChecklist(selectedSet = new Set()) {
  selectedSet.forEach((category) => customCategories.add(category));
  const selectedHidden = [...selectedSet].find((category) => isCategoryHidden(category)) || "";
  const categories = getActiveCategoryLabels({ includeZero: true, includeHiddenSelected: selectedHidden });
  els.categoryChecklist.innerHTML = categories.map((category) => `<label class="category-check selectable-label ${selectedSet.has(category) ? "is-selected" : ""} ${isCategoryHidden(category) ? "is-hidden" : ""}" tabindex="0" role="button" aria-pressed="${selectedSet.has(category) ? "true" : "false"}">
    <input type="checkbox" value="${escapeAttr(category)}" ${selectedSet.has(category) ? "checked" : ""}>
    <span>${escapeHtml(category)}${isCategoryHidden(category) ? " · 숨김" : ""}</span>
  </label>`).join("");
  syncItemModalSelectors();
}

function getSelectedCategoriesFromModal() {
  let values = [...els.categoryChecklist.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => normalizeCategoryName(input.value))
    .filter(Boolean);
  values = [...new Set(values)];
  if (values.length > 1 && values.includes(CATEGORY_NONE)) values = values.filter((value) => value !== CATEGORY_NONE);
  return values.length ? values : [CATEGORY_NONE];
}

function handleProjectSegmentClick(event) {
  const label = event.target.closest(".segmented label");
  if (!label || !els.projectSegmented.contains(label)) return;
  const input = label.querySelector("input[type='radio']");
  if (!input) return;
  event.preventDefault();
  event.stopPropagation();
  if (!canEdit()) return;
  // 관리자 전환 직후 기존 disabled 상태가 남아 있어도 선택 가능하도록 즉시 복구합니다.
  input.disabled = false;
  input.checked = true;
  syncItemModalSelectors();
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function handleCategoryCheckClick(event) {
  const label = event.target.closest(".category-check");
  if (!label || !els.categoryChecklist.contains(label)) return;
  const input = label.querySelector("input[type='checkbox']");
  if (!input) return;
  event.preventDefault();
  event.stopPropagation();
  if (!canEdit()) return;
  // 관리자 전환 직후 기존 disabled 상태가 남아 있어도 선택 가능하도록 즉시 복구합니다.
  input.disabled = false;
  input.checked = !input.checked;
  applyCategorySelectionRule(input);
  syncItemModalSelectors();
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function handleSelectableLabelKeydown(event) {
  if (!["Enter", " ", "Spacebar"].includes(event.key)) return;
  const label = event.target.closest(".selectable-label");
  if (!label) return;
  event.preventDefault();
  label.click();
}

function handleCategoryToggle(event) {
  const input = event.target.closest("input[type='checkbox']");
  if (!input) return;
  applyCategorySelectionRule(input);
  syncItemModalSelectors();
}

function applyCategorySelectionRule(input) {
  if (input.value === CATEGORY_NONE && input.checked) {
    els.categoryChecklist.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      if (checkbox.value !== CATEGORY_NONE) checkbox.checked = false;
    });
  } else if (input.checked) {
    const noneInput = [...els.categoryChecklist.querySelectorAll("input[type='checkbox']")].find((checkbox) => checkbox.value === CATEGORY_NONE);
    if (noneInput) noneInput.checked = false;
  }
}

function syncItemModalSelectors() {
  const editable = canEdit();
  if (els.projectSegmented) {
    els.projectSegmented.querySelectorAll("label").forEach((label) => {
      const input = label.querySelector("input[type='radio']");
      if (input && editable) input.disabled = false;
      const selected = Boolean(input?.checked);
      label.classList.toggle("is-selected", selected);
      label.classList.toggle("is-disabled", !editable);
      label.tabIndex = editable ? 0 : -1;
      label.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }
  if (els.categoryChecklist) {
    els.categoryChecklist.querySelectorAll(".category-check").forEach((label) => {
      const input = label.querySelector("input[type='checkbox']");
      if (input && editable) input.disabled = false;
      const selected = Boolean(input?.checked);
      label.classList.toggle("is-selected", selected);
      label.classList.toggle("is-disabled", !editable);
      label.tabIndex = editable ? 0 : -1;
      label.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }
}

function addCategoryFromInput() {
  if (!canEdit()) return;
  const value = normalizeCategoryName(els.customCategoryInput.value);
  if (!value) return;
  customCategories.add(value);
  const selected = new Set(getSelectedCategoriesFromModal());
  if (value !== CATEGORY_NONE) selected.delete(CATEGORY_NONE);
  selected.add(value);
  renderCategoryChecklist(selected);
  els.customCategoryInput.value = "";
}

function updateFormAccess() {
  const editable = canEdit();
  els.readOnlyBadge.textContent = editable ? "관리자 편집 가능" : currentUser ? "읽기 전용 · 관리자 아님" : "읽기 전용 · 로그인 필요";
  const controls = els.itemModal.querySelectorAll("input, textarea, select, button[data-qty-delta]");
  controls.forEach((control) => {
    if (control.id === "itemImageInput") return;
    const isClose = control.matches("[data-close-modal]");
    const isReadOnlyButton = control.classList.contains("compact-item");
    if (!isClose && !isReadOnlyButton) control.disabled = !editable;
  });
  els.itemModal.querySelectorAll(".selectable-label").forEach((label) => {
    label.classList.toggle("is-disabled", !editable);
    label.tabIndex = editable ? 0 : -1;
  });
  syncItemModalSelectors();
  els.locationModal.querySelectorAll("input, textarea, select, button").forEach((control) => {
    const isClose = control.matches("[data-close-modal]");
    if (!isClose) control.disabled = !editable;
  });
}

function renderImagePreview(src) {
  if (src) {
    els.itemImagePreview.src = src;
    els.itemImagePreview.style.display = "block";
    els.itemImagePlaceholder.style.display = "none";
  } else {
    els.itemImagePreview.removeAttribute("src");
    els.itemImagePreview.style.display = "none";
    els.itemImagePlaceholder.style.display = "grid";
  }
}

function renderLocationImagePreview(src) {
  if (!els.locationImagePreview || !els.locationImagePlaceholder) return;
  if (src) {
    els.locationImagePreview.src = src;
    els.locationImagePreview.style.display = "block";
    els.locationImagePlaceholder.style.display = "none";
  } else {
    els.locationImagePreview.removeAttribute("src");
    els.locationImagePreview.style.display = "none";
    els.locationImagePlaceholder.style.display = "grid";
  }
}

async function handleImageSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    tempImageData = await readImageFile(file, 720, 0.72);
    els.itemImageUrlInput.value = "";
    renderImagePreview(tempImageData);
  } catch (error) {
    showDialog("사진 처리 실패", error.message || "이미지를 읽지 못했습니다.", { alertOnly: true });
  } finally {
    event.target.value = "";
  }
}

async function handleLocationImageSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    tempLocationImageData = await readImageFile(file, 960, 0.74);
    els.locationImageUrlInput.value = "";
    renderLocationImagePreview(tempLocationImageData);
  } catch (error) {
    showDialog("사진 처리 실패", error.message || "이미지를 읽지 못했습니다.", { alertOnly: true });
  } finally {
    event.target.value = "";
  }
}

function clearItemImage() {
  if (!canEdit()) return;
  tempImageData = null;
  els.itemImageUrlInput.value = "";
  renderImagePreview(null);
}

function clearLocationImage() {
  if (!canEdit()) return;
  tempLocationImageData = null;
  els.locationImageUrlInput.value = "";
  renderLocationImagePreview(null);
}

function handleItemImageUrlChange() {
  if (!canEdit()) return;
  const value = normalizedUrlValue(els.itemImageUrlInput.value);
  if (value) {
    tempImageData = value;
    renderImagePreview(value);
  } else if (tempImageData && !String(tempImageData).startsWith("data:")) {
    tempImageData = null;
    renderImagePreview(null);
  }
}

function handleLocationImageUrlChange() {
  if (!canEdit()) return;
  const value = normalizedUrlValue(els.locationImageUrlInput.value);
  if (value) {
    tempLocationImageData = value;
    renderLocationImagePreview(value);
  } else if (tempLocationImageData && !String(tempLocationImageData).startsWith("data:")) {
    tempLocationImageData = null;
    renderLocationImagePreview(null);
  }
}

function normalizedUrlValue(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (clean.startsWith("data:image/")) return clean;
  try {
    const url = new URL(clean);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch (_) {
    return "";
  }
  return "";
}

function preferredImageMime() {
  if (webpSupported !== null) return webpSupported ? "image/webp" : "image/jpeg";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch (_) {
    webpSupported = false;
  }
  return webpSupported ? "image/webp" : "image/jpeg";
}

function readImageFile(file, maxSize = 720, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("이미지 파일만 업로드할 수 있습니다."));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    image.onload = () => {
      try {
        let { width, height } = image;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, width, height);

        const mime = preferredImageMime();
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("이미지 압축에 실패했습니다."));
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("압축 이미지를 읽지 못했습니다."));
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        }, mime, quality);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    image.src = objectUrl;
  });
}

function changeQty(delta) {
  if (!canEdit()) return;
  const current = Number(els.itemQtyInput.value) || 0;
  els.itemQtyInput.value = Math.max(0, current + delta);
}

async function saveItem() {
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "저장하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  const name = els.itemNameInput.value.trim();
  if (!name) {
    showDialog("입력 필요", "물품 이름을 입력해주세요.", { alertOnly: true });
    els.itemNameInput.focus();
    return;
  }

  let categories = getSelectedCategoriesFromModal();
  if (!categories.length) categories = [CATEGORY_NONE];
  categories.forEach((category) => customCategories.add(category));

  const targetLocation = els.itemLocationSelect.value || "etc";
  const now = new Date().toISOString();
  const itemId = editingItem?.id || String(Date.now());
  const projectInput = els.projectSegmented.querySelector("input[name='projectRelation']:checked");
  const payload = {
    name,
    qty: Math.max(0, Number(els.itemQtyInput.value) || 0),
    loc: els.itemDetailLocationInput.value.trim(),
    usage: els.itemUsageInput.value.trim(),
    locationId: targetLocation,
    project: projectInput?.value || "both",
    categories,
    cat: categories[0],
    img: tempImageData || normalizedUrlValue(els.itemImageUrlInput.value) || null,
    updatedAt: now,
    updatedBy: currentUser?.email || ""
  };
  if (editingItem?.createdAt) payload.createdAt = editingItem.createdAt;
  else payload.createdAt = now;

  const restoreSaveButton = setButtonBusy(els.saveItemBtn, true);
  try {
    if (editingItem && editingItem.sourcePath !== targetLocation) {
      await dbRemove(`inventory/${editingItem.sourcePath}/${editingItem.id}`);
    }
    await dbSet(`inventory/${targetLocation}/${itemId}`, payload);
    closeModal("itemModal");
  } catch (error) {
    showDialog("저장 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
  } finally {
    restoreSaveButton();
  }
}

async function deleteItem() {
  if (!editingItem) return;
  if (!canEdit()) {
    showDialog("관리자 권한 필요", "삭제하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }
  const ok = await showDialog("삭제 확인", `「${editingItem.name}」 물품을 삭제하시겠습니까?`);
  if (!ok) return;
  try {
    await dbRemove(`inventory/${editingItem.sourcePath}/${editingItem.id}`);
    closeModal("itemModal");
  } catch (error) {
    showDialog("삭제 실패", error.message || "Firebase 삭제 중 오류가 발생했습니다.", { alertOnly: true });
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  if (id === "itemModal") {
    editingItem = null;
    tempImageData = null;
  }
  if (id === "locationModal") {
    editingLocationId = null;
    tempLocationImageData = null;
  }
}

function showDialog(title, message, options = {}) {
  els.dialogTitle.textContent = title;
  els.dialogMessage.textContent = message;
  els.dialogCancelBtn.hidden = Boolean(options.alertOnly);
  openModal("dialogModal");
  return new Promise((resolve) => {
    dialogResolver = resolve;
  });
}

function closeDialog(result) {
  closeModal("dialogModal");
  if (dialogResolver) {
    dialogResolver(result);
    dialogResolver = null;
  }
}

function findItemByRef(refKey) {
  return getItems().find((item) => item.refKey === refKey);
}

function countBy(items, key) {
  const map = new Map();
  items.forEach((item) => map.set(item[key], (map.get(item[key]) || 0) + 1));
  return map;
}

function firstChar(value) {
  return String(value || "?").trim().charAt(0).toUpperCase() || "?";
}

function initials(value) {
  const clean = String(value || "G").trim();
  if (clean.includes("@")) return clean.charAt(0).toUpperCase();
  return clean.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "G";
}

function placeholderGradient(value) {
  const gradients = [
    "linear-gradient(135deg, #0ea5e9, #2563eb)",
    "linear-gradient(135deg, #10b981, #047857)",
    "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    "linear-gradient(135deg, #f59e0b, #b45309)",
    "linear-gradient(135deg, #ec4899, #be185d)",
    "linear-gradient(135deg, #64748b, #334155)"
  ];
  let hash = 0;
  String(value || "").split("").forEach((char) => { hash = char.charCodeAt(0) + ((hash << 5) - hash); });
  return gradients[Math.abs(hash) % gradients.length];
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function escapeCssUrl(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "");
}

function icon(name) {
  return SVG[name] || SVG.box;
}

init();
