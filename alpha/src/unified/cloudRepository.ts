'use client';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {compressPhotoBlob} from '@/lib/imageCompression';
import {initialUnified,parseUnified,audienceIds,type UnifiedLog,type UnifiedState} from './store';
import {backendSessionKey} from './backendSession';
import type {Person,Circle} from '@/social/model';
import {normalizeNickname,nicknameInitial} from './nickname';
import {photoUrls} from './photoUrls';
export type CloudOperation=Record<string,unknown>&{kind:string};
export type Snapshot={actorId:string;people:Pick<Person,'id'|'name'|'color'>[];circles:(Circle&{revision:number})[];logs:UnifiedLog[];preferences:{payload:Pick<UnifiedState,'presets'|'collections'|'intents'|'nicknameConfigured'>;revision:number}|null;placements:{logId:string;scope:string|null;slotIndex:number;placedBy:string;placedAt:number}[]};
let configuredClient:{signature:string;client:SupabaseClient}|undefined;
export async function configureCloud(detectSessionInUrl=false):Promise<SupabaseClient|null>{
 const response=await fetch('/api/backend/config',{cache:'no-store'});if(!response.ok)throw Error('서버 연결 설정을 확인하지 못했어요.');
 const config=await response.json();if(!config.enabled){configuredClient?.client.auth.stopAutoRefresh();configuredClient=undefined;return null;}
 const storageKey=backendSessionKey(config.generation,localStorage),signature=JSON.stringify([config.url,config.key,storageKey,detectSessionInUrl]);
 // StrictMode and repeated dialog visits must share one auth refresher.
 if(configuredClient?.signature===signature)return configuredClient.client;
 configuredClient?.client.auth.stopAutoRefresh();
 const client=createClient(config.url,config.key,{auth:{storageKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl}});
 configuredClient={signature,client};return client;
}
export const emptyCloudState=():UnifiedState=>({...initialUnified(),logs:[],people:[{id:'me',name:'나',initial:'나',color:'#df653f',note:''}],circles:[],collections:[],intents:[],mosaic:{personalBoard:{},groupBoards:{}}});
export function cloudError(error:unknown){
 const text=(error as {message?:string})?.message||'';
 const known:Record<string,string>={STALE_VERSION:'다른 기기에서 바뀐 내용이 있어요. 임시 변경을 백업한 뒤 최신 기록을 불러와주세요.',SLOT_TAKEN:'다른 모임원이 먼저 채운 칸이에요. 최신 보드에서 빈 칸을 골라주세요.',GROUP_FULL:'모임 정원이 찼어요.',INVALID_INVITE:'초대 코드를 확인해주세요. 만료되었거나 다시 발급된 코드일 수 있어요.',INVITE_RATE_LIMITED:'시도 횟수가 많아요. 잠시 뒤 다시 입력해주세요.',GROUP_OWNER_REQUIRED:'모임장만 변경할 수 있어요.',GROUP_MEMBER_REQUIRED:'이 모임에 참여한 뒤 다시 시도해주세요.',LOG_OWNER_REQUIRED:'내가 작성한 기록만 수정할 수 있어요.',OWNER_TRANSFER_REQUIRED:'다른 모임원이 있는 동안 모임장은 탈퇴할 수 없어요.',AUTH_REQUIRED:'로그인이 필요해요.'};
 for(const [key,value]of Object.entries(known))if(text.includes(key))return value;
 if(/Invalid login credentials/i.test(text))return '이메일 또는 비밀번호를 확인해주세요.';
 if(/already registered/i.test(text))return '이미 가입된 이메일이에요. 로그인해주세요.';
 if(/rate limit|too many/i.test(text))return '요청이 잠시 많아요. 조금 뒤 다시 시도해주세요.';
 if(/password.*(?:least|short|weak)/i.test(text))return '비밀번호는 6자 이상으로 입력해주세요.';
 return '서버에 반영하지 못했어요. 임시 변경은 이 기기에 보관되어 있어요.';
}
export async function fetchCloudState(client:SupabaseClient):Promise<UnifiedState>{
 const {data,error}=await client.rpc('l2u_snapshot');if(error)throw error;const snapshot=data as Snapshot;
 return {...await hydrateSnapshot(client,snapshot),recordsComplete:true};
}
export async function hydrateSnapshot(client:SupabaseClient,snapshot:Snapshot):Promise<UnifiedState>{
 const me=(id:string)=>id===snapshot.actorId?'me':id,base=emptyCloudState();
 const people=snapshot.people.map(p=>({...p,id:me(p.id),initial:nicknameInitial(p.name),note:''}));
 const images=await photoUrls(client,snapshot.actorId,snapshot.logs.flatMap(log=>log.imagePath?[log.imagePath]:[]));
 const logs=snapshot.logs.map(log=>{
  let image=log.image;
  if(log.imagePath)image=images.get(log.imagePath)||'';
  return {...log,image,authorId:me(log.authorId),circleId:log.circleIds?.[0]||null,likes:log.likes.map(me),bookmarks:log.bookmarks.map(me),comments:log.comments.map(c=>({...c,authorId:me(c.authorId)}))};
 });
 const mosaic:UnifiedState['mosaic']={personalBoard:{},groupBoards:{}};
 for(const p of snapshot.placements)if(p.scope){mosaic.groupBoards[p.scope]||={};mosaic.groupBoards[p.scope][p.slotIndex]={...p,placedBy:me(p.placedBy)};}else mosaic.personalBoard[p.slotIndex]=p.logId;
 const state:UnifiedState={...base,...snapshot.preferences?.payload,serverPreferencesRevision:snapshot.preferences?.revision||0,people,logs,circles:snapshot.circles.map(c=>({...c,description:'',ownerId:me(c.ownerId!),members:c.members.map(me),serverRevision:c.revision})),mosaic};
 const validated=parseUnified(JSON.stringify(state));if(!validated)throw Error('서버 기록 형식을 확인하지 못했어요.');return validated;
}
function logPayload(log:UnifiedLog){
 const {id,authorId,circleId,circleIds,serverRevision,likes,bookmarks,comments,...payload}=log;
 void id;void authorId;void circleId;void circleIds;void serverRevision;void likes;void bookmarks;void comments;
 if(payload.image.startsWith('data:'))delete payload.imagePath;
 else if(payload.imagePath)payload.image='';
 return payload;
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function cloudOperations(before:UnifiedState,after:UnifiedState):CloudOperation[]{
 const ops:CloudOperation[]=[];
 const beforeMe=before.people.find(p=>p.id==='me'),afterMe=after.people.find(p=>p.id==='me');if(afterMe&&beforeMe?.name!==afterMe.name)ops.push({kind:'profile',name:afterMe.name});
 for(const group of after.circles){const old=before.circles.find(g=>g.id===group.id);if(!old||!same([old.name,old.capacity],[group.name,group.capacity]))ops.push({kind:'group',id:group.id,name:group.name,capacity:group.capacity||8,expected:old?.serverRevision||0});}
 for(const log of after.logs){
  const old=before.logs.find(l=>l.id===log.id);
  if(log.authorId==='me'&&(!old||!same(logPayload(old),logPayload(log))||!same(audienceIds(old),audienceIds(log))))ops.push({kind:'log',id:log.id,payload:logPayload(log),groups:audienceIds(log),expected:old?.serverRevision||0});
  for(const [key,type]of [['likes','like'],['bookmarks','bookmark']]as const)if(Boolean(old?.[key].includes('me'))!==log[key].includes('me'))ops.push({kind:'reaction',id:log.id,type,active:log[key].includes('me')});
  for(const comment of log.comments)if(comment.authorId==='me'&&!old?.comments.some(c=>c.id===comment.id))ops.push({kind:'comment',id:comment.id,logId:log.id,body:comment.body});
 }
 for(const old of before.logs)if(old.authorId==='me'&&!after.logs.some(l=>l.id===old.id))ops.push({kind:'delete_log',id:old.id,expected:old.serverRevision||0});
 const prefs=(s:UnifiedState)=>({presets:s.presets,collections:s.collections,intents:s.intents||[],nicknameConfigured:s.nicknameConfigured===true});
 if(!same(prefs(before),prefs(after)))ops.push({kind:'preferences',payload:prefs(after),expected:before.serverPreferencesRevision||0});
 const scopes=new Set(['mine',...Object.keys(before.mosaic.groupBoards),...Object.keys(after.mosaic.groupBoards)]);
 for(const scope of scopes){
  const rows=(s:UnifiedState)=>scope==='mine'?s.mosaic.personalBoard:Object.fromEntries(Object.entries(s.mosaic.groupBoards[scope]||{}).map(([i,p])=>[i,p.logId]));
  const old=rows(before),next=rows(after),nextLogs=new Set(Object.values(next));
  for(const id of Object.values(old))if(!nextLogs.has(id)&&before.logs.find(l=>l.id===id)?.authorId==='me')ops.push({kind:'unplace',id,groupId:scope==='mine'?null:scope});
  for(const [slot,id]of Object.entries(next))if(old[Number(slot)]!==id&&after.logs.find(l=>l.id===id)?.authorId==='me')ops.push({kind:'place',id,groupId:scope==='mine'?null:scope,slot:Number(slot)});
 }
 return ops;
}
/** The profile and first-login marker are one existing database transaction.
 * Never dismiss onboarding before the server acknowledges both writes. */
export async function persistNickname(client:SupabaseClient,before:UnifiedState,value:string):Promise<UnifiedState>{
 const name=normalizeNickname(value),next:UnifiedState={...before,nicknameConfigured:true,people:before.people.map(p=>p.id==='me'?{...p,name,initial:nicknameInitial(name)}:p)};
 const operations=cloudOperations(before,next);
 if(operations.length){const result=await client.rpc('l2u_apply',{p_operations:operations,p_operation_id:crypto.randomUUID()});if(result.error)throw result.error;}
 return {...next,serverPreferencesRevision:(before.serverPreferencesRevision||0)+(operations.some(op=>op.kind==='preferences')?1:0)};
}
export async function prepareCloudOperations(client:SupabaseClient,userId:string,operations:CloudOperation[]){
 const result=structuredClone(operations);
 for(const op of result){if(op.kind!=='log')continue;const payload=op.payload as Record<string,unknown>,image=String(payload.image||'');if(!image.startsWith('data:'))continue;
  const response=await fetch(image),sourceBlob=await response.blob();let blob:Blob;try{const bitmap=await createImageBitmap(sourceBlob),alreadyCompressed=sourceBlob.type==='image/webp'&&sourceBlob.size<=307200&&bitmap.width<=1080&&bitmap.height<=2160;bitmap.close();blob=alreadyCompressed?sourceBlob:await compressPhotoBlob(sourceBlob);}catch{blob=await compressPhotoBlob(sourceBlob);}const path=`${userId}/${op.id}/${crypto.randomUUID()}.webp`;
  const upload=await client.storage.from('l2u-photos').upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'0'});if(upload.error)throw upload.error;
  payload.image='';payload.imagePath=path;
 }
 return result;
}
