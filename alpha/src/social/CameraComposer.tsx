'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Camera,ImagePlus,Type,Clapperboard,BookOpen,ChevronUp,LoaderCircle} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import {compressPhotoBlob,blobToDataUrl} from '@/lib/imageCompression';
import type {Circle,LabLog,Person} from './model';
import Composer from './Composer';
import CameraSurface from './CameraSurface';
import WorkSearch from './WorkSearch';
import type {Work} from './taste';
import type {PhotoOrigin} from './LocationSuggestion';

type Props={storageMode?:'cloud'|'demo';initialWork?:Work;nearbyLogs?:LabLog[];actor:Person;circles:Circle[];audience:string|null;dark:boolean;onSave:(log:LabLog)=>boolean;onClose:()=>void};
export default function CameraComposer(p:Props){
 const [mode,setMode]=useState<'camera'|'work'|'text'|null>(p.initialWork?'work':null),[workKind,setWorkKind]=useState<'movie'|'book'|null>(null),[image,setImage]=useState(p.initialWork?.image||''),[editor,setEditor]=useState(Boolean(p.initialWork)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[cameraAttempt,setCameraAttempt]=useState(0),[origin,setOrigin]=useState<PhotoOrigin>(p.initialWork?'work':undefined),[activeWork,setActiveWork]=useState(p.initialWork);
 const [audienceIds,setAudienceIds]=useState<string[]>([]),[workChosen,setWorkChosen]=useState(Boolean(p.initialWork));
 const album=useRef<HTMLInputElement>(null),nativeCamera=useRef<HTMLInputElement>(null),alive=useRef(true),request=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
 const nativeInput=useCallback((input:HTMLInputElement|null)=>{nativeCamera.current=input;if(!input)return;const cancel=()=>setCameraAttempt(value=>value+1);input.addEventListener('cancel',cancel);return()=>{input.removeEventListener('cancel',cancel);nativeCamera.current=null;};},[]);
 const prepare=async(photo:Blob,source:PhotoOrigin='camera')=>{if(busy)return;const token=++request.current;setBusy(true);setError('');try{const data=await blobToDataUrl(await compressPhotoBlob(photo));if(alive.current&&token===request.current){setImage(data);setOrigin(source);setEditor(true);}}catch(e){if(alive.current&&token===request.current)setError(e instanceof Error?e.message:'사진을 준비하지 못했어요.');}finally{if(alive.current&&token===request.current)setBusy(false);}};
 const choose=(input:HTMLInputElement)=>{const files=Array.from(input.files||[]);input.value='';if(files.length>1){setError('사진은 한 장만 선택해주세요.');return;}if(files[0])void prepare(files[0],input.hasAttribute('capture')?'camera':'album');};
 const pickWork=(work:Work)=>{setWorkChosen(true);setActiveWork(work);setImage(work.image);setOrigin('work');setEditor(true);};
 if(!mode)return <AccessibleDialog open title="어떻게 남길까요?" onClose={p.onClose} panelClassName="lab-dialog un-entry-dialog"><div className="un-entry-options"><button onClick={()=>setMode('camera')}><Camera size={25} strokeWidth={1.6}/><span><strong>촬영하기</strong><small>사진으로 남기는 지금</small></span><ArrowUpRight size={18}/></button><button onClick={()=>setMode('work')}><Clapperboard size={25} strokeWidth={1.6}/><span><strong>작품 등록하기</strong><small>영화·드라마·책으로 남기는 취향</small></span><ArrowUpRight size={18}/></button><button onClick={()=>{setMode('text');setEditor(true);}}><Type size={25} strokeWidth={1.6}/><span><strong>글만 쓰기</strong><small>생각을 가볍게 한 줄</small></span><ArrowUpRight size={18}/></button></div></AccessibleDialog>;
 return <>
  {mode==='work'&&!workChosen?<AccessibleDialog open title={workKind?'작품 찾기':'어떤 작품인가요?'} onClose={p.onClose} panelClassName="lab-dialog un-entry-dialog"><button className="un-entry-back" onClick={()=>workKind?setWorkKind(null):setMode(null)}><ArrowLeft size={16}/>뒤로</button>{workKind?<WorkSearch key={workKind} kind={workKind} onSelect={pickWork}/>:<div className="un-entry-options"><button onClick={()=>setWorkKind('movie')}><Clapperboard size={25}/><span><strong>영화·드라마</strong><small>마음에 남은 장면</small></span><ArrowUpRight size={18}/></button><button onClick={()=>setWorkKind('book')}><BookOpen size={25}/><span><strong>책</strong><small>오래 간직하고 싶은 문장</small></span><ArrowUpRight size={18}/></button></div>}</AccessibleDialog>:<AccessibleDialog open title="오늘을 남겨요" hideTitle onClose={p.onClose} panelClassName={`lab-dialog lab-story-dialog un-story-v2${editor?' is-writing':''}${mode==='text'&&!image?' is-note':''}`}>
   <div className="lab-story-stage">
    <div className="lab-story-viewport">
     {image?<><div className="lab-story-photo-backdrop" aria-hidden="true" style={{backgroundImage:`url(${JSON.stringify(image)})`}}/><img className="lab-story-photo" src={image} alt="선택한 로그 사진"/></>:mode==='camera'?<CameraSurface key={cameraAttempt} active onCapture={photo=>prepare(photo,'camera')} onFallback={()=>nativeCamera.current?.click()}/>:<div className="un-note-backdrop" aria-hidden="true"><span>오늘의 한 페이지</span><i/></div>}
     <button className="un-story-back" aria-label="작성 방식 다시 선택" onClick={()=>{if(!confirm('작성 화면을 닫고 다른 방식으로 바꿀까요?'))return;setMode(null);setEditor(false);setImage('');setActiveWork(undefined);setWorkChosen(false);}}><ArrowLeft size={21}/></button>
     {busy&&<div className="lab-story-loading" role="status"><LoaderCircle className="lab-spin" size={25}/>사진을 준비하고 있어요</div>}
     {mode==='camera'&&!image&&<button className="lab-story-album un-camera-album" aria-label="앨범에서 사진 선택" disabled={busy} onClick={()=>album.current?.click()}><ImagePlus size={24}/></button>}
     {image&&<button className="un-photo-replace" aria-label="앨범에서 사진 선택" onClick={()=>album.current?.click()}><ImagePlus size={19}/><span>사진 바꾸기</span></button>}
     {error&&<p className="lab-camera-error" role="alert">{error}</p>}
    </div>
    <button className="un-story-sheet-hint" aria-label="글쓰기 열기" onClick={()=>setEditor(true)}><span/><ChevronUp size={18}/></button>
   </div>
   <input ref={album} type="file" accept="image/*" multiple={false} hidden aria-label="스토리 앨범 사진 선택" onChange={event=>choose(event.currentTarget)}/><input ref={nativeInput} type="file" accept="image/*" capture="environment" multiple={false} hidden aria-label="스토리 카메라 사진 촬영" onChange={event=>choose(event.currentTarget)}/>
  </AccessibleDialog>}
  <Composer storageMode={p.storageMode} initialWork={activeWork} onWorkChange={setActiveWork} photoOrigin={origin} nearbyLogs={p.nearbyLogs} actor={p.actor} circles={p.circles} audience={null} audienceIds={audienceIds} onAudienceIdsChange={setAudienceIds} dark={p.dark} open={editor} initialImage={image} onPhotoChange={setImage} onPhotoOriginChange={setOrigin} panelClassName="lab-story-editor un-story-editor-v2" onClose={()=>setEditor(false)} onSave={log=>{const saved=p.onSave(log);if(saved)p.onClose();return saved;}}/>
 </>;
}
