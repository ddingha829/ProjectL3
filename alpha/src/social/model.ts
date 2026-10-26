import type {PhotoSettings} from '@/unified/store';
import type {ArchiveItem} from '@/types/l2';
import type {Publication} from './publication';
import {validWeather,type CardWeather} from './weatherValidation';
import {validEditorial,type EditorialStyle} from './editorialStyle';
import {isWork,type Work,type TasteIntent,WORKS} from './taste';
export type Person={id:string;name:string;initial:string;color:string;note:string};
export type Circle={id:string;name:string;description:string;members:string[];ownerId?:string;pending?:string[];joinedAt?:Record<string,number>;capacity?:number;serverRevision?:number};
export type Place={id:string;name:string;area:string;lat:number;lng:number};
export type LabLog={id:string;authorId:string;circleId:string|null;circleIds?:string[];photo?:PhotoSettings;title:string;body:string;image:string;category:'daily'|'dining'|'movie'|'book';place?:Place;locationLabel?:string;work?:Work;card?:EditorialStyle;weather?:CardWeather;rating?:string;good?:string;bad?:string;note?:string;createdAt:number;updatedAt?:number;revision?:number;publication?:Publication;design:'cover'|'polaroid'|'ticket';likes:string[];bookmarks:string[];comments:{id:string;authorId:string;body:string}[]};
export type LabState={version:1;people:Person[];circles:Circle[];logs:LabLog[];intents?:TasteIntent[]};
export const STORAGE_KEY='l2_social_lab_state_v1';
export const PEOPLE:Person[]=[{id:'me',name:'나',initial:'L',color:'#df653f',note:'오늘도 가볍게, 한 줄'},{id:'jiwoo',name:'지우',initial:'J',color:'#728d66',note:'좋아하는 순간을 모으는 중'},{id:'minsu',name:'민수',initial:'M',color:'#6a84b0',note:'새로운 곳, 새로운 이야기'},{id:'yuna',name:'유나',initial:'Y',color:'#ab7c94',note:'작은 취향 수집가'}];
export const PLACES:Place[]=[{id:'seongsu',name:'성수의 작은 카페',area:'성수동',lat:37.5445,lng:127.0557},{id:'forest',name:'서울숲',area:'성수동',lat:37.5444,lng:127.0374},{id:'hannam',name:'한남동 저녁 식탁',area:'한남동',lat:37.5348,lng:127.0019},{id:'yeonnam',name:'연남동 골목',area:'연남동',lat:37.5628,lng:126.9248},{id:'mangwon',name:'망원 한강공원',area:'망원동',lat:37.5533,lng:126.9028},{id:'bukchon',name:'북촌 산책길',area:'가회동',lat:37.5826,lng:126.9831}];
export const CATEGORY_LABEL={daily:'일상',dining:'미식',movie:'영화·드라마',book:'책'};
export function seedState(now=Date.now()):LabState {
 const row=(id:string,authorId:string,title:string,body:string,minutes:number,extras:Partial<LabLog>={}):LabLog=>({id,authorId,title,body,createdAt:now-minutes*60000,circleId:'daily',image:'',category:'daily',design:'cover',likes:[],bookmarks:[],comments:[],...extras});
 return {version:1,people:PEOPLE,circles:[{id:'daily',name:'우리의 작은 일상',description:'가까운 사이, 가벼운 기록',members:['me','jiwoo','minsu','yuna']},{id:'weekend',name:'주말의 발견',description:'같이 가고 싶은 곳을 모아요',members:['me','jiwoo']}],logs:[
  row('cafe','jiwoo','느리게 마신 오후','라테 한 잔과 잠깐의 쉼. 창가에 앉으니 평범한 오후도 조금 특별해졌다.',20,{image:'/images/studio-cafe.png',category:'dining',place:PLACES[0],likes:['minsu','yuna'],comments:[{id:'c1',authorId:'minsu',body:'다음엔 같이 가자!'}]}),
  row('book','minsu','요즘 다시, 이 문장','좋은 하루는 특별한 것이 아니라, 평범한 순간을 잘 붙잡는 데서 온다. 오늘은 조금 천천히 읽었다.',64,{category:'book',work:WORKS[2],likes:['jiwoo']}),
  row('walk','me','오늘의 산책은 서울숲','이어폰을 빼고 걸었다. 바람이 제법 시원해서 한 바퀴 더.',110,{place:PLACES[1],likes:['jiwoo'],design:'polaroid'}),
  row('dinner','yuna','오늘 저녁은 여기에','맛있는 한 끼와 밀린 이야기. 이런 시간이 오래 남는다.',190,{image:'/images/korean.jpg',category:'dining',place:PLACES[2],likes:['me','minsu']}),
  row('yeonnam','minsu','골목 하나를 더 발견','약속보다 조금 일찍 도착한 덕분에, 처음 보는 길을 걸었다.',340,{place:PLACES[3]}),
  row('movie','jiwoo','엔딩이 오래 남는 밤','영화가 끝나고도 한참을 앉아 있었다. 좋은 장면은 생각보다 천천히 지나간다.',900,{image:'/images/cinema.jpg',work:WORKS[0],category:'movie',design:'ticket'}),
  row('weekend','jiwoo','다음 주말은 한강으로','날 좋으면 여기서 만나자. 커피 한 잔 들고 천천히 걷기.',1440,{circleId:'weekend',place:PLACES[4]}),
  row('private','me','나에게만 남기는 메모','오늘 잘한 일 하나. 급하게 결론을 내리지 않은 것.',220,{circleId:null}),
 ]};
}
export function canRead(log:LabLog,actorId:string,state:LabState){if(log.authorId===actorId)return true;const ids=log.circleIds??(log.circleId?[log.circleId]:[]);return ids.some(id=>state.circles.some(c=>c.id===id&&c.members.includes(actorId)));}
function validPublication(p:Publication|undefined){return p===undefined||p!==null&&typeof p==='object'&&typeof p.operationId==='string'&&p.operationId.length>0&&p.operationId.length<200&&['queued','sending','failed','confirmed'].includes(p.status)&&['simulation','server'].includes(p.mode)&&Number.isSafeInteger(p.attempts)&&p.attempts>=0&&Number.isFinite(p.updatedAt)&&(p.sharedAt===undefined||Number.isFinite(p.sharedAt))&&(p.status!=='confirmed'||Number.isFinite(p.sharedAt))&&(p.leaseUntil===undefined||Number.isFinite(p.leaseUntil))&&(p.attemptId===undefined||typeof p.attemptId==='string')&&(p.error===undefined||typeof p.error==='string');}
export function readState(raw:string|null):LabState|null {
 if(!raw)return null;try{const s=JSON.parse(raw);if(s.version!==1||!Array.isArray(s.logs)||s.logs.length>300||!Array.isArray(s.circles)||!Array.isArray(s.people))return null;
 if(!s.logs.every((l:LabLog)=>typeof l.id==='string'&&typeof l.authorId==='string'&&typeof l.body==='string'&&typeof l.title==='string'&&typeof l.image==='string'&&Number.isFinite(l.createdAt)&&(l.updatedAt===undefined||Number.isFinite(l.updatedAt))&&(l.revision===undefined||Number.isSafeInteger(l.revision)&&l.revision>=0)&&validPublication(l.publication)&&Array.isArray(l.likes)&&Array.isArray(l.bookmarks)&&Array.isArray(l.comments)))return null;
 if(!s.circles.every((c:Circle)=>c&&typeof c.id==='string'&&typeof c.name==='string'&&Array.isArray(c.members)&&c.members.every(id=>typeof id==='string')&&(c.ownerId===undefined||typeof c.ownerId==='string'&&c.members.includes(c.ownerId))&&(c.pending===undefined||Array.isArray(c.pending)&&c.pending.every(id=>typeof id==='string'))&&(c.joinedAt===undefined||c.joinedAt!==null&&typeof c.joinedAt==='object'&&!Array.isArray(c.joinedAt)&&Object.values(c.joinedAt).every(t=>Number.isFinite(t)&&t>=0)))||!s.people.every((p:Person)=>p&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.color==='string'))return null;
 if(s.logs.some((l:LabLog)=>(l.locationLabel!==undefined&&(typeof l.locationLabel!=='string'||l.locationLabel.length>60))||(l.weather!==undefined&&!validWeather(l.weather))||(l.card!==undefined&&!validEditorial(l.card))||(l.work!==undefined&&!isWork(l.work))||[l.good,l.bad,l.note].some(v=>v!==undefined&&(typeof v!=='string'||v.length>400))||(l.rating!==undefined&&(typeof l.rating!=='string'||l.rating!==''&&(!Number.isFinite(Number(l.rating))||Number(l.rating)<0||Number(l.rating)>5)))))return null;
 if(s.intents!==undefined&&(!Array.isArray(s.intents)||s.intents.length>1000||s.intents.some((i:TasteIntent)=>!i||typeof i.actorId!=='string'||!isWork(i.work)||!Number.isFinite(i.createdAt))))return null;
 s.logs=s.logs.map((log:LabLog)=>{if(log.work||!['book','movie'].includes(log.category))return log;const work=WORKS.find(w=>w.kind===log.category&&w.title===log.title)||(log.id==='book'&&log.title==='요즘 다시, 이 문장'?WORKS[2]:log.id==='movie'&&log.title==='엔딩이 오래 남는 밤'?WORKS[0]:undefined);return work?{...log,work}:log;});
 return s as LabState;}catch{return null;}
}
export function timeAgo(time:number){const m=Math.max(0,Math.floor((Date.now()-time)/60000));return m<1?'방금 전':m<60?`${m}분 전`:m<1440?`${Math.floor(m/60)}시간 전`:`${Math.floor(m/1440)}일 전`;}
export function archive(log:LabLog,name:string):ArchiveItem{return {id:log.id,num:'01',cat:log.category==='dining'?'DINING':log.category==='movie'?'CINEMA':'OTHER',sub:CATEGORY_LABEL[log.category].toUpperCase(),title:log.title||log.body.slice(0,20)||'사진으로 남긴 순간',quote:log.body,img:log.image,hasPhoto:Boolean(log.image),loc:log.place?.area||log.locationLabel||'',addressShort:log.locationLabel||log.place?.name||'',date:new Intl.DateTimeFormat('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit'}).format(log.createdAt),timestamp:log.createdAt,score:'',good:'',bad:'',note:'',link:'',cropX:50,cropY:50,mapX:50,mapY:50,author:name,coordinates:log.place?{lat:log.place.lat,lng:log.place.lng}:null};}
