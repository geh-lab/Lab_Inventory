# Mobile Patch 적용 확인

이 패키지는 기존 라이트 모드 패치 적용본에 모바일 드로어 패치를 추가한 버전입니다.

## 확인한 사항

- `index.html`에 `styles.mobile.patch.css` 링크가 추가되어 있습니다.
- `index.html`에 본문 독립 햄버거 버튼 `#mobileSidebarToggle`이 추가되어 있습니다.
- `index.html`에 `mobile-drawer.js`가 `app.js` 다음에 로드되도록 추가되어 있습니다.
- `mobile-drawer.js`는 백드롭 탭, ESC, 메뉴 선택 자동 닫힘을 처리합니다.
- 기존 `styles.css`는 라이트 모드 패치가 병합된 전체 CSS 상태를 유지합니다.

## 테스트 권장

```bash
python3 -m http.server 5500
```

브라우저에서 `http://localhost:5500` 접속 후, 개발자도구 모바일 폭 또는 실제 휴대폰에서 확인하세요.
