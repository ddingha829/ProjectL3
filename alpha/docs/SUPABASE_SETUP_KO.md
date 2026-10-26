# L2 통합판 — 기존 Supabase 연결 현황

갱신: 2026-10-26. 새 프로젝트를 만들지 않고 기존 tcsdhfkicbbxizurdfrd 프로젝트를 재사용한다.

## 사용자 진행 현황

- 실제 이메일/비밀번호 가입 및 휴대폰의 기본 기능 확인 완료.
- 기존 계정 연결과 데이터 이전은 취소했다. 아이디·이메일·비밀번호를 전달할 필요가 없다.
- 모임 생성·초대·공유·수정 반영은 별도 검증 계정으로 확인한다.

Supabase 프로젝트 생성, DB 비밀번호 재설정, API 키 전달, SQL 수동 실행은 지금 필요하지 않다.

## 적용된 구조

- supabase/migrations/20261026_001_unified.sql: l2u_profiles, groups, members, logs, shares, comments, reactions, preferences, mosaic, invites, operations, schema_migrations.
- 002_sync_events.sql: 실시간 변경 알림, 본인 탈퇴 상태 확인, 조회 인덱스.
- 003_media_proxy.sql: TMDB/책 포스터의 신뢰된 동일 출처 프록시 경로 허용.
- 004_kick_invites.sql: 강퇴 시 이전 초대 링크를 만료해 같은 링크로 즉시 재가입하는 것을 차단한다.
- 005_invite_codes.sql: 모임 생성 시 6자리 코드 자동 발급, 호스트 조회·재발급, 코드 입력 참여, 만료·강퇴 시 무효화 및 계정별 입력 제한. 코드와 시도 횟수는 비공개 스키마에서 RLS로 보호한다.
- 기존 l2_profiles/l2_archives/l2_ai_usage, Ticgle 테이블 및 기존 버킷은 삭제하거나 구조를 바꾸지 않았다.
- l2u-photos는 비공개 버킷이다. WebP 300KiB 제한 및 소유자 경로 정책을 적용했다. 기존 Ticgle의 광범위 INSERT 정책은 새 버킷에 한해서 restrictive 정책으로 제한한다.

## 인증·저장

- Supabase 이메일/비밀번호 인증. 현재 프로젝트의 기존 autoconfirm=true를 확인했으며 이메일 설정 자체는 바꾸지 않았다. Google 로그인은 비활성 상태다.
- 앱에는 공개 연결 URL·anon/publishable 키만 등록한다. service_role 키를 브라우저나 Sites 서버에 등록하지 않는다.
- 서버 설정은 SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, L2_UNIFIED_BACKEND=enabled. /api/backend/config는 키의 anon 역할을 확인한 뒤 공개용 값만 응답한다.
- 실제 계정은 예시 localStorage와 분리된 상태를 사용하고, 예시 인물·모임·로그를 자동으로 서버에 올리지 않는다.
- 새 로그의 개인 원본은 작성자에게 남고, 선택한 여러 모임에 하나의 원본을 공유한다. 원본 수정은 해당 모임에 반영된다.
- 저장은 화면에 먼저 반영하면서 계정별 임시 작업을 기기에 보관한다. 서버 확인 전에는 저장 중으로 표시한다. 실패 시 재시도 또는 임시 JSON 백업 후 최신 서버 상태 불러오기를 제공한다.
- 작업 UUID로 재시도를 중복 실행하지 않는다. 로그·설정 revision 검사로 다른 기기의 새 내용을 조용히 덮어쓰지 않는다.
- 실시간 이벤트는 데이터로 신뢰하지 않고 권한 안에서 다시 조회하는 신호로만 사용한다. 30초 간격 및 화면 복귀 시 재조회가 보완한다.
- 파일은 이미 압축 기준을 충족하면 재압축하지 않는다. 사진 경로만 영구 저장하고 60초 유효한 서명 URL을 화면에 사용한다. 이미 내려받은 사진은 회수할 수 없으며 기존 서명 URL도 만료 전까지 유효할 수 있다.

## 모임·타일 규칙

- 모임장 설정 정원 1~20명. 생성 직후 6자리 영문·숫자 초대 코드를 보여준다. 로그인 후 상단 범위 선택의 ‘코드로 참여 · 모임 만들기’에서 입력하면 즉시 참여한다.
- 코드는 7일 유효하며 호스트가 재발급하면 이전 코드가 만료된다. 혼동하기 쉬운 I/O/0/1은 발급하지 않는다. 입력은 대소문자를 구분하지 않는다.
- 잘못된 입력도 계정별로 누적하며 1분 10회·하루 100회를 제한한다. 기존 링크는 호환용으로만 유지하고 화면에서는 코드를 기본으로 사용한다.
- 새 모임원도 그 모임에 남은 과거 공유를 볼 수 있다.
- 탈퇴 시 본인이, 강퇴 시 모임장이 기존 공유 로그를 남길지 숨길지 선택한다. 개인 원본은 삭제하지 않는다.
- 다른 모임원이 있을 때 모임장 탈퇴는 막는다. 모임장 양도 UI/정책은 별도 결정 후 추가한다.
- 작품 연결 로그만 타일 후보다. 내 로그만 배치·이동하고 공동 보드의 다른 사람 칸은 덮어쓰지 못한다. 개인 자리 교환은 트랜잭션으로 처리한다.

## 검증

- npm run test:db: 네트워크 없는 PGlite 격리 DB 권한/트랜잭션 테스트.
- scripts/qa-cloud-api.mjs: 실제 서버용 별도 검사. L2_ALLOW_LIVE_QA=yes와 L2_TEST_ENV_FILE을 명시해야 하며 검증 전용 계정만 사용한다. 자격 증명은 .test-data/에만 두고 Git에 포함하지 않는다.
- supabase/schema-test-result.json 및 live-api-test-result.json은 계정 비밀이나 실제 기록 없이 검사 결과만 보관한다.

## 기존 데이터 보관 (이전 취소)

- 사용자 최종 결정: 기존 계정과 기록은 통합판에 연결하지 않고 새 기록부터 시작한다. 소유자 매핑을 요청하거나 이전을 실행하지 않는다.

- 검증한 백업 기준 원본 28개는 일반 로그 26개와 기존 LIST 묶음 2개로 구분된다.
- 7개 아이디 계정과 4개 익명 기기 프로필, 총 11개 소유자의 기록은 기존 백업에 보관하며 새 계정에 귀속하지 않는다.
- scripts/prepare-legacy-import.mjs는 오프라인 변환안과 소유자 매핑 CSV만 생성한다. 네트워크 호출·DB 쓰기·삭제는 없다.
- 취소 전 준비한 변환안은 백업 폴더 migration/unified-plan/에 비공개 보관만 한다. 실제 데이터 변환·이전에는 사용하지 않는다.
- 신규 통합판 실사용 검증 후 기존 개인용 Vercel 주소 교체를 진행한다. Ticgle 삭제는 별도 검토 목록 승인 전 수행하지 않는다.

## 공식 문서

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/auth/general-configuration
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/serving/downloads
