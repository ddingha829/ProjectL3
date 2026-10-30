'use client';
import {useRef,useState} from 'react';
import {Eye,EyeOff,Check} from 'lucide-react';
import {newPasswordProblem} from './passwordChange';
import './PasswordChangeForm.css';

type Props={onChangePassword:(current:string,password:string,confirmation:string)=>Promise<void>;onDone:()=>void;onBusyChange:(busy:boolean)=>void};
export default function PasswordChangeForm({onChangePassword,onDone,onBusyChange}:Props){
 const [values,setValues]=useState({current:'',password:'',confirmation:''}),[visible,setVisible]=useState<Record<string,boolean>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),lock=useRef(false);
 if(done)return <div className="un-password-done"><Check size={28} aria-hidden="true"/><p role="status">비밀번호를 변경했어요.</p><button type="button" className="un-primary un-full" onClick={onDone}>설정으로 돌아가기</button></div>;
 return <form className="un-password-change" aria-label="비밀번호 변경" noValidate onSubmit={async event=>{
  event.preventDefault();if(lock.current)return;setError('');
  const data=new FormData(event.currentTarget),current=String(data.get('current')||''),password=String(data.get('password')||''),confirmation=String(data.get('confirmation')||'');
  if(!current){setError('현재 비밀번호를 입력해주세요.');return;}
  const problem=newPasswordProblem(password,confirmation);if(problem){setError(problem.message);return;}
  lock.current=true;setBusy(true);onBusyChange(true);
  try{await onChangePassword(current,password,confirmation);setValues({current:'',password:'',confirmation:''});setVisible({});setDone(true);}catch(reason){setError(reason instanceof Error?reason.message:'비밀번호를 변경하지 못했어요. 다시 시도해주세요.');}
  finally{lock.current=false;setBusy(false);onBusyChange(false);}
 }}>
  <p className="un-subtle">현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요.</p>
  {([['current','현재 비밀번호','current-password'],['password','새 비밀번호','new-password'],['confirmation','새 비밀번호 확인','new-password']] as const).map(([key,label,autoComplete])=><label key={key}>{label}<span><input name={key} type={visible[key]?'text':'password'} autoComplete={autoComplete} required maxLength={100} disabled={busy} value={values[key]} placeholder={key==='password'?'6자 이상 입력':key==='confirmation'?'새 비밀번호를 한 번 더 입력':'현재 비밀번호 입력'} aria-describedby={error?'password-change-error':undefined} onChange={event=>{setValues(v=>({...v,[key]:event.target.value}));setError('');}}/><button type="button" disabled={busy} aria-label={`${label} ${visible[key]?'숨기기':'보기'}`} aria-pressed={!!visible[key]} onClick={()=>setVisible(v=>({...v,[key]:!v[key]}))}>{visible[key]?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>)}
  {error&&<p id="password-change-error" className="un-password-error" role="alert">{error}</p>}
  <button type="submit" className="un-primary un-full" disabled={busy}>{busy?'변경하고 있어요…':'비밀번호 변경'}</button>
  {busy&&<p role="status" className="un-subtle">현재 비밀번호 확인 후 저장하고 있어요.</p>}
 </form>;
}
