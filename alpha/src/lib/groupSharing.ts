export const GROUP_SHARE_WINDOW_MS=48*60*60*1000;
type PublishedLog={createdAt:number;serverPublishedAt?:number};
export const groupShareDeadline=(log:PublishedLog)=>
 (Number.isFinite(log.serverPublishedAt)?log.serverPublishedAt!:log.createdAt)+GROUP_SHARE_WINDOW_MS;
export const canAddGroupShare=(log:PublishedLog,now=Date.now())=>Number.isFinite(groupShareDeadline(log))&&now<groupShareDeadline(log);
export function addsGroupShare(before:readonly string[],after:readonly string[]){return after.some(id=>!before.includes(id));}
export const SHARE_WINDOW_MESSAGE='등록 후 48시간이 지나 새 모임에 공유할 수 없어요. 기존 공유는 유지되며 해제할 수 있어요.';
export function groupShareTimeLabel(log:PublishedLog,now=Date.now()){
 const left=groupShareDeadline(log)-now;
 if(!Number.isFinite(left)||left<=0)return '추가 공유 기한이 끝났어요';
 const minutes=Math.ceil(left/60000),hours=Math.floor(minutes/60);
 return hours?`추가 공유 ${hours}시간${minutes%60?' '+minutes%60+'분':''} 남음`:`추가 공유 ${minutes}분 남음`;
}
