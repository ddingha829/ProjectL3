'use client';
import {useRef,useState} from 'react';
import {ArrowRight,KeyRound,LoaderCircle} from 'lucide-react';
export default function GroupCodeJoin({enabled,pending,join,onJoined}:{enabled:boolean;pending:boolean;join:(code:string)=>Promise<string>;onJoined:(id:string)=>void}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 return <form className="un-code-join" onSubmit={async event=>{event.preventDefault();if(lock.current||pending||!enabled||code.length!==6)return;lock.current=true;setBusy(true);setError('');try{const id=await join(code);setCode('');onJoined(id);}catch(error){setError(error instanceof Error?error.message:'코드를 확인하고 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}}>
  <label htmlFor="un-group-code"><KeyRound size={16}/>초대 코드</label>
  <div><input id="un-group-code" aria-label="6자리 초대 코드" aria-describedby="un-code-help" aria-invalid={!!error} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="A7K3M9" maxLength={6} value={code} disabled={!enabled||busy} onChange={e=>{setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6));setError('');}}/><button className="un-primary" type="submit" disabled={!enabled||pending||busy||code.length!==6}>{busy?<LoaderCircle size={17} className="lab-spin"/>:<ArrowRight size={17}/>}<span>{busy?'참여 중':'참여'}</span></button></div>
  <small id="un-code-help">{enabled?'호스트에게 받은 영문·숫자 6자리를 입력하세요.':'실제 계정으로 로그인하면 코드로 참여할 수 있어요.'}</small>{error&&<p role="alert">{error}</p>}
 </form>;
}
