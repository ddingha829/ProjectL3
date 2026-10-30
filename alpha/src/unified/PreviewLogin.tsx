'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronDown,Eye,EyeOff,Info} from 'lucide-react';
import SlideArrowButton from '@/components/tweenui/slide-arrow-button';
import './AuthScreen.css';
import AlphaSupport from './AlphaSupport';
import TicgleWordmark from '@/components/TicgleBrand';

export default function PreviewLogin({onEnter,onAuthenticate,onResetPassword,enabled=false}:{onEnter:(name:string)=>void;onAuthenticate:(email:string,password:string,signup:boolean)=>Promise<void>;onResetPassword:(email:string)=>Promise<void>;enabled?:boolean}){
 const [support,setSupport]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[error,setError]=useState(''),[signup,setSignup]=useState(false),[busy,setBusy]=useState(false);
 const [recovery,setRecovery]=useState(false),[resetSent,setResetSent]=useState(false);
 const requestInFlight=useRef(false),[complete,setComplete]=useState(false),[slow,setSlow]=useState(false);
 const locked=busy||complete;
 useEffect(()=>{if(!busy){setSlow(false);return;}const timer=setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer);},[busy]);
 const switchMode=()=>{if(locked||requestInFlight.current)return;if(recovery){setRecovery(false);setResetSent(false);setSignup(false);}else setSignup(value=>!value);setShow(false);setError('');setPassword('');};
 const title=recovery?'비밀번호 찾기':signup?'회원가입':'로그인';
 const submitLabel=complete?'완료 · 티끌 여는 중':busy?recovery?'메일 보내는 중':signup?'계정 만드는 중':'로그인 중':recovery?'재설정 메일 받기':signup?'계정 만들기':'로그인';
 return <><main className="un-login un-auth-screen"><section className="un-auth-panel" aria-labelledby="un-auth-title">
  <TicgleWordmark/>
  <h1 id="un-auth-title" className="un-auth-heading">{title}</h1><aside className="un-auth-alpha-notice" aria-label="알파 테스트 안내"><strong>지금은 알파 테스트 중이에요</strong><p>이메일 인증 없이 바로 가입할 수 있어요. 테스트 종료 후 모든 데이터는 정식 서비스용으로 백업한 뒤 삭제합니다.</p></aside>
  {resetSent?<p className="un-auth-message" role="status">가입된 주소라면 비밀번호 재설정 메일을 보내드렸어요. 받은 편지함과 스팸함을 확인해주세요.</p>:<form className="un-auth-form" aria-label={title} noValidate onSubmit={async event=>{
   event.preventDefault();if(requestInFlight.current||locked||!enabled)return;
   // Read the submitted controls too: iOS password-manager autofill can update
   // their DOM values before React receives an input/change event.
   const fields=new FormData(event.currentTarget),address=String(fields.get('email')||'').trim().toLowerCase(),submittedPassword=String(fields.get('password')||'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setError('올바른 이메일 주소를 입력해주세요.');document.getElementById('un-login-email')?.focus();return;}
   if(!recovery&&(!submittedPassword||signup&&submittedPassword.length<6)){setError(signup?'비밀번호는 6자 이상으로 입력해주세요.':'비밀번호를 입력해주세요.');document.getElementById('un-login-password')?.focus();return;}
   requestInFlight.current=true;setBusy(true);setError('');
   try{
    if(recovery){await onResetPassword(address);setResetSent(true);requestInFlight.current=false;}
    else{await onAuthenticate(address,submittedPassword,signup);setComplete(true);}
   }catch(reason){requestInFlight.current=false;setError(reason instanceof Error?reason.message:'요청을 완료하지 못했어요. 다시 시도해주세요.');}
   finally{setBusy(false);}
  }}>
   <label htmlFor="un-login-email">이메일<input id="un-login-email" name="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" required disabled={locked} value={email} maxLength={254} placeholder="name@example.com" aria-invalid={!!error&&error.includes('이메일')} aria-describedby={error?'un-login-error':undefined} onChange={event=>{setEmail(event.target.value);setError('');}}/></label>
   {!recovery&&<label htmlFor="un-login-password">비밀번호<span className="un-auth-password"><input id="un-login-password" name="password" autoComplete={signup?'new-password':'current-password'} type={show?'text':'password'} required disabled={locked} value={password} maxLength={100} placeholder={signup?'6자 이상 입력':'비밀번호 입력'} aria-invalid={!!error&&error.includes('비밀번호')} aria-describedby={[signup?'un-signup-password-help':'',error?'un-login-error':''].filter(Boolean).join(' ')||undefined} onChange={event=>{setPassword(event.target.value);setError('');}}/><button type="button" aria-label={show?'비밀번호 숨기기':'비밀번호 보기'} aria-pressed={show} disabled={locked} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={18} strokeWidth={1.6}/>:<Eye size={18} strokeWidth={1.6}/>}</button></span></label>}
   {signup&&!recovery&&<p className="un-signup-password-help" id="un-signup-password-help">비밀번호는 6자 이상 입력해주세요.</p>}
   {!signup&&!recovery&&<button className="un-auth-forgot" type="button" disabled={locked} onClick={()=>{setRecovery(true);setPassword('');setError('');}}>비밀번호 찾기</button>}
   {error&&<p className="un-auth-error" id="un-login-error" role="alert">{error}</p>}
   <SlideArrowButton className="un-auth-submit" type="submit" pending={locked} disabled={!enabled||locked} aria-label={submitLabel}>{submitLabel}</SlideArrowButton>
   {locked&&<p className="un-auth-progress" role="status">{complete?'완료했어요. 내 티끌을 불러오고 있어요.':slow?'응답이 늦어지고 있어요. 다시 누르지 않아도 처리 중이에요.':recovery?'재설정 메일을 요청하고 있어요.':signup?'계정을 만들고 있어요. 잠시만 기다려주세요.':'로그인하고 있어요. 잠시만 기다려주세요.'}</p>}
  </form>}
  <p className="un-auth-switch">{!recovery&&<span>{signup?'이미 계정이 있나요?':'처음이신가요?'}</span>}<button type="button" disabled={locked} onClick={switchMode}>{recovery?'로그인으로 돌아가기':signup?'로그인':'회원가입'}</button></p>

  <footer className="un-auth-footer">{!recovery&&<button className="un-auth-demo" type="button" aria-label="예시 계정으로 먼저 둘러보기" disabled={locked} onClick={()=>onEnter('나')}>먼저 둘러보기<ArrowRight size={15} strokeWidth={1.5}/></button>}<button className="un-auth-feedback" onClick={()=>setSupport(true)}>문제 알리기</button>{!enabled&&<p className="un-auth-connection" role="status">계정 연결을 준비 중입니다. 먼저 둘러보기로 화면을 확인할 수 있어요.</p>}</footer>
 </section></main><AlphaSupport open={support} onClose={()=>setSupport(false)} initialTab="report"/></>;
}
