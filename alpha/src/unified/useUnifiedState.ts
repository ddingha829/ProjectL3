'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient,Session} from '@supabase/supabase-js';
import {authMessage,RECOVERY_REDIRECT} from './authMessages';
import {UI_STORAGE,UI_SESSION,initialUnified,parseUnified,type UnifiedState} from './store';
import {configureCloud,emptyCloudState,fetchCloudState,cloudOperations,prepareCloudOperations,cloudError,type CloudOperation} from './cloudRepository';
type Pending={id:string;userId:string;operations:CloudOperation[];optimistic:UnifiedState;prepared:boolean};
type Mode='login'|'demo'|'cloud';
const cacheKey=(id:string)=>`l2_unified_account_cache:${id}`,pendingKey=(id:string)=>`l2_unified_account_pending:${id}`;
export default function useUnifiedState(){
 const [state,setState]=useState<UnifiedState|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[identity,setIdentity]=useState<{name:string;email?:string}|null>(null),[mode,setMode]=useState<Mode>('login'),[cloudEnabled,setCloudEnabled]=useState(false),[syncStatus,setSyncStatus]=useState<'idle'|'saving'|'failed'>('idle');
 const current=useRef<UnifiedState|null>(null),client=useRef<SupabaseClient|null>(null),userId=useRef(''),modeRef=useRef<Mode>('login'),pending=useRef<Pending|null>(null),sending=useRef(false),alive=useRef(true),generation=useRef(0),requestSequence=useRef(0);
 const show=useCallback((next:UnifiedState)=>{current.current=next;setState(next);},[]);
 const refresh=useCallback(async()=>{if(!client.current||!userId.current||pending.current||modeRef.current!=='cloud')return;const id=userId.current,epoch=generation.current,request=++requestSequence.current;try{const next=await fetchCloudState(client.current);if(!alive.current||userId.current!==id||generation.current!==epoch||pending.current||request!==requestSequence.current)return;show(next);localStorage.setItem(cacheKey(id),JSON.stringify(next));setError('');}catch(e){if(alive.current&&generation.current===epoch)setError(cloudError(e));}},[show]);
 const retry=useCallback(async()=>{
  const item=pending.current,c=client.current;if(!item||!c||sending.current||item.userId!==userId.current)return false;
  sending.current=true;setSyncStatus('saving');const epoch=generation.current,request=++requestSequence.current;
  try{if(!item.prepared){item.operations=await prepareCloudOperations(c,item.userId,item.operations);item.prepared=true;localStorage.setItem(pendingKey(item.userId),JSON.stringify(item));}
   const result=await c.rpc('l2u_apply',{p_operations:item.operations,p_operation_id:item.id});if(result.error)throw result.error;const next=await fetchCloudState(c);if(!alive.current||epoch!==generation.current||request!==requestSequence.current)return false;
   localStorage.setItem(cacheKey(item.userId),JSON.stringify(next));localStorage.removeItem(pendingKey(item.userId));pending.current=null;show(next);setSyncStatus('idle');setError('');return true;
  }catch(e){if(alive.current&&epoch===generation.current){setSyncStatus('failed');setError(cloudError(e));}return false;}finally{sending.current=false;}
 },[show]);
 const queue=useCallback((operations:CloudOperation[],next:UnifiedState)=>{
  if(pending.current||localStorage.getItem(pendingKey(userId.current))){setError('이전 변경을 먼저 서버에 반영해주세요. 임시 변경은 보관되어 있어요.');return false;}
  const item:Pending={id:crypto.randomUUID(),userId:userId.current,operations,optimistic:next,prepared:false};
  try{localStorage.setItem(pendingKey(item.userId),JSON.stringify(item));pending.current=item;requestSequence.current++;show(next);setSyncStatus('saving');setError('');void retry();return true;}catch{setError('임시 변경을 안전하게 보관할 기기 공간이 부족해요. 입력은 그대로 남아 있어요.');return false;}
 },[retry,show]);
 useEffect(()=>{
  alive.current=true;let active=true;let subscription:{unsubscribe:()=>void}|undefined;let channel:ReturnType<SupabaseClient['channel']>|undefined;let eventTimer:ReturnType<typeof setTimeout>|undefined;
  const loadSession=async(session:Session|null)=>{
   const epoch=++generation.current;pending.current=null;userId.current=session?.user.id||'';
   if(channel){void client.current?.removeChannel(channel);channel=undefined;}
   if(!session){modeRef.current='login';setMode('login');setIdentity(null);show(emptyCloudState());setReady(true);return;}
   modeRef.current='cloud';setMode('cloud');setReady(false);setIdentity({name:session.user.user_metadata.display_name||session.user.email?.split('@')[0]||'나',email:session.user.email});
   try{const saved=localStorage.getItem(pendingKey(session.user.id));
    if(saved){const item=JSON.parse(saved) as Pending;if(item.userId!==session.user.id||!Array.isArray(item.operations)||!parseUnified(JSON.stringify(item.optimistic)))throw Error('INVALID_PENDING');pending.current=item;show(item.optimistic);setSyncStatus('failed');setError('아직 서버에 반영되지 않은 변경이 있어요. 다시 반영해주세요.');}
    else{const next=await fetchCloudState(client.current!);if(epoch!==generation.current||!alive.current)return;show(next);localStorage.setItem(cacheKey(session.user.id),JSON.stringify(next));setSyncStatus('idle');setError('');}
   }catch(e){if(epoch!==generation.current)return;const raw=localStorage.getItem(cacheKey(session.user.id)),cached=raw&&parseUnified(raw);show(cached||emptyCloudState());setError(cloudError(e));}
   if(epoch===generation.current&&alive.current){setReady(true);channel=client.current!.channel('l2u-state:'+session.user.id+':'+crypto.randomUUID());for(const table of ['l2u_logs','l2u_shares','l2u_mosaic','l2u_members','l2u_groups','l2u_comments','l2u_reactions','l2u_preferences','l2u_profiles'])channel.on('postgres_changes',{event:'*',schema:'public',table},()=>{clearTimeout(eventTimer);eventTimer=setTimeout(()=>void refresh(),150);});channel.subscribe();}
  };
  void(async()=>{try{const c=await configureCloud();if(!active)return;client.current=c;setCloudEnabled(!!c);const demo=JSON.parse(localStorage.getItem(UI_SESSION)||'null');
   if(demo?.mode==='demo'){const saved=localStorage.getItem(UI_STORAGE),next=saved?parseUnified(saved):initialUnified();if(!next)throw Error('이 기기의 미리보기 기록을 읽지 못했어요.');modeRef.current='demo';setMode('demo');show(next);setIdentity({name:demo.name||'나'});setReady(true);}
   else if(c){const result=await c.auth.getSession();if(result.error)throw result.error;await loadSession(result.data.session);}else{show(emptyCloudState());setReady(true);}
   if(c)subscription=c.auth.onAuthStateChange((event,session)=>{if(modeRef.current==='demo'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')return;setTimeout(()=>{if(alive.current)void loadSession(session);},0);}).data.subscription;
  }catch(e){if(alive.current){show(emptyCloudState());setReady(true);setError(e instanceof Error?e.message:'연결을 확인하지 못했어요.');}}})();
  const storage=(event:StorageEvent)=>{if(modeRef.current==='demo'&&event.key===UI_STORAGE&&event.newValue){const next=parseUnified(event.newValue);if(next)show(next);}else if(event.key===pendingKey(userId.current))void refresh();};
  const focus=()=>void refresh(),poll=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},30000);
  window.addEventListener('storage',storage);window.addEventListener('focus',focus);window.addEventListener('online',focus);
  return()=>{active=false;alive.current=false;generation.current++;subscription?.unsubscribe();if(channel)void client.current?.removeChannel(channel);clearTimeout(eventTimer);clearInterval(poll);window.removeEventListener('storage',storage);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);};
 },[refresh,show]);
 const authenticate=useCallback(async(email:string,password:string,signup:boolean)=>{const c=client.current;if(!c)throw Error('실제 계정 연결을 준비 중이에요.');const result=signup?await c.auth.signUp({email,password,options:{data:{display_name:email.split('@')[0].slice(0,30)}}}):await c.auth.signInWithPassword({email,password});if(result.error)throw Error(authMessage(result.error));if(!result.data.session)throw Error('가입은 접수됐지만 바로 로그인되지 않았어요. 이메일 인증 설정을 확인해주세요.');},[]);
 const resetPassword=useCallback(async(email:string)=>{const c=client.current;if(!c)throw Error('실제 계정 연결을 준비 중이에요.');const result=await c.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_REDIRECT});if(result.error)throw Error(authMessage(result.error));},[]);
 const enterDemo=useCallback((name='나')=>{try{const raw=localStorage.getItem(UI_STORAGE),next=raw?parseUnified(raw):initialUnified();if(!next)throw Error('미리보기 기록을 읽지 못했어요.');localStorage.setItem(UI_SESSION,JSON.stringify({mode:'demo',name}));modeRef.current='demo';setMode('demo');setIdentity({name});show(next);setError('');}catch(e){setError(e instanceof Error?e.message:'예시 화면을 열지 못했어요.');}},[show]);
 const logout=useCallback(async()=>{if(pending.current){setError('반영되지 않은 변경이 있어요. 다시 반영하거나 임시 변경을 백업한 뒤 로그아웃해주세요.');return;}if(modeRef.current==='cloud'){const result=await client.current?.auth.signOut();if(result?.error){setError('로그아웃하지 못했어요.');return;}}localStorage.removeItem(UI_SESSION);generation.current++;userId.current='';modeRef.current='login';setMode('login');setIdentity(null);show(emptyCloudState());setError('');},[show]);
 const commit=useCallback((change:(state:UnifiedState)=>UnifiedState)=>{if(!current.current)return false;try{const before=modeRef.current==='demo'?parseUnified(localStorage.getItem(UI_STORAGE)||JSON.stringify(current.current)):current.current;if(!before)throw Error('기존 기록을 읽지 못했어요.');const next=change(before),serialized=JSON.stringify(next);if(!parseUnified(serialized))throw Error('저장할 내용을 확인해주세요.');if(modeRef.current==='cloud'){const ops=cloudOperations(before,next);return ops.length?queue(ops,next):true;}if(modeRef.current!=='demo')return false;localStorage.setItem(UI_STORAGE,serialized);show(next);setError('');return true;}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');return false;}},[queue,show]);
 const discardPending=useCallback(async()=>{const item=pending.current;if(!item||sending.current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(item,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='L2-unsynced-changes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);localStorage.removeItem(pendingKey(item.userId));pending.current=null;setSyncStatus('idle');await refresh();},[refresh]);
 const invite=useCallback(async(groupId:string)=>{if(!client.current||modeRef.current!=='cloud')throw Error('실제 계정으로 로그인한 뒤 초대할 수 있어요.');const result=await client.current.rpc('l2u_create_invite',{p_group:groupId});if(result.error)throw Error(cloudError(result.error));return String(result.data);},[]);
 const inviteCode=useCallback(async(groupId:string,rotate=false)=>{if(!client.current||modeRef.current!=='cloud')throw Error('실제 계정으로 로그인한 뒤 초대할 수 있어요.');if(pending.current)throw Error('모임 정보를 저장한 뒤 코드를 확인해주세요.');const result=await client.current.rpc('l2u_invite_code',{p_group:groupId,p_rotate:rotate});if(result.error)throw Error(cloudError(result.error));return result.data as {code:string;expiresAt:string};},[]);
 const joinCode=useCallback(async(code:string)=>{if(!client.current||modeRef.current!=='cloud')throw Error('로그인한 뒤 참여할 수 있어요.');if(pending.current)throw Error('저장 중인 변경을 먼저 반영해주세요.');const result=await client.current.rpc('l2u_join_code',{p_code:code.trim().toUpperCase()});if(result.error)throw Error(cloudError(result.error));if(result.data?.error)throw Error(cloudError({message:result.data.error}));const id=result.data?.groupId;if(typeof id!=='string')throw Error('참여 결과를 확인하지 못했어요. 다시 시도해주세요.');await refresh();if(!current.current?.circles.some(c=>c.id===id&&c.members.includes('me')))throw Error('참여는 완료됐어요. 새로고침해 모임 목록을 불러와주세요.');return id;},[refresh]);
 const join=useCallback(async(token:string)=>{if(!client.current||modeRef.current!=='cloud')throw Error('로그인한 뒤 초대 링크를 다시 열어주세요.');if(pending.current)throw Error('저장 중인 변경을 먼저 반영해주세요.');const result=await client.current.rpc('l2u_join',{p_token:token});if(result.error)throw Error(cloudError(result.error));await refresh();return String(result.data);},[refresh]);
 const removeMember=useCallback((groupId:string,id:string,keepShares:boolean)=>{if(!current.current||modeRef.current!=='cloud')return false;return queue([{kind:'remove_member',groupId,userId:id==='me'?userId.current:id,keepShares}],current.current);},[queue]);
 return {state,commit,error,ready,identity,mode,cloudEnabled,syncStatus,retry,discardPending,authenticate,resetPassword,enterDemo,logout,invite,inviteCode,joinCode,join,removeMember,clearError:()=>setError('')};
}
