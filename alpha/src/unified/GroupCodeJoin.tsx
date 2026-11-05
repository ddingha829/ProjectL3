'use client';
import {useRef,useState} from 'react';
import {normalizeInviteCode} from './inviteCodeInput';
import {ArrowRight,KeyRound,LoaderCircle} from 'lucide-react';
export default function GroupCodeJoin({enabled,pending,join,onJoined,onBusyChange}:{enabled:boolean;pending:boolean;join:(code:string)=>Promise<string>;onJoined:(id:string)=>void;onBusyChange?:(busy:boolean)=>void}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false),input=useRef<HTMLInputElement>(null);
 return <form className="un-code-join" noValidate onSubmit={async event=>{event.preventDefault();if(lock.current)return;const submitted=normalizeInviteCode(input.current?.value||code);setCode(submitted);if(submitted.length!==6){setError('초대 코드는 영문·숫자 6자리예요. 현재 '+submitted.length+'자리가 입력됐어요.');return;}if(!enabled){setError('실제 계정으로 로그인한 뒤 참여해주세요.');return;}if(pending){setError('저장 중이거나 아직 반영되지 않은 변경이 있어요. 모임 창을 닫고 저장 안내에서 다시 반영한 뒤 참여해주세요.');return;}lock.current=true;setBusy(true);onBusyChange?.(true);setError('');try{const id=await join(submitted);setCode('');onJoined(id);}catch(error){setError(error instanceof Error?error.message:'코드를 확인하고 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);onBusyChange?.(false);}}}>
  <label htmlFor="un-group-code"><KeyRound size={16}/>초대 코드</label>
  <div><input ref={input} id="un-group-code" aria-label="6자리 초대 코드" aria-describedby="un-code-help" aria-invalid={!!error} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="A7K3M9" maxLength={64} value={code} disabled={!enabled||busy} onChange={e=>{setCode(normalizeInviteCode(e.target.value));setError('');}}/><button className="un-primary" type="submit" disabled={busy}>{busy?<LoaderCircle size={17} className="lab-spin"/>:<ArrowRight size={17}/>}<span>{busy?'참여 중':'참여'}</span></button></div>
  <small id="un-code-help">{!enabled?'실제 계정으로 로그인하면 코드로 참여할 수 있어요.':pending?'미반영 변경이 있어요. 저장을 완료한 뒤 참여할 수 있어요.':'호스트에게 받은 영문·숫자 6자리를 입력하세요.'}</small>{error&&<p role="alert">{error}</p>}
 </form>;
}
