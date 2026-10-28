'use client';
import {useState} from 'react';
import {ArrowRight,ChevronDown,Eye,EyeOff,Info} from 'lucide-react';
import SlideArrowButton from '@/components/tweenui/slide-arrow-button';
import './AuthScreen.css';
import AlphaSupport from './AlphaSupport';
import TicgleWordmark from '@/components/TicgleBrand';

export default function PreviewLogin({onEnter,onAuthenticate,onResetPassword,enabled=false}:{onEnter:(name:string)=>void;onAuthenticate:(email:string,password:string,signup:boolean)=>Promise<void>;onResetPassword:(email:string)=>Promise<void>;enabled?:boolean}){
 const [support,setSupport]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[error,setError]=useState(''),[signup,setSignup]=useState(false),[busy,setBusy]=useState(false);
 const [recovery,setRecovery]=useState(false),[resetSent,setResetSent]=useState(false);
 const switchMode=()=>{if(busy)return;if(recovery){setRecovery(false);setResetSent(false);setSignup(false);}else setSignup(value=>!value);setShow(false);setError('');setPassword('');};
 const title=recovery?'비밀번호 찾기':signup?'회원가입':'로그인';
 return <><main className="un-login un-auth-screen"><section className="un-auth-panel" aria-labelledby="un-auth-title">
  <TicgleWordmark/>
  <h1 id="un-auth-title" className="un-auth-heading">{title}</h1>
  {resetSent?<p className="un-auth-message" role="status">가입된 주소라면 비밀번호 재설정 메일을 보내드렸어요. 받은 편지함과 스팸함을 확인해주세요.</p>:<form className="un-auth-form" aria-label={title} noValidate onSubmit={async event=>{
   event.preventDefault();if(busy||!enabled)return;
   const address=email.trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setError('올바른 이메일 주소를 입력해주세요.');document.getElementById('un-login-email')?.focus();return;}
   if(!recovery&&(!password||signup&&password.length<6)){setError(signup?'비밀번호는 6자 이상으로 입력해주세요.':'비밀번호를 입력해주세요.');document.getElementById('un-login-password')?.focus();return;}
   setBusy(true);setError('');
   try{if(recovery){await onResetPassword(address);setResetSent(true);}else await onAuthenticate(address,password,signup);}catch(reason){setError(reason instanceof Error?reason.message:'요청을 완료하지 못했어요. 다시 시도해주세요.');}finally{setBusy(false);}
  }}>
   <label htmlFor="un-login-email">이메일<input id="un-login-email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" required disabled={busy} value={email} maxLength={254} placeholder="name@example.com" aria-invalid={!!error&&error.includes('이메일')} aria-describedby={error?'un-login-error':undefined} onChange={event=>{setEmail(event.target.value);setError('');}}/></label>
   {!recovery&&<label htmlFor="un-login-password">비밀번호<span className="un-auth-password"><input id="un-login-password" autoComplete={signup?'new-password':'current-password'} type={show?'text':'password'} required disabled={busy} value={password} maxLength={100} placeholder={signup?'6자 이상 입력':'비밀번호 입력'} aria-invalid={!!error&&error.includes('비밀번호')} aria-describedby={error?'un-login-error':undefined} onChange={event=>{setPassword(event.target.value);setError('');}}/><button type="button" aria-label={show?'비밀번호 숨기기':'비밀번호 보기'} aria-pressed={show} disabled={busy} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={18} strokeWidth={1.6}/>:<Eye size={18} strokeWidth={1.6}/>}</button></span></label>}
   {!signup&&!recovery&&<button className="un-auth-forgot" type="button" disabled={busy} onClick={()=>{setRecovery(true);setPassword('');setError('');}}>비밀번호 찾기</button>}
   {error&&<p className="un-auth-error" id="un-login-error" role="alert">{error}</p>}
   <SlideArrowButton className="un-auth-submit" type="submit" pending={busy} disabled={!enabled||busy} aria-label={busy?'연결하고 있어요':recovery?'재설정 메일 받기':signup?'계정 만들기':'로그인'}>{busy?'연결하고 있어요':recovery?'재설정 메일 받기':signup?'계정 만들기':'로그인'}</SlideArrowButton>
  </form>}
  <p className="un-auth-switch">{!recovery&&<span>{signup?'이미 계정이 있나요?':'처음이신가요?'}</span>}<button type="button" disabled={busy} onClick={switchMode}>{recovery?'로그인으로 돌아가기':signup?'로그인':'회원가입'}</button></p>
  {!recovery&&<button className="un-auth-demo" type="button" aria-label="예시 계정으로 먼저 둘러보기" disabled={busy} onClick={()=>onEnter('나')}>먼저 둘러보기<ArrowRight size={15} strokeWidth={1.5}/></button>}
  <footer className="un-auth-footer"><details className="un-auth-notice"><summary><Info size={13} strokeWidth={1.5}/><span>알파 테스트 안내</span><ChevronDown size={12}/></summary><p>현재 알파 버전이며, 별도의 이메일 인증 없이 가입할 수 있습니다. 테스트 종료 후 모든 데이터는 정식 서비스에서 사용할 수 있는 형식으로 백업한 뒤, 테스트 환경에서 삭제할 예정입니다.</p></details><button className="un-auth-feedback" onClick={()=>setSupport(true)}>문제 알리기</button>{!enabled&&<p className="un-auth-connection" role="status">계정 연결을 준비 중입니다. 먼저 둘러보기로 화면을 확인할 수 있어요.</p>}</footer>
 </section></main><AlphaSupport open={support} onClose={()=>setSupport(false)} initialTab="report"/></>;
}
