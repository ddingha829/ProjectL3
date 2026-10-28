'use client';
import {useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {configureCloud} from './cloudRepository';
import {authMessage} from './authMessages';
import {UI_SESSION} from './store';
import SlideArrowButton from '@/components/tweenui/slide-arrow-button';
import TicgleWordmark from '@/components/TicgleBrand';
import './AuthScreen.css';

export default function PasswordRecovery(){
 const client=useRef<SupabaseClient|null>(null),[status,setStatus]=useState<'loading'|'ready'|'invalid'|'done'>('loading'),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;void(async()=>{try{
  const c=await configureCloud(true);if(!c)throw Error();
  const {data,error}=await c.auth.getSession();if(error||!data.session)throw Error();
  const verified=await c.auth.getUser();if(verified.error||!verified.data.user)throw Error();
  if(active){client.current=c;setStatus('ready');history.replaceState(history.state,'',location.pathname);}
 }catch{if(active)setStatus('invalid');}})();return()=>{active=false;};},[]);
 return <main className="un-login un-auth-screen"><section className="un-auth-panel" aria-labelledby="reset-heading"><TicgleWordmark/><h1 id="reset-heading" className="un-auth-heading">{status==='done'?'비밀번호를 바꿨어요':'새 비밀번호'}</h1>
  {status==='loading'?<p className="un-auth-message" role="status">재설정 링크를 확인하고 있어요.</p>:status==='invalid'?<><p className="un-auth-message" role="alert">재설정 링크가 만료됐거나 유효하지 않아요. 로그인 화면에서 비밀번호 찾기를 다시 이용해주세요.</p><a className="un-auth-return" href="/">로그인으로 돌아가기</a></>:status==='done'?<><p className="un-auth-message" role="status">새 비밀번호로 다시 로그인해주세요.</p><a className="un-auth-return" href="/">로그인으로 돌아가기</a></>:<form className="un-auth-form" noValidate aria-label="비밀번호 재설정" onSubmit={async event=>{
   event.preventDefault();if(busy||!client.current)return;setError('');
   if(password.length<6){setError('비밀번호는 6자 이상으로 입력해주세요.');return;}
   if(password!==confirmation){setError('두 비밀번호가 일치하지 않아요.');return;}
   setBusy(true);try{const result=await client.current.auth.updateUser({password});if(result.error)throw Error(authMessage(result.error));setPassword('');setConfirmation('');localStorage.removeItem(UI_SESSION);await client.current.auth.signOut({scope:'local'});setStatus('done');}catch(reason){setError(reason instanceof Error?reason.message:'비밀번호를 바꾸지 못했어요. 다시 시도해주세요.');}finally{setBusy(false);}
  }}><label htmlFor="reset-password">새 비밀번호<input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} disabled={busy} maxLength={100} placeholder="6자 이상 입력" aria-describedby={error?'reset-error':undefined}/></label><label htmlFor="reset-confirmation">새 비밀번호 확인<input id="reset-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event=>setConfirmation(event.target.value)} disabled={busy} maxLength={100} placeholder="한 번 더 입력" aria-describedby={error?'reset-error':undefined}/></label>{error&&<p id="reset-error" className="un-auth-error" role="alert">{error}</p>}<SlideArrowButton type="submit" className="un-auth-submit" pending={busy} disabled={busy}>{busy?'변경하고 있어요':'비밀번호 변경'}</SlideArrowButton></form>}
 </section></main>;
}
