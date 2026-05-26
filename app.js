import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
  { id: "greenhouse-storage", label: "온실-창고", group: "온실권역", type: "greenhouse", icon: "warehouse", desc: "상토, 비료, 농자재, 온실 작업 도구 보관" },
  { id: "greenhouse", label: "온실", group: "온실권역", type: "greenhouse", icon: "sprout", desc: "온실 재배·처리·생육조사 관련 물품" },
  { id: "office", label: "사무실", group: "공용/관리", type: "common", icon: "desk", desc: "문서, 노트북, 라벨지, 행정/공용 물품" },
  { id: "lab-storage", label: "실험실-창고", group: "실험실권역", type: "lab", icon: "archive", desc: "실험 소모품, 예비 장비, 보관 박스" },
  { id: "lab", label: "실험실", group: "실험실권역", type: "lab", icon: "flask", desc: "실험대, 분석, 전처리 관련 물품" },
  { id: "instrument", label: "공동기기실", group: "실험실권역", type: "lab", icon: "microscope", desc: "공동 장비, 계측기, 분석 장비" },
  { id: "ktng", label: "KT&G", group: "외부/협력", type: "common", icon: "building", desc: "외부 협력 장소 또는 KT&G 관련 보관 물품" },
  { id: "second-floor", label: "2층", group: "건물", type: "common", icon: "stairs", desc: "2층 공간 및 임시 보관 구역" },
  { id: "etc", label: "기타", group: "기타", type: "common", icon: "more", desc: "아직 세부 위치를 정하지 않은 물품" }
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
  selectedMapLocation: "greenhouse-storage"
};

let inventoryRaw = {};
let settingsRaw = { locations: {}, hiddenLocations: {} };
let customCategories = new Set(DEFAULT_CATEGORIES);
let currentUser = null;
let editingItem = null;
let editingLocationId = null;
let tempImageData = null;
let dialogResolver = null;

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const els = {
  sidebarToggle: document.getElementById("sidebarToggle"),
  searchInput: document.getElementById("searchInput"),
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
  imagePickBtn: document.getElementById("imagePickBtn"),
  saveItemBtn: document.getElementById("saveItemBtn"),
  deleteItemBtn: document.getElementById("deleteItemBtn"),
  readOnlyBadge: document.getElementById("readOnlyBadge"),
  locationModal: document.getElementById("locationModal"),
  locationModalTitle: document.getElementById("locationModalTitle"),
  locationNameInput: document.getElementById("locationNameInput"),
  locationGroupInput: document.getElementById("locationGroupInput"),
  locationTypeSelect: document.getElementById("locationTypeSelect"),
  locationIconSelect: document.getElementById("locationIconSelect"),
  locationDescInput: document.getElementById("locationDescInput"),
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
  hydrateIcons();
  populateLocationSelect();
  bindEvents();
  restoreSidebarState();
  watchAuth();
  watchInventory();
  watchSettings();
  renderAll();
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    const key = node.dataset.icon;
    node.innerHTML = icon(key);
  });
}

function bindEvents() {
  els.sidebarToggle.addEventListener("click", toggleSidebar);
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderAll();
  });
  els.authBtn.addEventListener("click", handleAuthClick);
  document.getElementById("addItemBtn").addEventListener("click", () => openItemModal());
  document.querySelectorAll("[data-open-add]").forEach((btn) => btn.addEventListener("click", () => openItemModal()));
  els.imagePickBtn.addEventListener("click", () => els.itemImageInput.click());
  els.itemImageInput.addEventListener("change", handleImageSelect);
  els.addCategoryBtn.addEventListener("click", addCategoryFromInput);
  els.categoryChecklist.addEventListener("change", handleCategoryToggle);
  els.saveLocationBtn.addEventListener("click", saveLocation);
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

    const mapZone = event.target.closest("[data-map-location]");
    if (mapZone) {
      state.selectedMapLocation = mapZone.dataset.mapLocation;
      setView("map");
      renderSpaceMap();
      renderMapDetail();
    }

    const openLocationBtn = event.target.closest("[data-open-location-modal]");
    if (openLocationBtn) openLocationModal();

    const editLocationBtn = event.target.closest("[data-edit-location]");
    if (editLocationBtn) openLocationModal(getLocation(editLocationBtn.dataset.editLocation));

    const deleteLocationBtn = event.target.closest("[data-delete-location]");
    if (deleteLocationBtn) deleteLocation(deleteLocationBtn.dataset.deleteLocation);

    const restoreLocationBtn = event.target.closest("[data-restore-location]");
    if (restoreLocationBtn) restoreLocation(restoreLocationBtn.dataset.restoreLocation);

    const qtyBtn = event.target.closest("[data-qty-delta]");
    if (qtyBtn) {
      const delta = Number(qtyBtn.dataset.qtyDelta) || 0;
      changeQty(delta);
    }
  });

  document.addEventListener("keydown", (event) => {
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

function watchAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    updateAuthUI();
    updateFormAccess();
    renderAdminPanel();
  });
}

function watchInventory() {
  const dbRef = ref(db, "inventory");
  onValue(dbRef, (snapshot) => {
    inventoryRaw = snapshot.val() || {};
    rebuildCategorySet();
    renderAll();
  }, (error) => {
    showDialog("데이터 읽기 오류", `Firebase에서 데이터를 불러오지 못했습니다.
${error.message}`, { alertOnly: true });
  });
}

function watchSettings() {
  const dbRef = ref(db, "settings");
  onValue(dbRef, (snapshot) => {
    const value = snapshot.val() || {};
    settingsRaw = {
      locations: value.locations || {},
      hiddenLocations: value.hiddenLocations || {}
    };
    renderAll();
  }, (error) => {
    showDialog("설정 읽기 오류", `Firebase에서 공간 설정을 불러오지 못했습니다.
${error.message}`, { alertOnly: true });
  });
}

async function handleAuthClick() {
  if (currentUser) {
    const ok = await showDialog("로그아웃", "현재 Google 계정에서 로그아웃하시겠습니까?");
    if (ok) signOut(auth);
    return;
  }

  try {
    await signInWithPopup(auth, provider);
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
    els.authBtnText.textContent = "Google 로그인";
    els.authMiniTitle.textContent = "로그인 필요";
    els.authMiniSub.textContent = "관리자 계정으로 편집";
    els.authAvatar.textContent = "G";
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

function getItems() {
  const items = [];
  Object.entries(inventoryRaw || {}).forEach(([bucketId, bucketValue]) => {
    if (!bucketValue || typeof bucketValue !== "object" || Array.isArray(bucketValue)) return;
    Object.entries(bucketValue).forEach(([id, raw]) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      if (!("name" in raw) && !("qty" in raw) && !("usage" in raw)) return;
      items.push(normalizeItem(id, bucketId, raw));
    });
  });
  return items;
}

function normalizeItem(id, sourcePath, raw) {
  const locationId = normalizeLocationId(raw.locationId || sourcePath);
  const categories = normalizeCategories(raw.categories, raw.cat);
  const project = normalizeProject(raw.project || raw.relation || raw.projectRelation);
  return {
    ...raw,
    id,
    sourcePath,
    refKey: `${sourcePath}/${id}`,
    locationId,
    location: getLocation(locationId),
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
  getItems().forEach((item) => item.categories.forEach((category) => customCategories.add(category)));
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
  const type = ["greenhouse", "lab", "common"].includes(raw.type || fallback.type) ? (raw.type || fallback.type) : "common";
  const iconName = SVG[raw.icon || fallback.icon] ? (raw.icon || fallback.icon) : "location";
  return {
    ...fallback,
    ...raw,
    id,
    label: raw.label || fallback.label || id || "이름 없는 공간",
    group: raw.group || fallback.group || "사용자 추가",
    type,
    icon: iconName,
    desc: raw.desc || fallback.desc || "사용자 추가 보관 공간"
  };
}

function getConfiguredLocations() {
  const hiddenIds = getHiddenLocationIds();
  const overrides = settingsRaw.locations || {};
  const defaultLocations = DEFAULT_LOCATIONS
    .filter((location) => !hiddenIds.has(location.id))
    .map((location) => normalizeLocationRecord(location.id, overrides[location.id] || {}, { ...location, builtIn: true }));

  const customLocations = Object.entries(overrides)
    .filter(([id]) => !isDefaultLocation(id))
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
    .map(([id, raw]) => ({ ...normalizeLocationRecord(id, raw, { builtIn: false }), hidden: false }));
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
    group: "사용자 추가",
    type: "common",
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
  return getAllLocationsFromData();
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
  const haystack = [
    item.name,
    item.loc,
    item.usage,
    item.location.label,
    item.location.group,
    getProject(item.project).label,
    ...item.categories
  ].join(" ").toLowerCase();
  return haystack.includes(state.search);
}

function getFilteredItems() {
  return getItems().filter(itemMatchesFilters).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

function renderFilters() {
  const items = getItems();
  const locationCounts = countBy(items, "locationId");
  const categoryCounts = new Map();
  items.forEach((item) => item.categories.forEach((category) => categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)));

  els.locationFilterBar.innerHTML = [
    filterChip("전체", "all", state.locationFilter, "location", items.length, "location-filter"),
    ...getAllLocationsFromData().map((location) => filterChip(location.label, location.id, state.locationFilter, location.icon, locationCounts.get(location.id) || 0, "location-filter"))
  ].join("");

  els.projectFilterBar.innerHTML = [
    filterChip("전체", "all", state.projectFilter, "layers", items.length, "project-filter"),
    filterChip("노지", "field", state.projectFilter, "field", items.filter((item) => ["field", "both"].includes(item.project)).length, "project-filter"),
    filterChip("온실", "greenhouse", state.projectFilter, "sprout", items.filter((item) => ["greenhouse", "both"].includes(item.project)).length, "project-filter"),
    filterChip("모두", "both", state.projectFilter, "layers", items.filter((item) => item.project === "both").length, "project-filter")
  ].join("");

  els.categoryFilterBar.innerHTML = [
    filterChip("전체", "all", state.categoryFilter, "tags", items.length, "category-filter"),
    ...[...customCategories].sort((a, b) => a.localeCompare(b, "ko")).map((category) => filterChip(category, category, state.categoryFilter, "tags", categoryCounts.get(category) || 0, "category-filter"))
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
    <span class="zone-meta">${count}개 물품 · ${escapeHtml(location.group)}</span>
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
    ? `<img src="${escapeAttr(item.img)}" alt="${escapeAttr(item.name)}">`
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
  els.spaceMap.innerHTML = getMapLocations().map((location) => {
    const count = counts.get(location.id) || 0;
    const active = state.selectedMapLocation === location.id;
    const typeClass = location.type === "greenhouse" ? "zone-greenhouse" : location.type === "lab" ? "zone-lab" : "zone-common";
    return `<button class="map-zone ${typeClass} zone-${classToken(location.id)} ${active ? "active" : ""}" type="button" data-map-location="${escapeAttr(location.id)}">
      <div class="map-zone-main">
        <div>
          <strong>${escapeHtml(location.label)}</strong>
          <span>${escapeHtml(location.desc)}</span>
        </div>
        <span class="map-zone-icon">${icon(location.icon)}</span>
      </div>
      <div class="map-zone-bottom">
        <span class="map-count">${count}</span>
        <span class="map-label">items</span>
      </div>
    </button>`;
  }).join("");
}

function renderMapDetail() {
  const location = getLocation(state.selectedMapLocation);
  const items = getItems().filter((item) => item.locationId === state.selectedMapLocation).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  els.mapDetailPanel.innerHTML = `<div class="map-detail-head">
      <div>
        <span class="eyebrow">${escapeHtml(location.group)}</span>
        <h3>${escapeHtml(location.label)}</h3>
        <p class="map-detail-desc">${escapeHtml(location.desc)}</p>
      </div>
      <span class="zone-icon zone-${escapeAttr(location.type)}">${icon(location.icon)}</span>
    </div>
    <button class="btn ghost" type="button" data-location-filter="${escapeAttr(location.id)}">
      ${icon("boxes")}<span>이 장소만 목록에서 보기</span>
    </button>
    <div class="map-detail-list">
      ${items.length ? items.map(compactItem).join("") : `<div class="empty-note">이 장소에 등록된 물품이 없습니다.</div>`}
    </div>`;
}

function compactItem(item) {
  const thumb = item.img
    ? `<img src="${escapeAttr(item.img)}" alt="${escapeAttr(item.name)}">`
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
  const items = getItems();
  const counts = new Map();
  items.forEach((item) => item.categories.forEach((category) => counts.set(category, (counts.get(category) || 0) + 1)));
  const categories = [...customCategories].sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b, "ko"));
  els.categoryBoard.innerHTML = categories.length
    ? categories.map((category) => `<article class="category-card">
        <strong>${escapeHtml(category)}</strong>
        <span>${(counts.get(category) || 0).toLocaleString()}개 물품에 사용 중</span>
        <button class="btn ghost small" type="button" data-category-filter="${escapeAttr(category)}">이 분류 보기</button>
      </article>`).join("")
    : `<div class="empty-note">분류가 없습니다.</div>`;
}

function renderAdminPanel() {
  if (!els.adminStatusPanel || !els.locationManageList) return;
  const items = getItems();
  const editable = canEdit();
  const loggedIn = Boolean(currentUser);
  const adminEmails = ADMIN_EMAILS.map((email) => String(email).trim()).filter(Boolean);
  const statusTitle = editable ? "관리자 모드" : loggedIn ? "읽기 전용 계정" : "로그인 필요";
  const statusDesc = editable
    ? "현재 계정은 물품과 공간을 추가·수정·삭제할 수 있습니다."
    : loggedIn
      ? "로그인은 되어 있지만 관리자 이메일 목록에 없는 계정입니다. 조회만 가능합니다."
      : "Google 관리자 계정으로 로그인하면 편집 기능이 활성화됩니다.";

  els.adminStatusPanel.innerHTML = `<div class="admin-status-card">
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
    <div class="admin-note">
      관리자 이메일: ${adminEmails.length ? escapeHtml(adminEmails.join(", ")) : "현재 ADMIN_EMAILS가 비어 있어 테스트 편의상 Google 로그인 사용자를 관리자로 처리합니다."}<br>
      실제 배포 시에는 app.js의 ADMIN_EMAILS와 Firebase Realtime Database 쓰기 규칙을 같은 관리자 이메일 기준으로 맞추는 것을 권장합니다.
    </div>
  </div>`;

  const counts = countBy(items, "locationId");
  const locations = getAdminLocations();
  els.locationManageList.innerHTML = locations.length
    ? locations.map((location) => locationManageCard(location, counts.get(location.id) || 0)).join("")
    : `<div class="empty-note">등록된 공간이 없습니다.</div>`;
}

function locationManageCard(location, count) {
  const hiddenClass = location.hidden ? " is-hidden" : "";
  const kind = location.builtIn ? "기본" : "추가";
  const actions = location.hidden
    ? `<button class="btn primary small editable-only" type="button" data-restore-location="${escapeAttr(location.id)}">복구</button>`
    : `<button class="btn ghost small editable-only" type="button" data-edit-location="${escapeAttr(location.id)}">수정</button>
       <button class="btn danger small editable-only" type="button" data-delete-location="${escapeAttr(location.id)}">삭제</button>`;
  return `<article class="location-manage-card${hiddenClass}">
    <span class="location-manage-icon">${icon(location.icon)}</span>
    <div class="location-manage-main">
      <strong>${escapeHtml(location.label)} <span class="location-kind-badge">${location.hidden ? "숨김" : kind}</span></strong>
      <span>${escapeHtml(location.group)} · ${escapeHtml(location.desc)}</span>
    </div>
    <div class="location-actions">
      <span class="location-count-badge">${count.toLocaleString()}개 물품</span>
      ${actions}
    </div>
  </article>`;
}

function openLocationModal(location = null) {
  if (!canEdit()) {
    showDialog("관리자 로그인 필요", "공간을 추가·수정하려면 관리자 Google 계정으로 로그인해주세요.", { alertOnly: true });
    return;
  }

  editingLocationId = location?.id || null;
  els.locationModalTitle.textContent = location ? "공간 수정" : "공간 추가";
  els.locationNameInput.value = location?.label || "";
  els.locationGroupInput.value = location?.group || "기타";
  els.locationTypeSelect.value = location?.type || "common";
  els.locationIconSelect.value = location?.icon || "location";
  els.locationDescInput.value = location?.desc || "";
  openModal("locationModal");
  setTimeout(() => els.locationNameInput.focus(), 50);
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
  const payload = {
    label,
    group: els.locationGroupInput.value.trim() || "기타",
    type: els.locationTypeSelect.value || "common",
    icon: els.locationIconSelect.value || "location",
    desc: els.locationDescInput.value.trim() || "사용자 추가 보관 공간",
    createdAt: previous.createdAt || now,
    createdBy: previous.createdBy || currentUser?.email || "",
    updatedAt: now,
    updatedBy: currentUser?.email || ""
  };

  try {
    await set(ref(db, `settings/locations/${id}`), payload);
    await remove(ref(db, `settings/hiddenLocations/${id}`));
    state.selectedMapLocation = id;
    closeModal("locationModal");
  } catch (error) {
    showDialog("공간 저장 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
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
      await set(ref(db, `settings/hiddenLocations/${locationId}`), true);
    } else {
      await remove(ref(db, `settings/locations/${locationId}`));
    }
    if (state.locationFilter === locationId) state.locationFilter = "all";
    if (state.selectedMapLocation === locationId) ensureSelectedLocation();
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
    await remove(ref(db, `settings/hiddenLocations/${locationId}`));
    state.selectedMapLocation = locationId;
  } catch (error) {
    showDialog("공간 복구 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
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
  const grouped = getAllLocationsFromData().reduce((acc, location) => {
    if (!acc.has(location.group)) acc.set(location.group, []);
    acc.get(location.group).push(location);
    return acc;
  }, new Map());
  els.itemLocationSelect.innerHTML = [...grouped.entries()].map(([group, locations]) => `<optgroup label="${escapeAttr(group)}">
    ${locations.map((location) => `<option value="${escapeAttr(location.id)}">${escapeHtml(location.label)}</option>`).join("")}
  </optgroup>`).join("");
}

function renderProjectOptions(selectedProject) {
  els.projectSegmented.innerHTML = PROJECTS.map((project) => `<label>
    <input type="radio" name="projectRelation" value="${escapeAttr(project.id)}" ${project.id === selectedProject ? "checked" : ""}>
    <span>${icon(project.icon)}${escapeHtml(project.label)}</span>
  </label>`).join("");
}

function renderCategoryChecklist(selectedSet = new Set()) {
  const categories = [...customCategories].sort((a, b) => a.localeCompare(b, "ko"));
  els.categoryChecklist.innerHTML = categories.map((category) => `<label class="category-check">
    <input type="checkbox" value="${escapeAttr(category)}" ${selectedSet.has(category) ? "checked" : ""}>
    <span>${escapeHtml(category)}</span>
  </label>`).join("");
}

function getSelectedCategoriesFromModal() {
  let values = [...els.categoryChecklist.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => normalizeCategoryName(input.value))
    .filter(Boolean);
  values = [...new Set(values)];
  if (values.length > 1 && values.includes(CATEGORY_NONE)) values = values.filter((value) => value !== CATEGORY_NONE);
  return values.length ? values : [CATEGORY_NONE];
}

function handleCategoryToggle(event) {
  const input = event.target.closest("input[type='checkbox']");
  if (!input) return;
  if (input.value === CATEGORY_NONE && input.checked) {
    els.categoryChecklist.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      if (checkbox.value !== CATEGORY_NONE) checkbox.checked = false;
    });
  } else if (input.checked) {
    const noneInput = [...els.categoryChecklist.querySelectorAll("input[type='checkbox']")].find((checkbox) => checkbox.value === CATEGORY_NONE);
    if (noneInput) noneInput.checked = false;
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

function handleImageSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (readerEvent) => {
    const image = new Image();
    image.onload = () => {
      const maxSize = 900;
      let { width, height } = image;
      if (width > height && width > maxSize) {
        height = Math.round(height * maxSize / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round(width * maxSize / height);
        height = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, width, height);
      tempImageData = canvas.toDataURL("image/jpeg", 0.82);
      renderImagePreview(tempImageData);
    };
    image.src = readerEvent.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = "";
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
    img: tempImageData || null,
    updatedAt: now,
    updatedBy: currentUser?.email || ""
  };
  if (editingItem?.createdAt) payload.createdAt = editingItem.createdAt;
  else payload.createdAt = now;

  try {
    if (editingItem && editingItem.sourcePath !== targetLocation) {
      await remove(ref(db, `inventory/${editingItem.sourcePath}/${editingItem.id}`));
    }
    await set(ref(db, `inventory/${targetLocation}/${itemId}`), payload);
    closeModal("itemModal");
  } catch (error) {
    showDialog("저장 실패", error.message || "Firebase 저장 중 오류가 발생했습니다.", { alertOnly: true });
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
    await remove(ref(db, `inventory/${editingItem.sourcePath}/${editingItem.id}`));
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

function icon(name) {
  return SVG[name] || SVG.box;
}

init();
