'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AnimatePresence,motion,useIsPresent} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import {useAuthMotion} from './AuthMotion';
import {ArrowRight,ChevronDown,Eye,EyeOff,Info} from 'lucide-react';
import SlideArrowButton from '@/components/tweenui/slide-arrow-button';
import './AuthScreen.css';
import {newPasswordProblem} from './passwordChange';
import AlphaSupport from './AlphaSupport';
import TicgleWordmark from '@/components/TicgleBrand';

const AuthSubmit=motion.create(SlideArrowButton);
function SignupFields({children,reduced}:{children:ReactNode;reduced:boolean}){const present=useIsPresent();return <motion.div className="un-auth-signup-fields" inert={!present||undefined} aria-hidden={!present||undefined} initial={reduced?false:{height:0,opacity:0,y:6}} animate={{height:'auto',opacity:1,y:0}} exit={{height:0,opacity:0,y:-6}} transition={reduced?instantMotion:INTERACTION_SPRING}>{children}</motion.div>;}
export default function PreviewLogin({onEnter,onAuthenticate,onResetPassword,enabled=false}:{onEnter:(name:string)=>void;onAuthenticate:(email:string,password:string,signup:boolean)=>Promise<void>;onResetPassword:(email:string)=>Promise<void>;enabled?:boolean}){
 const reduced=useMotionPreference(),authMotion=useAuthMotion();
 const [support,setSupport]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[showConfirmation,setShowConfirmation]=useState(false),[show,setShow]=useState(false),[error,setError]=useState(''),[signup,setSignup]=useState(false),[busy,setBusy]=useState(false);
 const [recovery,setRecovery]=useState(false),[resetSent,setResetSent]=useState(false);
 const requestInFlight=useRef(false),[complete,setComplete]=useState(false),[slow,setSlow]=useState(false);
 const locked=busy||complete;
 useEffect(()=>{if(!busy){setSlow(false);return;}const timer=setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer);},[busy]);
 const switchMode=()=>{if(locked||requestInFlight.current)return;if(recovery){setRecovery(false);setResetSent(false);setSignup(false);}else setSignup(value=>!value);setShow(false);setShowConfirmation(false);setError('');setPassword('');setConfirmation('');};
 const title=recovery?'비밀번호 찾기':signup?'회원가입':'로그인';
 const submitLabel=complete?'완료 · 티끌 여는 중':busy?recovery?'메일 보내는 중':signup?'계정 만드는 중':'로그인 중':recovery?'재설정 메일 받기':signup?'계정 만들기':'로그인';
 return <><main className="un-login un-auth-screen"><motion.section className="un-auth-panel" aria-labelledby="un-auth-title" initial={reduced?false:{y:14,opacity:0}} animate={{y:0,opacity:1}} transition={reduced?instantMotion:INTERACTION_SPRING}>
  <TicgleWordmark/>
  <h1 id="un-auth-title" className="un-auth-heading"><motion.span key={title} initial={reduced?false:{y:signup?12:-12,opacity:0}} animate={{y:0,opacity:1}} transition={reduced?instantMotion:INTERACTION_SPRING}>{title}</motion.span></h1><aside className="un-auth-alpha-notice" aria-label="알파 테스트 안내"><strong>지금은 알파 테스트 중이에요</strong><p>이메일 인증 없이 바로 가입할 수 있어요. 테스트 종료 후 모든 데이터는 정식 서비스용으로 백업한 뒤 삭제합니다.</p></aside>
  {resetSent?<p className="un-auth-message" role="status">가입된 주소라면 비밀번호 재설정 메일을 보내드렸어요. 받은 편지함과 스팸함을 확인해주세요.</p>:<form className="un-auth-form" aria-label={title} noValidate onSubmit={async event=>{
   event.preventDefault();if(requestInFlight.current||locked||!enabled)return;
   // Read the submitted controls too: iOS password-manager autofill can update
   // their DOM values before React receives an input/change event.
   const fields=new FormData(event.currentTarget),address=String(fields.get('email')||'').trim().toLowerCase(),submittedPassword=String(fields.get('password')||'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setError('올바른 이메일 주소를 입력해주세요.');document.getElementById('un-login-email')?.focus();return;}
   if(!recovery&&(!submittedPassword||signup&&submittedPassword.length<6)){setError(signup?'비밀번호는 6자 이상으로 입력해주세요.':'비밀번호를 입력해주세요.');document.getElementById('un-login-password')?.focus();return;}
   if(signup&&!recovery){const issue=newPasswordProblem(submittedPassword,String(fields.get('passwordConfirmation')||''));if(issue){setError(issue.message);document.getElementById(issue.field==='confirmation'?'un-signup-confirmation':'un-login-password')?.focus();return;}}
   requestInFlight.current=true;setBusy(true);setError('');
   try{
    if(recovery){await onResetPassword(address);setResetSent(true);requestInFlight.current=false;}
    else{authMotion?.begin(signup,event.currentTarget.querySelector<HTMLButtonElement>('[type=submit]')?.getBoundingClientRect());if(document.activeElement instanceof HTMLElement)document.activeElement.blur();await onAuthenticate(address,submittedPassword,signup);authMotion?.approve();setComplete(true);}
   }catch(reason){if(!recovery)authMotion?.fail();requestInFlight.current=false;setError(reason instanceof Error?reason.message:'요청을 완료하지 못했어요. 다시 시도해주세요.');}
   finally{setBusy(false);}
  }}>
   <label htmlFor="un-login-email">이메일<input id="un-login-email" name="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" required disabled={locked} value={email} maxLength={254} placeholder="name@example.com" aria-invalid={!!error&&error.includes('이메일')} aria-describedby={error?'un-login-error':undefined} onChange={event=>{setEmail(event.target.value);setError('');}}/></label>
   {!recovery&&<label htmlFor="un-login-password">비밀번호<span className="un-auth-password"><input id="un-login-password" name="password" autoComplete={signup?'new-password':'current-password'} type={show?'text':'password'} required disabled={locked} value={password} maxLength={100} placeholder={signup?'6자 이상 입력':'비밀번호 입력'} aria-invalid={!!error&&error.includes('비밀번호')} aria-describedby={[signup?'un-signup-password-help':'',error?'un-login-error':''].filter(Boolean).join(' ')||undefined} onChange={event=>{setPassword(event.target.value);setError('');}}/><button type="button" aria-label={show?'비밀번호 숨기기':'비밀번호 보기'} aria-pressed={show} disabled={locked} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={18} strokeWidth={1.6}/>:<Eye size={18} strokeWidth={1.6}/>}</button></span></label>}
   <AnimatePresence initial={false}>{signup&&!recovery&&<SignupFields key="signup-fields" reduced={reduced}>
   <p className="un-signup-password-help" id="un-signup-password-help">비밀번호는 6자 이상 입력해주세요.</p>
   <label htmlFor="un-signup-confirmation">비밀번호 확인<span className="un-auth-password"><input id="un-signup-confirmation" name="passwordConfirmation" autoComplete="new-password" type={showConfirmation?'text':'password'} required disabled={locked} value={confirmation} maxLength={100} placeholder="비밀번호를 한 번 더 입력" aria-invalid={!!error&&/확인란|일치/.test(error)} aria-describedby={error?'un-login-error':undefined} onChange={event=>{setConfirmation(event.target.value);setError('');}}/><button type="button" aria-label={showConfirmation?'확인 비밀번호 숨기기':'확인 비밀번호 보기'} aria-pressed={showConfirmation} disabled={locked} onClick={()=>setShowConfirmation(value=>!value)}>{showConfirmation?<EyeOff size={18} strokeWidth={1.6}/>:<Eye size={18} strokeWidth={1.6}/>}</button></span></label>
   </SignupFields>}</AnimatePresence>
   {!signup&&!recovery&&<button className="un-auth-forgot" type="button" disabled={locked} onClick={()=>{setRecovery(true);setPassword('');setError('');}}>비밀번호 찾기</button>}
   {error&&<motion.p className="un-auth-error" id="un-login-error" role="alert" initial={reduced?false:{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={reduced?instantMotion:INTERACTION_SPRING}>{error}</motion.p>}
   <AuthSubmit whileTap={reduced?undefined:{scale:.98}} transition={reduced?instantMotion:INTERACTION_SPRING} className="un-auth-submit" type="submit" pending={locked} disabled={!enabled||locked} aria-label={submitLabel}>{submitLabel}</AuthSubmit>
   {locked&&<p className="un-auth-progress" role="status">{complete?'완료했어요. 내 티끌을 불러오고 있어요.':slow?'응답이 늦어지고 있어요. 다시 누르지 않아도 처리 중이에요.':recovery?'재설정 메일을 요청하고 있어요.':signup?'계정을 만들고 있어요. 잠시만 기다려주세요.':'로그인하고 있어요. 잠시만 기다려주세요.'}</p>}
  </form>}
  <p className="un-auth-switch">{!recovery&&<span>{signup?'이미 계정이 있나요?':'처음이신가요?'}</span>}<motion.button type="button" whileTap={reduced?undefined:{scale:.96}} transition={reduced?instantMotion:INTERACTION_SPRING} disabled={locked} onClick={switchMode}>{recovery?'로그인으로 돌아가기':signup?'로그인':'회원가입'}</motion.button></p>

  <footer className="un-auth-footer">{!recovery&&<button className="un-auth-demo" type="button" aria-label="예시 계정으로 먼저 둘러보기" disabled={locked} onClick={()=>onEnter('나')}>먼저 둘러보기<ArrowRight size={15} strokeWidth={1.5}/></button>}<button className="un-auth-feedback" onClick={()=>setSupport(true)}>문제 알리기</button>{!enabled&&<p className="un-auth-connection" role="status">계정 연결을 준비 중입니다. 먼저 둘러보기로 화면을 확인할 수 있어요.</p>}</footer>
 </motion.section></main><AlphaSupport open={support} onClose={()=>setSupport(false)} initialTab="report"/></>;
}
