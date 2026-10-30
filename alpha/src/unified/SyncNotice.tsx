'use client';
import {useEffect,useLayoutEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {AlertCircle,ChevronUp,LoaderCircle,RefreshCw,X} from 'lucide-react';
import {getDialogSurface} from '@/lib/dialogIsolation';
import './SyncNotice.css';

export default function SyncNotice({message,failed,busy,onDismiss,onRetry,onRecover}:{message:string;failed:boolean;busy:boolean;onDismiss:()=>void;onRetry:()=>void;onRecover:()=>void}){
 const [host,setHost]=useState<HTMLElement|null>(null),[collapsed,setCollapsed]=useState(false);
 useLayoutEffect(()=>{const update=()=>setHost(getDialogSurface()||document.body);update();window.addEventListener('l2:dialog-stack-change',update);return()=>window.removeEventListener('l2:dialog-stack-change',update);},[]);
 useEffect(()=>{if(message)setCollapsed(false);},[message]);
 if(!host)return null;
 const dismiss=()=>{setCollapsed(true);onDismiss();};
 return createPortal(<div className="un-sync-notice-anchor" data-in-dialog={host!==document.body}>
  {collapsed&&failed?<button className="un-sync-collapsed" onClick={()=>setCollapsed(false)} aria-label="미반영 변경 안내 다시 열기"><AlertCircle size={16}/>미반영 변경<ChevronUp size={14}/></button>:<section className="un-sync-notice" aria-label={failed?'저장하지 못한 변경':'연결 안내'}>
   <div className="un-sync-notice-head"><strong><AlertCircle size={17}/>{failed?'저장하지 못한 변경이 있어요':'연결을 확인해주세요'}</strong><button type="button" aria-label="오류 안내 닫기" onClick={dismiss}><X size={19}/></button></div>
   <p role="alert">{message||'저장하지 못한 변경은 이 기기에 보관되어 있어요. 다시 시도할 수 있어요.'}</p>
   {failed&&<div className="un-sync-notice-actions"><button type="button" disabled={busy} onClick={onRetry}>{busy?<LoaderCircle className="lab-spin" size={16}/>:<RefreshCw size={16}/>}다시 시도</button><button type="button" disabled={busy} onClick={onRecover}>백업 후 복구</button></div>}
  </section>}
 </div>,host);
}
