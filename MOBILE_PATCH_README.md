# Mobile Patch 적용본

## 적용 내용

1. 모바일 폭(≤860px)에서 사이드바를 `display: none`으로 없애지 않고 슬라이드 드로어로 전환했습니다.
2. 사이드바 내부 햄버거 버튼은 부모 `transform`의 영향을 받아 같이 밀릴 수 있으므로, `#mobileSidebarToggle` 독립 버튼을 본문에 추가했습니다.
3. 모바일 첫 진입 시 사이드바가 본문을 덮지 않도록 기본 닫힘 상태로 정리합니다.
4. 백드롭/사이드바 바깥 탭, ESC 키, 사이드바 메뉴 선택 시 자동으로 닫힙니다.
5. 한국어 단어 깨짐 방지, 카드/모달/공간 맵 1열 배치, iOS 안전영역, 가로 스크롤 방지 보정을 적용했습니다.

## 적용 파일

- `styles.mobile.patch.css`
- `mobile-drawer.js`
- `index.html` 안의 `#mobileSidebarToggle` 버튼

## 캐시 주의

적용 후 아래 방식으로 강력 새로고침하세요.

- macOS: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`

모바일 Safari에서 변경이 늦게 보이면 Safari의 기록 및 웹사이트 데이터를 지운 뒤 다시 확인하세요.
