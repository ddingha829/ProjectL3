'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {Download,Copy,Columns2,Share2,LoaderCircle,MessageCircle} from 'lucide-react';
import {downloadCardFile,isShareCanceled} from '@/lib/cardExport';
import {exportEditorialFace,exportEditorialMode,saveEditorialFiles,pairEditorialFiles,type EditorialExportMode} from './editorialExport';
import {prepareKakaoCard,warmKakao} from '@/lib/kakaoCardShare';
import './CardImageActions.css';
import ExportActionIcon from './ExportActionIcon';

type Mode=EditorialExportMode|'back';
type Progress={stage:string;completed:number;total:number;message:string};
export default function CardImageActions({root,title,hasPhoto}:{root:RefObject<HTMLElement|null>;title:string;hasPhoto:boolean}){
 const [busy,setBusy]=useState<Mode|null>(null),[error,setError]=useState(''),[progress,setProgress]=useState<Progress|null>(null),[ready,setReady]=useState<{mode:Mode;files:File[]}|null>(null),[sharing,setSharing]=useState(false);
 const lock=useRef(false),alive=useRef(true),shareLock=useRef(false);
 const [kakaoBusy,setKakaoBusy]=useState(false),[kakaoReady,setKakaoReady]=useState(false),[kakaoMessage,setKakaoMessage]=useState(''),kakaoOpen=useRef<(()=>void)|null>(null);
 useEffect(()=>{kakaoOpen.current=null;setKakaoReady(false);setKakaoMessage('');},[ready]);
 const kakao=async()=>{
  if(!ready||shareLock.current)return;shareLock.current=true;setKakaoBusy(true);setError('');
  try{if(!kakaoOpen.current){const file=ready.files.length>1?await pairEditorialFiles(ready.files[0],ready.files[1],'#ffffff',title):ready.files[0];const open=await prepareKakaoCard(file,title);if(!alive.current)return;kakaoOpen.current=open;setKakaoReady(true);}kakaoOpen.current();setKakaoMessage('카카오톡에서 받을 사람을 선택해주세요. 창이 안 열리면 한 번 더 눌러주세요.');}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'카카오톡 공유를 열지 못했어요.');}
  finally{shareLock.current=false;if(alive.current)setKakaoBusy(false);}
 };
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{void warmKakao().catch(()=>{});},[]);
 const report=(value:Progress)=>{if(alive.current)setProgress(value);};
 const zipProgress=(percent:number)=>report({stage:'zip',completed:percent,total:100,message:`ZIP ${Math.round(percent)}%`});
 const save=async(mode:Mode)=>{
  if(lock.current||!root.current)return;lock.current=true;setBusy(mode);setReady(null);setError('');report({stage:mode==='back'?'back':'front',completed:0,total:mode==='pair'?3:mode==='carousel'?2:1,message:mode==='back'?'뒷면 준비 중':'앞면 준비 중'});
  try{
   const files=mode==='back'?await exportEditorialFace(root.current,'back',title,(page,total)=>report({stage:'back',completed:page,total,message:`뒷면 ${page}/${total}장`})):await exportEditorialMode(root.current,mode,title,report);
   if(!alive.current)return;
   if(mode==='carousel')files.forEach(downloadCardFile);
   else {if(files.length>1)zipProgress(0);await saveEditorialFiles(files,title+'-'+mode,zipProgress);}
   if(alive.current){setReady({mode,files});report({stage:'done',completed:1,total:1,message:'준비 완료'});}
  }catch(e){if(alive.current){setReady(null);setProgress(null);setError(e instanceof Error?e.message:'이미지를 준비하지 못했어요.');}}
  finally{lock.current=false;if(alive.current)setBusy(null);}
 };
 const share=async()=>{
  if(!ready||shareLock.current)return;shareLock.current=true;setSharing(true);setError('');
  try{await navigator.share({files:ready.files});}
  catch(e){if(alive.current&&!isShareCanceled(e))setError('기기 공유를 열지 못했어요. 이미지 저장을 이용해주세요.');}
  finally{shareLock.current=false;if(alive.current)setSharing(false);}
 };
 const zip=async()=>{
  if(!ready||lock.current)return;lock.current=true;setBusy('carousel');zipProgress(0);setError('');
  try{await saveEditorialFiles(ready.files,title+'-carousel',zipProgress);report({stage:'done',completed:1,total:1,message:'준비 완료'});}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'ZIP 파일을 만들지 못했어요. 각각 저장을 이용해주세요.');}
  finally{lock.current=false;if(alive.current)setBusy(null);}
 };
 const canShare=Boolean(ready&&typeof navigator!=='undefined'&&navigator.canShare?.({files:ready.files}));
 const disabled=Boolean(busy)||sharing||kakaoBusy;
 const done=(mode:Mode)=>Boolean(!error&&!busy&&ready?.mode===mode);
 const icon=(mode:Mode,fallback:React.ReactNode)=><ExportActionIcon working={busy===mode} done={done(mode)} stage={busy===mode?progress?.stage||'':''}>{fallback}</ExportActionIcon>;
 const buttonState=(mode:Mode)=>busy===mode?'working':done(mode)?'ready':'idle';
 return <div className="lab-image-actions lab-export-actions" data-export-stage={busy?progress?.stage:ready&&!error?'done':error?'error':'idle'}>
  <div className="lab-kakao-share"><button type="button" disabled={disabled||!ready} onClick={()=>void kakao()}><MessageCircle size={18} fill="currentColor"/>{kakaoBusy?'카카오톡 준비 중':kakaoReady?'카카오톡 다시 열기':'카카오톡 공유'}</button><small>{ready?ready.files.length>1?'앞뒤 2장은 합본 이미지로 공유해요.':'준비한 카드 이미지를 카카오톡으로 보내요.':'아래에서 공유할 이미지 형태를 먼저 골라주세요.'}</small>{kakaoMessage&&<p role="status">{kakaoMessage}</p>}</div>
  {hasPhoto?<div className="lab-export-modes" aria-label="이미지 내보내기 방식">
   <button aria-label="앞면 이미지 저장" aria-busy={busy==='front'} data-export-state={buttonState('front')} disabled={disabled} onClick={()=>void save('front')}>{icon('front',<Download size={17}/>)}<b>앞면 1장</b><small>{busy==='front'?progress?.message:done('front')?'준비 완료':'포토 카드'}</small></button>
   <button aria-label="앞면·뒷면 2장 저장" aria-busy={busy==='carousel'} data-export-state={buttonState('carousel')} disabled={disabled} onClick={()=>void save('carousel')}>{icon('carousel',<Copy size={17}/>)}<b>앞뒤 2장</b><small>{busy==='carousel'?progress?.message:done('carousel')?'준비 완료':'캐러셀용'}</small></button>
   <button aria-label="앞뒤 합본 1장 저장" aria-busy={busy==='pair'} data-export-state={buttonState('pair')} disabled={disabled} onClick={()=>void save('pair')}>{icon('pair',<Columns2 size={17}/>)}<b>합본 1장</b><small>{busy==='pair'?progress?.message:done('pair')?'준비 완료':'나란히 배치'}</small></button>
  </div>:<button className="lab-export-single" aria-label="타이포그래피 카드 이미지 저장" aria-busy={busy==='back'} data-export-state={buttonState('back')} disabled={disabled} onClick={()=>void save('back')}>{icon('back',<Download size={17}/>)}카드 이미지 저장</button>}
  {hasPhoto&&<button className="lab-export-full" aria-label="뒷면 이미지 저장" aria-busy={busy==='back'} data-export-state={buttonState('back')} disabled={disabled} onClick={()=>void save('back')}><span className="lab-export-full-label">{icon('back',<Download size={14}/>)}뒷면 전체 저장</span><span>{busy==='back'?progress?.message:done('back')?'준비 완료':'긴 리뷰는 여러 장 ZIP'}</span></button>}
  {busy&&<div className="lab-export-progress"><p role="status"><LoaderCircle size={14} className="lab-spin"/>이미지 준비 중 {progress?.message}</p><div role="progressbar" aria-label={progress?.stage==='zip'?'ZIP 압축 진행률':'이미지 준비 단계'} aria-valuemin={0} aria-valuemax={progress?.total||1} aria-valuenow={progress?.completed||0} aria-valuetext={progress?.message}><i style={{transform:`scaleX(${Math.min(1,(progress?.completed||0)/(progress?.total||1))})`}}/></div></div>}
  {ready&&<div className="lab-export-ready"><p role="status">{ready.mode==='carousel'?'앞면 → 뒷면 순서로 PNG 2장이 준비됐어요.':`${ready.files.length}장의 이미지가 준비됐어요.`}</p>{ready.mode==='carousel'&&<><small>연속 저장이 제한된 기기에서는 아래에서 각각 저장할 수 있어요.</small><div className="lab-export-file-actions">{ready.files.map((file,index)=><button key={file.name} disabled={disabled} onClick={()=>downloadCardFile(file)}>{index===0?'① 앞면 저장':'② 뒷면 저장'}</button>)}<button disabled={disabled} onClick={()=>void zip()}>2장 ZIP 저장</button></div></>}{canShare&&<button disabled={disabled} onClick={()=>void share()}><Share2 size={15}/>{sharing?'공유 중':'기기 공유'}</button>}</div>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
