# 손글씨 글꼴 옵션 (2026-10-20)

## 2026-10-21 가독성 보강 · 또박 손글씨

- 기존 `손글씨`(Gaegu)의 본문/작은 UI도 실제 Bold 파일을 사용한다. CSS 가중치 100–1000을 한 Bold 윤곽에 연결하며, 기존 112% 크기 보정은 유지했다. 글자에 인공 외곽선을 덧그리지 않고 실제 굵은 폰트로 표시한다. Regular 파일은 비교와 기존 오프라인 호환을 위해 보존한다.
- 설정의 글꼴 선택에 `또박 손글씨`(Single Day)를 추가했다. 2×2 선택 배치, 최소 44px 버튼, 현재 선택 미리보기, 기존 글꼴 복귀를 지원한다. 새로고침 전 HTML 초기화/React 복원 모두 `single-day`를 허용한다. 기존 Gaegu 선택을 자동으로 다른 글꼴로 바꾸지 않는다.
- Single Day는 Google Fonts의 공식 `ofl/singleday/SingleDay-Regular.ttf`를 전체 글리프 WOFF2로 변환한 92,768바이트 로컬 파일이다. 한글 11,172음절을 포함한다. 원래 Regular 윤곽을 UI 가중치 범위에 연결한 것이며 가변 굵기 파일은 아니다. 110% 크기 보정을 적용했다.
- 출처: https://github.com/google/fonts/tree/main/ofl/singleday . Copyright 2015 DXKorea Inc.; SIL OFL 1.1 전문을 `public/fonts/SingleDay-OFL.txt`에 보관한다. 별도 런타임 패키지나 외부 폰트 서비스 호출은 없다.
- 공유 PNG에 Single Day와 Sebang 대체 글꼴을 포함하고 글꼴 변경 시 기존 파일을 다시 준비한다. 로그·프리셋·계정 데이터 형식은 변경하지 않는다. PWA v9는 새 파일도 미리 저장한다.
- `npm run build`, `npm run typecheck`, Chrome/Playwright WebKit `test:handwriting`, 격리된 실제 오프라인 `test:pwa` 통과. 동일 문장의 24px 캔버스 비교에서 Gaegu의 알파 면적은 Chrome 약 25.7%, WebKit 약 25.0% 증가했다. 이는 획 굵기를 확인한 렌더링 측정이며 사용자 가독성 평가 수치는 아니다.
- 320–1280px 선택 버튼, 기본/두 손글씨 간 전환, 각 선택의 새로고침 복원, 작은 날짜/본문/드문 한글이 실제 PNG 픽셀에 존재하는지, 1080px/500KiB/투명 모서리, 오프라인 글꼴 로딩을 검사했다. API fixture와 격리 저장소만 사용했다. 비교 화면과 내보낸 카드는 로컬 `outputs/oct21/handwriting-readability/`에 있다.

- 설정 > 화면 · 프로필 > 글꼴에 **손글씨 (개구/Gaegu)** 추가. 기존 세방고딕·기존(Pretendard) 선택과 초기 기본값은 유지한다.
- 공식 Google Fonts의 Regular/Bold를 모든 글리프를 보존한 WOFF2로 변환해 로컬 제공한다. 새 런타임 의존성이나 외부 폰트 서비스 호출은 추가하지 않는다. 작은 UI 글자의 시인성을 위해 size-adjust:112%를 적용한다.
- 현재 기기의 l2_font_family에 저장하고 첫 HTML 표시와 React 복원 모두 같은 선택을 사용한다. 화면·입력 문구·카드에 적용한다. 데이터/프리셋 JSON에는 글꼴 선택을 추가하지 않는다.
- 공유 이미지 준비는 글꼴 변경 시 무효화하고 재생성한다. Gaegu와 드문 한글 음절용 Sebang 대체 글꼴을 함께 포함한다. Gaegu는 한글 2,350자를 지원한다. 글꼴 변경 외에 기존 투명 PNG 공유 방식은 변경하지 않았다.
- PWA 캐시 v8은 두 손글씨 파일도 저장한다. 오프라인 로딩을 검증했다.

## 출처

- https://github.com/google/fonts/tree/main/ofl/gaegu
- https://raw.githubusercontent.com/google/fonts/main/ofl/gaegu/METADATA.pb
- https://raw.githubusercontent.com/google/fonts/main/ofl/gaegu/OFL.txt
- Copyright 2018 The Gaegu Project Authors. SIL OFL 1.1 전문은 public/fonts/Gaegu-OFL.txt.
- UI/UX Pro Max 검색에서는 맞는 한글 손글씨 후보를 찾지 못해 일반 가독성 원칙만 참고했고, 실제 폰트는 위 공식 자료로 확인했다.

## 검증

- npm run build: 통과.
- test:handwriting: Chrome 및 실제 Playwright WebKit에서 320/390/768/1280px 설정 버튼 배치, 즉시 적용, 첫 문구, 새로고침 후 유지, 기존 글꼴 복귀, 같은 카드의 글꼴 변경 후 공유 PNG 갱신을 확인했다. PNG의 글꼴 포함, 한글 대체 글꼴, 1080px/500KiB 제한과 투명 모서리도 확인했다. API는 로컬 모의 데이터만 사용했다.
- test:pwa: 캐시된 두 손글씨 두께의 오프라인 로딩, 기존 오프라인 기록 저장/재연결, PNG 워커를 확인했다. 사용자 운영 로그는 변경하지 않았다.

## 같은 날 서버 연결 후속 확인

- Gemini 서버 키는 이후 사용자가 지정한 새 키로 로컬 및 Vercel Production/Preview에 교체했다. 운영 재배포 후 /api/media/summary가 HTTP 200/source=ai를 반환했다. 키 값은 Git에 포함하지 않는다.
- Google Places 결제 연결 재확인 후 운영 /api/places/search가 googleStatus=ready/GOOGLE_PLACES와 리움미술관 실제 좌표를 반환했다. 그 원본 응답을 사용해 분리된 로컬 저장소에서 선택/저장/새로고침/OSM 지도 핀/카드 열기까지 검증했다. 이전 billing_required 상태는 해소됐다.

## 카드 편집 진입 표시 후속

- 모바일의 큰 문구/테두리 안내를 제거하고 낮은 대비의 위쪽 세 갈매기표 애니메이션만 표시한다. 동일한 48px 터치 버튼과 aria-label, 키보드 진입은 유지한다. 모션 끄기/감소 설정을 따른다.
- 메뉴가 열린 상태에서 카드의 짧은 탭 또는 Enter/Space는 메뉴를 접고 큰 카드로 복귀한다. 10px 이상 드래그/스와이프나 길게 누르기는 탭으로 취급하지 않는다. 디자인 초안과 3D 탭 반응은 유지한다. PC·태블릿의 좌우 배치는 유지한다. 초기 가이드도 맞췄다.
- Chrome에서 새 손글씨의 작은 본문이 최초 SVG 캡처에 간헐적으로 누락되는 것을 시각 검수에서 발견했다. 기존 WebKit 전용 동일-SVG 준비 후 재그리기를 모든 엔진으로 확장했다. 테스트는 날짜·본문·드문 한글이 있는 영역의 실제 PNG 픽셀까지 검사한다.

## 카드 편집 진입 · 대기 3D 움직임 추가 요청

- 앞선 낮은 대비 표시를 보강했다. 화살표는 17px에서 25px로 키우고 대비·선 굵기를 높였으며, 텍스트 없이 아래에서 위로 순차적으로 움직인다. 닫힌 상태 터치 영역은 최소 58px, 열린 상태는 44px이다.
- 모바일에서는 짧은 카드 탭 또는 Enter/Space로 수정 메뉴를 열고 접는다. 10px 이상 이동한 스와이프는 탭으로 처리하지 않는다. 760px 이상 화면은 기존 왼쪽 카드/오른쪽 메뉴를 유지한다. 가이드도 갱신했다.
- 카드 내부 깊이 레이어에 8초 주기의 작은 회전과 상하 이동을 추가했다. 포인터 반응과 독립적으로 동작하며, 누르는 동안/문서가 숨겨진 동안 일시 정지한다. 모션 끄기와 시스템 모션 감소를 따른다. 카드 뒷면은 추가하지 않았다.
- 애니메이션은 캡처 대상 밖에 있어 공유 파일에 원근·광택·그림자가 포함되지 않는다.
- npm run build, test:oct20-browser 및 test:handwriting을 Chrome/실제 Playwright WebKit에서 통과했다. 대기 중 변환값 변화, 실제 터치 탭 양방향 전환, 수직 스와이프, 키보드, 모션 설정, 태블릿/PC 배치, 공유 PNG의 본문/날짜/투명 모서리를 확인했다. 운영 사용자 데이터는 변경하지 않았다. 실제 iPhone 카카오톡 환경은 자동화 WebKit 검증과 구분한다.
