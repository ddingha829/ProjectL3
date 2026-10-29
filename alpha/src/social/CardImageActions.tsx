'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {Download,Copy,Columns2,Share2,LoaderCircle,MessageCircle,Image as ImageIcon,Check} from 'lucide-react';
import {downloadCardFile,isShareCanceled} from '@/lib/cardExport';
import {exportEditorialFace,exportEditorialMode,saveEditorialFiles,pairEditorialFiles,type EditorialExportMode} from './editorialExport';
import {prepareKakaoCard,warmKakao} from '@/lib/kakaoCardShare';
import './CardImageActions.css';
import ExportActionIcon from './ExportActionIcon';

type Mode=EditorialExportMode|'back';
type Progress={stage:string;completed:number;total:number;message:string};
const modeName:Record<Mode,string>={front:'앞면 1장',carousel:'앞뒤 2장',pair:'합본 1장',back:'뒷면 전체'};
export default function CardImageActions({root,title,hasPhoto}:{root:RefObject<HTMLElement|null>;title:string;hasPhoto:boolean}){
 const [busy,setBusy]=useState<Mode|null>(null),[error,setError]=useState(''),[progress,setProgress]=useState<Progress|null>(null),[ready,setReady]=useState<{mode:Mode;files:File[]}|null>(null),[sharing,setSharing]=useState(false);
 const lock=useRef(false),alive=useRef(true),shareLock=useRef(false),prepared=useRef(new Map<Mode,File[]>());
 const [kakaoBusy,setKakaoBusy]=useState(false),[kakaoReady,setKakaoReady]=useState(false),[kakaoMessage,setKakaoMessage]=useState(''),kakaoOpen=useRef<(()=>void)|null>(null);
 useEffect(()=>{kakaoOpen.current=null;setKakaoReady(false);setKakaoMessage('');},[ready]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{void warmKakao().catch(()=>{});},[]);
 const report=(value:Progress)=>{if(alive.current)setProgress(value);};
 const zipProgress=(percent:number)=>report({stage:'zip',completed:percent,total:100,message:`ZIP ${Math.round(percent)}%`});
 const prepare=async(mode:Mode)=>{
  if(lock.current||shareLock.current||!root.current)return;lock.current=true;setBusy(mode);setReady(null);setError('');report({stage:mode==='back'?'back':'front',completed:0,total:mode==='pair'?3:mode==='carousel'?2:1,message:mode==='back'?'뒷면 준비 중':'앞면 준비 중'});
  try{
   const cached=prepared.current.get(mode),files=cached||(mode==='back'?await exportEditorialFace(root.current,'back',title,(page,total)=>report({stage:'back',completed:page,total,message:`뒷면 ${page}/${total}장`})):await exportEditorialMode(root.current,mode,title,report));
   if(!alive.current)return;prepared.current.set(mode,files);setReady({mode,files});report({stage:'done',completed:1,total:1,message:'준비 완료'});
  }catch(e){if(alive.current){setProgress(null);setError(e instanceof Error?e.message:'이미지를 준비하지 못했어요.');}}
  finally{lock.current=false;if(alive.current)setBusy(null);}
 };
 const kakao=async()=>{
  if(!ready||shareLock.current)return;shareLock.current=true;setKakaoBusy(true);setError('');
  try{if(!kakaoOpen.current){const file=ready.files.length>1?await pairEditorialFiles(ready.files[0],ready.files[1],'#ffffff',title):ready.files[0];const open=await prepareKakaoCard(file,title);if(!alive.current)return;kakaoOpen.current=open;setKakaoReady(true);}kakaoOpen.current();setKakaoMessage('카카오톡에서 받을 사람을 선택해주세요. 열리지 않으면 아래 버튼을 다시 눌러주세요.');}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'카카오톡 공유를 열지 못했어요.');}
  finally{shareLock.current=false;if(alive.current)setKakaoBusy(false);}
 };
 const share=async()=>{
  if(!ready||shareLock.current)return;shareLock.current=true;setSharing(true);setError('');
  try{await navigator.share({files:ready.files});}
  catch(e){if(alive.current&&!isShareCanceled(e))setError('기기 공유를 열지 못했어요. 이미지 저장을 이용해주세요.');}
  finally{shareLock.current=false;if(alive.current)setSharing(false);}
 };
 const save=async()=>{
  if(!ready||lock.current)return;lock.current=true;setBusy(ready.mode);setError('');if(ready.files.length>1)zipProgress(0);
  try{await saveEditorialFiles(ready.files,title+'-'+ready.mode,zipProgress);report({stage:'done',completed:1,total:1,message:'이미지를 저장했어요.'});}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'이미지를 저장하지 못했어요.');}
  finally{lock.current=false;if(alive.current)setBusy(null);}
 };
 const canShare=Boolean(ready&&typeof navigator!=='undefined'&&navigator.canShare?.({files:ready.files})),disabled=Boolean(busy)||sharing||kakaoBusy;
 const selected=(mode:Mode)=>ready?.mode===mode||busy===mode;
 const icon=(mode:Mode,fallback:React.ReactNode)=><ExportActionIcon working={busy===mode} done={ready?.mode===mode&&!busy} stage={busy===mode?progress?.stage||'':''}>{fallback}</ExportActionIcon>;
 return <div className="lab-image-actions lab-export-actions lab-share-flow" data-export-stage={busy?progress?.stage:ready&&!error?'done':error?'error':'idle'}>
  <p className="lab-share-step"><span>1</span>공유할 모양을 골라주세요</p>
  {hasPhoto?<div className="lab-export-modes" aria-label="공유 형태 선택">
   {([['front','앞면 1장','사진 카드',ImageIcon],['carousel','앞뒤 2장','각각 공유',Copy],['pair','합본 1장','나란히 배치',Columns2]] as const).map(([mode,label,description,Icon])=><button key={mode} type="button" aria-label={label+' 선택'} aria-pressed={selected(mode)} aria-busy={busy===mode} data-export-state={busy===mode?'working':ready?.mode===mode?'ready':'idle'} disabled={disabled} onClick={()=>void prepare(mode)}>{icon(mode,<Icon size={19}/>)}<b>{label}</b><small>{busy===mode?progress?.message:ready?.mode===mode?'선택됨':description}</small></button>)}
  </div>:<button type="button" className="lab-export-single" aria-label="글 카드 선택" aria-pressed={selected('back')} disabled={disabled} onClick={()=>void prepare('back')}>{icon('back',<ImageIcon size={17}/>)}글 카드</button>}
  {hasPhoto&&<button type="button" className="lab-export-full" aria-label="뒷면 전체 선택" aria-pressed={selected('back')} disabled={disabled} onClick={()=>void prepare('back')}><span className="lab-export-full-label">{icon('back',<Copy size={15}/>)}뒷면 전체</span><span>긴 리뷰는 여러 장으로</span></button>}
  {busy&&<div className="lab-export-progress"><p role="status"><LoaderCircle size={14} className="lab-spin"/>{progress?.message||'이미지 준비 중'}</p><div role="progressbar" aria-label="이미지 준비 단계" aria-valuemin={0} aria-valuemax={progress?.total||1} aria-valuenow={progress?.completed||0} aria-valuetext={progress?.message}><i style={{transform:`scaleX(${Math.min(1,(progress?.completed||0)/(progress?.total||1))})`}}/></div></div>}
  {ready&&!busy&&<section className="lab-share-destinations" aria-label="공유·저장 방법 선택">
   <p className="lab-share-step"><span>2</span>공유하거나 저장하세요<small><Check size={12}/>{modeName[ready.mode]}</small></p>
   <div className="lab-kakao-share"><button type="button" disabled={disabled} onClick={()=>void kakao()}><MessageCircle size={18} fill="currentColor"/>{kakaoBusy?'카카오톡 준비 중':kakaoReady?'카카오톡 다시 열기':'카카오톡 공유'}</button>{ready.files.length>1&&<small>카카오톡에는 {ready.files.length>2?'첫 두 장을':'앞뒤를'} 나란히 붙여 보내요.</small>}{kakaoMessage&&<p role="status">{kakaoMessage}</p>}</div>
   <div className="lab-share-secondary">{canShare&&<button type="button" disabled={disabled} onClick={()=>void share()}><Share2 size={17}/>{sharing?'공유 중':'다른 앱으로 공유'}</button>}<button type="button" disabled={disabled} onClick={()=>void save()}><Download size={17}/>{ready.files.length>1?'이미지 ZIP 저장':'이미지 저장'}</button></div>
   {ready.files.length>1&&<details className="lab-share-individual"><summary>한 장씩 저장</summary><div className="lab-export-file-actions">{ready.files.map((file,index)=><button type="button" key={file.name} disabled={disabled} onClick={()=>downloadCardFile(file)}>{ready.mode==='carousel'?(index===0?'앞면':'뒷면'):`${index+1}번째 이미지`}</button>)}</div></details>}
  </section>}
  {!ready&&!busy&&!error&&<p className="lab-share-hint">선택한 모양으로 이미지를 준비한 뒤 공유할 수 있어요.</p>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
