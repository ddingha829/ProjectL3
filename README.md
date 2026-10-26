# ProjectL3 — L2 통합판

개인 기록과 초대 모임 공유를 한 앱으로 통합하는 알파 버전입니다.

- alpha/: Next.js 앱. 피드·지도·타일·스튜디오, 양면 카드, 이메일 가입, 6자리 모임 초대.
- alpha/supabase/migrations/: 계정·로그·모임·권한 및 서버 API 사용량/캐시 SQL.
- legacy/: 이전 아카이브. Vercel 업로드에서 제외.

기존 Vercel project-l3의 Root Directory는 alpha입니다. codex/unified-vercel 브랜치에서 Preview를 검증하며, 검증 완료 전에는 개인용 Production을 교체하지 않습니다.

로컬 실행: alpha에서 npm ci, .env.example을 참고한 .env.local 구성, npm run dev. 비밀 키는 서버 환경 변수에만 보관합니다.

[이관 상태와 검증·전환 절차](alpha/docs/VERCEL_MIGRATION_KO.md)
