# Mobile Admin Grid Fix 적용 메모

## 적용 일자
2026-05-28c 패치 기준

## 적용 내용

1. `styles.mobile.patch.css`를 2026-05-28c 버전으로 교체했습니다.
2. 모바일/태블릿 폭에서 관리자 화면의 `.admin-grid`가 다시 2열로 덮어써지던 문제를 막기 위해 아래 규칙이 포함되었습니다.
   - `@media (max-width: 1180px) { .admin-grid { grid-template-columns: 1fr !important; } }`
   - `.admin-status-panel`의 sticky 상태 해제
   - `.location-manage-list`, `.admin-space-tab-panel`, `.location-manage-detail`의 `width/min-width/max-width` 보정
3. 기존 독립 모바일 햄버거 버튼 `#mobileSidebarToggle` 보정 규칙을 유지했습니다. 업로드된 2026-05-28c 패치 원문은 `.sidebar-toggle` 중심이라, 독립 버튼을 계속 쓰기 위해 별도 하드닝 블록을 맨 아래에 추가했습니다.
4. `index.html`의 캐시 무효화 버전을 `styles.mobile.patch.css?v=20260528c`, `mobile-drawer.js?v=20260528c`로 변경했습니다.

## 확인 방법

- 모바일 또는 브라우저 개발자도구에서 860px 이하로 줄입니다.
- 관리자 탭에 들어가서 좌측 상태 패널과 우측 공간 관리 패널이 한 줄 세로 배치로 보이는지 확인합니다.
- 좌상단 햄버거 버튼, 백드롭 탭 닫기, ESC 닫기, 메뉴 선택 후 자동 닫기가 유지되는지 확인합니다.
