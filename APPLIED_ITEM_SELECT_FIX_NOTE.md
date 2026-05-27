# Item modal selection fix

관리자 모드에서 물품 상세 모달의 과제 연관성 라디오와 분류 체크 칩이 클릭되지 않는 문제를 보정했습니다.

## 수정 내용
- 과제 연관성/분류 칩 클릭을 label 기본 동작에만 맡기지 않고 JS에서 직접 토글합니다.
- 관리자 전환 직후 이전 disabled 상태가 남아 있어도 클릭 시 즉시 disabled를 해제합니다.
- Firebase auth 상태 변경 중 모달이 열려 있어도 updateFormAccess()가 다시 실행되도록 했습니다.
- 선택 상태를 is-selected/aria-pressed로 동기화합니다.
- 라벨/칩 포인터 영역을 CSS로 보강했습니다.
