# ProjectL3 — L2. 기록의 맛 (Alpha & Legacy)

감각적인 경험 아카이빙과 카카오톡·인스타그램 공유용 명함/포스터 카드 엔진 **L2.** 저장소입니다.

## 📁 폴더 구조

- **`alpha/`** — **현재 정식 Alpha 버전 (PWA 배포 대상)**
  - 좌우 스와이프 내비게이션 (`+ 로그` ↔ `로그북` ↔ `스튜디오` ↔ `설정`)
  - 카드 길게 누르기(Long-press) 스포트라이트 확대 & 빠른 수정/삭제
  - 로그북 목록 상세 정보 보강 (별점·카테고리·한 줄 평 프리뷰 + On/Off 토글)
  - 지도 미연결 기록 제목 기반 원탭 좌표 자동 연결 (+ On/Off 토글)
  - 구글 지도 (`Saved Places.json`) 가져오기 & 노션 마크다운 / 구글 지도 CSV / JSON 백업 내보내기
  - PWA 홈 화면 설치 배너 (`beforeinstallprompt` 원탭 설치) 및 iOS/Android/인앱브라우저 설치 가이드 내장
- **`legacy/`** — 이전 작업 버전 아카이브

## 🚀 Vercel 배포 설정 안내

Vercel에서 `ProjectL3` 저장소를 Import 할 때:
1. **Root Directory** 항목 옆의 `Edit` 버튼을 클릭하고 **`alpha`** 폴더를 선택해 주세요.
2. Framework Preset은 자동으로 **Next.js**로 인식됩니다.
3. (선택) 환경 변수(`Environment Variables`) 설정:
   - 환경 변수를 설정하지 않아도 로컬 폴백(내장 장소 사전·로컬 요약·로컬 팔레트·IndexedDB/파일 저장소)으로 모든 기능을 즉시 테스트할 수 있습니다.
   - 실제 외부 API 연동 시 `alpha/.env.example`에 적힌 키(`GEMINI_API_KEY`, `KAKAO_REST_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 등)를 추가해 주세요.
