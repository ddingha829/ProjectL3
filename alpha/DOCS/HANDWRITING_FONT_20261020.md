# 손글씨 글꼴 옵션 (2026-10-20)

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
