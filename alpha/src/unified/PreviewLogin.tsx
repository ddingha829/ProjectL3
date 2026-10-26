'use client';
import {useState} from 'react';
import {ArrowUpRight,Eye,EyeOff} from 'lucide-react';
export default function PreviewLogin({onEnter,onAuthenticate,enabled=false}:{onEnter:(name:string)=>void;onAuthenticate:(email:string,password:string,signup:boolean)=>Promise<void>;enabled?:boolean}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[error,setError]=useState(''),[signup,setSignup]=useState(true),[busy,setBusy]=useState(false);
 return <main className="un-login"><div className="un-login-brand">L2<span>.</span></div><div className="un-login-copy"><span>live & log!</span><h1>일상을,<br/>로그하다.</h1></div>
  <div className="un-login-tabs" aria-label="계정 화면"><button aria-pressed={signup} onClick={()=>{setSignup(true);setError('');}}>회원가입</button><button aria-pressed={!signup} onClick={()=>{setSignup(false);setError('');}}>로그인</button></div>
  <form noValidate onSubmit={async e=>{e.preventDefault();if(busy||!enabled)return;const address=email.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setError('올바른 이메일 주소를 입력해주세요.');document.getElementById('un-login-email')?.focus();return;}if(!password||signup&&password.length<6){setError(signup?'비밀번호는 6자 이상으로 입력해주세요.':'비밀번호를 입력해주세요.');document.getElementById('un-login-password')?.focus();return;}setBusy(true);setError('');try{await onAuthenticate(address,password,signup);}catch(reason){setError(reason instanceof Error?reason.message:'로그인하지 못했어요. 다시 시도해주세요.');}finally{setBusy(false);}}}>
   <label htmlFor="un-login-email">이메일<input id="un-login-email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" value={email} maxLength={254} placeholder="name@example.com" aria-invalid={!!error&&error.includes('이메일')} aria-describedby={error?'un-login-error':undefined} onChange={e=>{setEmail(e.target.value);setError('');}}/></label>
   <label htmlFor="un-login-password">비밀번호<span className="un-password"><input id="un-login-password" autoComplete={signup?'new-password':'current-password'} type={show?'text':'password'} value={password} maxLength={100} placeholder="비밀번호 입력" aria-invalid={!!error&&error.includes('비밀번호')} aria-describedby={error?'un-login-error':undefined} onChange={e=>{setPassword(e.target.value);setError('');}}/><button type="button" aria-label={show?'비밀번호 숨기기':'비밀번호 보기'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
   {error&&<p id="un-login-error" role="alert">{error}</p>}
   <button className="un-primary" type="submit" disabled={busy||!enabled} aria-busy={busy}>{busy?'연결하고 있어요':signup?'가입하고 시작하기':'로그인'}<ArrowUpRight size={18}/></button>
   <button className="un-login-google" type="button" disabled>Google로 계속하기<span>준비 중</span></button>
   <button className="un-login-demo" type="button" onClick={()=>onEnter('나')}>예시 계정으로 둘러보기</button>
  </form><aside className="un-alpha-notice" aria-label="알파 테스트 안내"><strong>지금은 알파 테스트 중이에요</strong><p>테스트 가입은 별도의 이메일 인증 없이 진행됩니다. 테스트 종료 후에는 모든 데이터를 정식 서비스에서 사용할 수 있는 형태로 백업한 뒤, 테스트 데이터를 삭제할 예정입니다.</p></aside><p className="un-preview-disclosure">{enabled?'비밀번호는 Supabase 인증 서버에서 안전하게 관리합니다. 예시 계정의 기록은 실제 계정에 자동으로 합쳐지지 않습니다.':'계정 연결을 준비 중입니다. 예시 계정으로 화면을 둘러볼 수 있습니다.'}</p>
 </main>;
}
