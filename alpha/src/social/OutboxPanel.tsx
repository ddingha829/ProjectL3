'use client';
import type {LabLog} from './model';
import type {TransportMode} from './shareTransport';
import PublicationStatus from './PublicationStatus';
import './PublicationStatus.css';

export default function OutboxPanel({logs,mode,onMode,onRetry,onKeep}:{logs:LabLog[];mode:TransportMode;onMode:(mode:TransportMode)=>void;onRetry:(log:LabLog)=>void;onKeep:(log:LabLog)=>void}){
 return <>
  <p className="lab-outbox-note">공유가 끝나지 않은 로그는 본인에게만 보여요. 기기에 저장한 원본은 그대로 유지합니다.</p>
  <div className="lab-transport-controls"><span>모의 전송 조건</span><div role="group" aria-label="모의 전송 조건">{([['normal','정상'],['fail','실패'],['paused','대기']] as const).map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>onMode(value)}>{label}</button>)}</div><small>{mode==='normal'?'연결되어 있으면 대기 중인 로그를 모의 전송해요.':mode==='fail'?'전송 실패 화면을 시험해요. 정상으로 바꾼 뒤 다시 시도하세요.':'전송을 멈추고 대기 상태를 유지해요. 정상으로 바꾸면 이어서 진행해요.'}</small></div>
  <div className="lab-outbox-list">{logs.length?logs.map(log=><article key={log.id} data-outbox-log={log.id}><h3>{log.title||log.body.slice(0,35)||'사진으로 남긴 순간'}</h3><PublicationStatus log={log} onRetry={()=>onRetry(log)} onKeep={()=>onKeep(log)}/></article>):<div className="lab-empty"><h3>대기 중인 공유가 없어요</h3><p>모임에 남긴 새 로그의 전송 상태를 여기서 확인할 수 있어요.</p></div>}</div>
 </>;
}
