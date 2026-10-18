# 티켓 포스터 · 공유 이미지 누락 수정 (2026-10-18)

## 변경

- TICKET의 고정 사진 높이와 자동 footer 여백을 제거했다. 사진이 남는 높이를 차지하고, 제목/한줄평/NOTE/하단 정보를 작게 묶는다. 테스트 예시에서 9:16 사진 높이는 290px → 약 456px, 3:4는 185px → 약 271px이다. 내용량에 따라 가변이다.
- 티켓 사진은 `object-fit:contain`으로 포스터 전체를 보존한다. 포스터와 영역의 종횡비가 다르면 양옆 또는 상하에 배경이 남는다.
- TICKET은 3:4와 9:16만 지원한다. 카드/스튜디오 공용 세부사항의 1:1 버튼을 비활성화한다. 기존 1:1 티켓은 정규화/실제 렌더링에서 기본 9:16으로 표시되며, 다른 디자인의 1:1은 유지한다.
- 내보내기 전 사진 원본을 CORS fetch → 검증 → data URI로 만든 별도 스냅샷에 넣고 decode를 기다린다. 실제 카드의 원본 URL/크롭은 바꾸지 않는다. 라이브러리 내부의 실패한 사진 placeholder 캐시를 우회한다.
- SVG 생성 후 직접 캔버스에 그린다. WebKit은 동일한 SVG를 예열 후 다시 그려, 외부 사진/foreignObject 첫 렌더 누락을 보강한다. 사진 fetch/decode가 실패하면 오류로 처리하며 빈 카드 공유 성공으로 보고하지 않는다. 임시 DOM은 성공/실패 시 제거한다.
- 출력 JPEG 너비 1080px 이하, 500KiB 이하 제한을 유지한다. TMDB는 외부 링크 그대로 저장하며 서버 사진 업로드는 추가하지 않는다.

## 검증

- `npm run build`, `test:repository`: 통과.
- `test:ticket-export`: 실제 TMDB 포스터 bytes를 캐시한 fixture로 TICKET 9:16/3:4 및 INSTA 1:1을 공유했다. JPEG 사진 영역의 픽셀과 원본 포스터의 일치를 검사했다. 티켓 사진 높이/NOTE 아래 여백/1:1 비활성화/기존 1:1 정규화/원본 URL 불변/임시 DOM 정리/1080px·500KiB 제한을 검사했다.
- 사진은 화면에 보이지만 export fetch만 503이 되는 상황에서 공유 버튼이 준비 완료되지 않고 오류가 표시됨을 확인했다. 재시도로 포스터 포함 공유가 복구되었다.
- Chrome 일반 경로 및 Safari user-agent를 사용한 예열 코드 분기를 검사한 뒤, **실제 Playwright WebKit 27.2 엔진(Windows)에서도 두 세로 비율의 포스터 픽셀, 실패/재시도, 긴 제목·한줄평·GOOD/BAD/NOTE의 footer 잘림 방지를 통과했다.** 실제 iPhone의 Safari 앱/네이티브 공유창은 추가 기기 확인 대상이다.
- 선택적 `scripts/test_ticket_webkit.mjs`는 Playwright/WebKit이 설치된 QA 환경에서 실행한다. 앱 런타임 의존성은 추가하지 않았다. 별도 설치 경로를 쓰려면 `L2_PLAYWRIGHT_PATH`에 Playwright `index.mjs`의 절대 경로를 지정한다.
- `test:preset-workflows`, `test:guides-studio`: 카드별 변경/저장·보관함·세부사항·공유 데이터·가이드·팔레트/반응형 회귀 통과.
- `test:card-exports`: 모든 20종 / 지원 비율 59개 조합 JPEG 내보내기 통과. 티켓 1:1 제거로 60 → 59개이다.

## 근거

외부 이미지가 앱에서 보이지만 Safari 출력에서 비는 증상은 라이브러리 저장소에 보고되어 있다. 사용자 첨부 사진만으로 원인을 확정하지는 않았으며 외부 사진 임베딩과 WebKit 첫 렌더 경로를 함께 보강했다.

- https://github.com/bubkoo/html-to-image/issues/348
- https://github.com/bubkoo/html-to-image/issues/488
- https://github.com/bubkoo/html-to-image#imageplaceholder
