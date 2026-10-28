# 피드 첫 실행 시 플로팅 배경이 남는 문제

## 재현과 원인

배포 버전 efd853b에서 메뉴로 복귀한 피드는 `scrollTop=0 / data-pinned=false`이지만, 전체 재로딩 직후에는 `scrollTop=0 / data-pinned=true`로 재현했다. 재현 후 실제 markerTop과 ownerTop은 모두 56px, sticky top은 0px였다. 현재 위치와 맞지 않는 초기 판정이 남아 있었다.

FeedToolbar의 자식 effect가 부모 useAppViewport의 공통 화면 레이아웃 적용보다 먼저 실행된다. 이때는 toolbar의 임시 sticky top이 56px + safe-area이고 흐름 마커는 더 위에 있으므로, 실제 스크롤 없이도 pinned=true가 된다. CSS가 적용되며 본문과 sticky top이 바뀌어도 기존 코드는 scroll/viewport 이벤트만 기다려 잘못된 상태가 유지됐다. 메뉴를 옮겼다 돌아오면 이미 공통 레이아웃이 완성돼 정상으로 판정됐다.

## 수정

`watchFeedToolbarPinned`에서 실제 스크롤 소유자를 함께 판정한다. 본문 scrollTop이 1px 이하이면 임시 레이아웃 위치와 관계없이 pinned=false다. 실제로 스크롤한 경우에는 기존처럼 마커가 sticky 경계를 지났는지 확인한다.

첫 프레임 재측정과 본문/toolbar ResizeObserver를 추가하고, 앱 프레임 갱신·pageshow·visualViewport 변경에도 다시 측정한다. 피드를 떠날 때 observer와 이벤트, 대기 중인 animation frame을 정리한다. 스크롤한 피드로 복귀하는 경우의 플로팅과 기존 스타일·크기·위치는 유지한다.

## 검증

- `npm run test:feed-toolbar`: 13개 회귀 통과. 부모 레이아웃 적용 전 첫 실행, safe-area 배치 후 재측정, 실제 본문 스크롤, 최상단 복귀, 창 스크롤과 본문 스크롤 구분, subpixel 흔들림, pageshow 복원, resize, 해제 후 대기 작업 정리를 검증한다.
- `npm run test:viewport`: 기존 20개 회귀 통과.
- 실제 브라우저 393×793: 첫 실행 false/0, 실제 스크롤 true/270, 위로 복귀 false/0. 최상단에서 메뉴 왕복 후 false/0, 스크롤한 피드에서 메뉴 왕복 후 true/270, 재로딩 후 false/0.
- 재현 화면 `.test-data/feed-initial-pinned-before.png`, 로컬 수정 화면 `.test-data/feed-initial-pinned-after-local.png`.

실제 iPhone 설치 앱에서의 후속 확인은 사용자 기기에서 필요하지만, 동일한 초기 실행 결함 자체는 일반 브라우저에서도 재현하고 수정했다.
