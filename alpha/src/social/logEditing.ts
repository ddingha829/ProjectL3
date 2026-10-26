import {canRead,type LabLog,type LabState} from './model';
import {enqueuePublication} from './publication';
import {validWeather} from './weatherValidation';

export type LogChanges=Pick<LabLog,'title'|'body'|'image'|'category'|'place'|'work'|'rating'|'good'|'bad'|'note'|'weather'>;
function ownLog(state:LabState,id:string,actorId:string,revision:number){
 const log=state.logs.find(log=>log.id===id);
 if(!log)throw new Error('이 로그가 삭제됐어요. 편집을 닫고 목록을 확인해주세요.');
 if(log.authorId!==actorId||!canRead(log,actorId,state))throw new Error('내 로그만 수정할 수 있어요.');
 if((log.revision||0)!==revision)throw new Error('다른 창에서 이 로그가 바뀌었어요. 입력은 남겨두었으니 최신 내용을 확인해주세요.');
 return log;
}
export function editOwnLog(state:LabState,id:string,actorId:string,revision:number,changes:LogChanges,now=Date.now()):LabState{
 const log=ownLog(state,id,actorId,revision);
 if(typeof changes.title!=='string'||typeof changes.body!=='string'||typeof changes.image!=='string')throw new Error('입력한 내용을 다시 확인해주세요.');
 const title=changes.title.trim(),body=changes.body.trim();
 if(!title&&!body&&!changes.image)throw new Error('글이나 사진을 하나 이상 남겨주세요.');
 if(title.length>80||body.length>2000||typeof changes.image!=='string'||changes.image.length>500000)throw new Error('입력한 내용이 너무 길어요. 조금 줄여주세요.');
 if(!['daily','dining','movie','book'].includes(changes.category))throw new Error('분류를 다시 선택해주세요.');
 if(changes.weather!==undefined&&!validWeather(changes.weather))throw new Error('날씨와 온도를 다시 확인해주세요.');
 const p=changes.place;
 if(p&&(!p.name.trim()||p.name.length>60||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180))throw new Error('장소 이름과 위치를 다시 확인해주세요.');
 const next:LabLog={...log,title,body,image:changes.image,category:changes.category,place:changes.category==='movie'||changes.category==='book'?undefined:p?{...p}:undefined,work:changes.work,rating:changes.rating,good:changes.good,bad:changes.bad,note:changes.note,weather:changes.weather,design:!changes.image&&log.design==='ticket'?'cover':log.design,revision:(log.revision||0)+1,updatedAt:now};
 return {...state,logs:state.logs.map(row=>row.id===id?enqueuePublication(next,now):row)};
}
export function withdrawOwnLog(state:LabState,id:string,actorId:string,revision:number,now=Date.now()):LabState{
 const log=ownLog(state,id,actorId,revision);
 if(log.circleId===null)return state;
 return {...state,logs:state.logs.map(row=>row.id===id?enqueuePublication({...row,circleId:null,revision:(row.revision||0)+1,updatedAt:now},now):row)};
}
