# Vercel 통합판 이관 — 2026-10-26

## 범위

Sites 통합 UI를 표준 Next.js 앱으로 옮겨 기존 Vercel 프로젝트의 Preview에서 검증한다. 개인용 Production은 이 단계에서 변경하지 않는다. 기존 계정·로그 이전은 사용자 요청에 따라 진행하지 않는다.

## 보존

- 개인용 원본: C:/Users/User/Desktop/ProjectL3 (master, 기준 3b5c659).
- 별도 작업본: C:/Users/User/Documents/Codex/worktrees/ProjectL3-unified-vercel, 브랜치 codex/unified-vercel.
- 미커밋 개인용 코드·폰트·기준 alpha 백업: C:/Users/User/Documents/Codex/backups/projectl3-source-before-unified-20261026.
- 통합 UI 기준: Sites 버전 15, 커밋 4ab04d7.
- 기존 Supabase 전체 백업은 별도 보존하며 Ticgle 데이터는 삭제하지 않는다.

## 배포 구성

- 기존 Vercel project-l3, Root Directory alpha, Framework Next.js, Node 24.x.
- Cloudflare/Vinext/D1 의존을 제거하고 next build --webpack 및 Next.js Route Handler로 실행한다.
- 외부 API 키는 서버 전용. Preview 환경 변수는 codex/unified-vercel 브랜치에 한정한다. Production 값은 유지한다.
- Supabase migration 20261026_006_vercel_integrations.sql 적용 완료. 기존 로그·계정 데이터는 변경하지 않고 서버 사용량·캐시 전용 테이블/RPC만 추가했다. RPC는 service_role만 실행할 수 있다.
- Gemini는 브라우저 쿠키별 하루 20회, 원자적 예약과 영속 캐시로 관리한다.
- PWA의 기존 / 식별자·/sw.js 주소를 유지한다. 새 서비스 워커는 이전 l2-test-shell-* 캐시만 정리하며 IndexedDB·로그·설정은 삭제하지 않는다. 오프라인 편집 기능을 새로 제공하는 변경은 아니다.
- Next.js 내부 주소와 공개 요청 주소가 달라도 정상 요청이 허용되도록 실제 Host 기준으로 검증하고, 교차 사이트 요청 차단을 유지했다.
- .env.local, .vercel, 빌드 캐시, node_modules, 테스트 결과 work, legacy는 업로드에서 제외한다.

## 검증

- Next.js 프로덕션 빌드 성공.
- DB 권한·그룹·초대·API 저장소 테스트 49개 통과.
- 날씨 테스트 10개, 요청 출처 테스트 7개 통과.
- 실제 Supabase 사용량/캐시·익명 접근 차단 테스트 6개 통과.
- 실제 HTTP API 테스트 11개 통과: TMDB, 책, 주소 변환, 주변 장소, 날씨, 이미지 프록시, Gemini 요약, 공개 설정 키 범위, 교차 사이트 차단.
- 업로드 후보 파일과 클라이언트 번들에서 서버 비밀 키 노출 없음.
- 실제 기기의 카메라·GPS·설치 앱 업데이트·공유 시트는 Preview에서 최종 확인한다.

## Preview 배포 완료

- 고정 브랜치 주소: https://project-l3-git-codex-unified-vercel-ddingha829s-projects.vercel.app/
- 검증 배포: https://project-l3-7l9inpflr-ddingha829s-projects.vercel.app/ (소스 04ab0b1).
- 배포 서버 API·PWA 13개 검사 통과. Gemini는 실제 AI 응답/캐시를 확인했다.
- 브라우저 예시 계정 진입·카드 확대·플립·편집/공유 메뉴 및 이미지 다운로드 확인. 예시 앞면은 1080×1920, 413,767바이트로 저장됐다.
- Vercel 접근 보호를 유지한다. 미리보기 접속 시 기존 Vercel 계정 로그인이 필요할 수 있다.
- Production은 master의 기존 3b5c659 배포를 유지한다.

## 전환 순서

1. 이 브랜치만 GitHub에 푸시하고 Vercel Preview를 생성한다.
2. Preview의 서버 API 및 로그인/피드/카드/내보내기를 확인한다.
3. 휴대폰에서 실제 계정 로그인, 사진 촬영·앨범, 위치·날씨, 로그 등록, 모임 코드 참여·공유, 카드 저장을 확인한다.
4. 확인 후 통합판을 Production으로 승격하여 기존 주소를 교체한다. 이 문서 작성 단계에서는 승격하지 않는다.
5. 문제 발생 시 기존 Production 배포로 롤백한다. DB는 추가 테이블 방식이어서 기존 개인용 앱 스키마를 삭제·변환하지 않는다.
