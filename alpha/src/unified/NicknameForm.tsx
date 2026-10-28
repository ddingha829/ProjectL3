'use client';
import {useRef,useState} from 'react';
import {normalizeNickname} from './nickname';
import TicgleWordmark from '@/components/TicgleBrand';
import './AuthScreen.css';
import './NicknameForm.css';
export function NicknameForm({initialName='',onSave,busy=false,first=false}:{initialName?:string;onSave:(name:string)=>Promise<void>;busy?:boolean;first?:boolean}){
 const [value,setValue]=useState(initialName),[error,setError]=useState(''),[saving,setSaving]=useState(false),lock=useRef(false);
 return <form className="un-auth-form un-nickname-form" noValidate onSubmit={async e=>{e.preventDefault();if(lock.current||busy)return;setError('');try{const name=normalizeNickname(value);lock.current=true;setSaving(true);await onSave(name);}catch(reason){setError(reason instanceof Error?reason.message:'저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setSaving(false);}}}>
  <label>닉네임<input name="nickname" autoComplete="nickname" autoCapitalize="none" value={value} disabled={busy||saving} placeholder="어떻게 불러드릴까요?" aria-invalid={!!error} aria-describedby="nickname-help nickname-error" onChange={e=>{setValue(e.target.value);setError('');}}/></label>
  <p id="nickname-help" className="un-nickname-help">카드와 모임에 표시되는 이름이에요. 1~30자로 입력해주세요.</p>
  <p id="nickname-error" className="un-auth-error" role="alert">{error}</p>
  <button className="un-nickname-save" type="submit" disabled={busy||saving}>{busy||saving?'저장하고 있어요…':first?'티끌 시작하기':'닉네임 저장'}</button>
 </form>;
}
export default function NicknameSetup({onSave,onLogout,busy,initialName}:{onSave:(name:string)=>Promise<void>;onLogout:()=>void;busy:boolean;initialName?:string}){
 return <main className="un-login un-auth-screen"><section className="un-auth-panel"><TicgleWordmark/><h1 className="un-auth-heading">어떻게 불러드릴까요?</h1><NicknameForm first initialName={initialName} onSave={onSave} busy={busy}/><button className="un-nickname-logout" disabled={busy} onClick={onLogout}>다른 계정으로 로그인</button></section></main>;
}
