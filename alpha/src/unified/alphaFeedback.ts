export type AlphaView='logs'|'map'|'mosaic'|'studio'|'compose'|'login'|'other';
export const ALPHA_VIEWS:Record<AlphaView,string>={logs:'피드',map:'지도',mosaic:'타일',studio:'스튜디오',compose:'로그 작성·수정',login:'가입·로그인',other:'기타'};
export const ALPHA_INVITATION=`기록 앱 알파테스트에 초대해요.
https://project-l3-nine.vercel.app/

이메일과 비밀번호로 가입하면 바로 사용할 수 있어요. 실제 저장·모임 테스트는 ‘먼저 둘러보기’ 대신 가입한 계정으로 진행해주세요.

10분 정도 사진·글·작품 로그를 남기고, 카드 수정/공유, 지도, 타일을 사용해봐 주세요. 모임 초대 코드는 별도로 전달할게요.

불편한 부분은 설정 → 알파테스트 → 문제 알리기에서 보고서를 복사해 저에게 보내주세요. 화면 캡처나 녹화가 있으면 좋아요. 비밀번호는 보내지 마세요.

현재 이메일 인증 없는 알파 버전입니다. 테스트 종료 후 데이터는 정식 서비스에서 사용할 수 있는 형태로 백업한 뒤 테스트 환경에서 삭제할 예정이에요.`;
export type AlphaEnvironment={agent:string;width:number;height:number;standalone:boolean;online:boolean};
type Context={view:AlphaView;mode:'guest'|'demo'|'cloud';sync:string;revision:string;environment:AlphaEnvironment};
const oneLine=(value:string,limit=320)=>value.replace(/[\r\n\t]+/g,' ').slice(0,limit);
export function alphaRevision(value:string){return /^[0-9a-f]{7,40}$/i.test(value)?value.slice(0,7):'local';}
export function alphaReport(body:string,context:Context){
 const {environment:e}=context,mode={guest:'로그인 전',demo:'예시 계정',cloud:'실제 계정'}[context.mode];
 return `[알파테스트 피드백]\n화면: ${ALPHA_VIEWS[context.view]||'기타'}\n버전: alpha-${alphaRevision(context.revision)}\n사용: ${mode}\n실행: ${e.standalone?'홈 화면 설치 앱':'브라우저'}\n화면 크기: ${Math.round(e.width)} × ${Math.round(e.height)}\n네트워크 표시: ${e.online?'온라인':'오프라인'}\n저장 상태: ${oneLine(context.sync,30)}\n브라우저: ${oneLine(e.agent)}\n\n불편한 점 / 발생 순서:\n${body.trim().slice(0,1500)}\n\n가능하면 화면 캡처 또는 녹화를 함께 보내주세요.`;
}
