# 초대 코드 첫 안내와 가입 오류 안내 — 2026-10-30

## 동작
- 실제 계정이 닉네임 설정을 마친 뒤, 참여한 모임이 없고 첫 안내를 처리하지 않았으면 초대 코드 팝업 표시.
- 기존 GroupCodeJoin/RPC를 재사용. 처리 중 중복 요청과 나중에 선택 차단. 성공 시 해당 모임 피드로 진입.
- 상단 내 티끌/모임 이름에서 언제든 코드 참여 및 모임 생성 가능하다는 안내 제공.
- 나중에 또는 성공 처리한 사실을 계정 preferences.groupIntroSeen으로 저장. 재로그인/다른 기기에도 적용. 기존 모임이 있는 사람과 예시 계정은 자동 팝업 대상 제외.
- 최초 사용 가이드/알림 팝업과 중복되지 않게 우선순위 조정.
- 가입 오류: Supabase의 weak_password 응답을 모두 길이 오류로 바꾸던 매핑 수정. SDK reasons(length/characters/pwned) 및 이전 서버 메시지를 구분하고, 가입 입력란에 흔한/유출 비밀번호 제한 사전 안내.

## 확인한 사실
- 대상 이메일은 현재 인증 계정 목록에 없음. 최근 연속 /signup 422 인증 로그에는 Password is known to be weak and easy to guess, please choose a different one. 표시. 비밀번호 원문을 조회/수집하지 않음.
- 서버 이메일 가입 최소 길이 6, 유출 비밀번호 방지 켜짐. 설정 변경 없음.
- 별도 생성한 일회용 QA 이메일에 임의 6자/12자 비밀번호로 실제 signup 성공 및 세션 발급 확인. 해당 QA 계정만 정확한 ID/이메일 검증 후 삭제. 기존 사용자/그룹 변경 없음.

## 검증
- group welcome preferences/파싱/보존 검사 11개, nickname 회귀 20개, notification onboarding 18개, auth messages 14개 통과.
- 393px 브라우저에서 임시 로컬 UI fixture로 오류→재입력→성공 및 나중에 확인. fixture는 제품 빌드 전 제거.
- TypeScript 및 production build 통과. 실제 iPhone 키보드와 친구의 새 비밀번호 재시도는 사용자 확인 필요.
