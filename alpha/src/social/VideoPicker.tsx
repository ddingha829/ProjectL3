'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,Film,ImagePlus,LoaderCircle,Play,Square} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import {configureCloud} from '@/unified/cloudRepository';
import {VIDEO_SOURCE_LIMIT,validVideo,type VideoClip} from '@/lib/video';
import './VideoPicker.css';
import CameraSurface from './CameraSurface';
import {cameraVideoPoster} from './cameraVideo';
export type VideoAttachment={video:VideoClip;image:string;imagePath:string};
export default function VideoPicker({cloud,onDone,onClose,initialFile,onCaptured,background=false}:{onCaptured?:(file:File)=>void;background?:boolean;initialFile?:File;cloud:boolean;onDone:(asset:VideoAttachment)=>void;onClose:()=>void}){
 const [file,setFile]=useState<File|undefined>(initialFile),[autoFile,setAutoFile]=useState<File|undefined>(initialFile),[cameraClip,setCameraClip]=useState(Boolean(initialFile)),[captureOpen,setCaptureOpen]=useState(false),[url,setUrl]=useState(''),[duration,setDuration]=useState(0),[start,setStart]=useState(0),[playing,setPlaying]=useState(false),[phase,setPhase]=useState(''),[error,setError]=useState('');
 const player=useRef<HTMLVideoElement>(null),album=useRef<HTMLInputElement>(null),alive=useRef(true),lock=useRef(false),cancel=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cancel.current?.abort();};},[]);
 useEffect(()=>{if(!file||cameraClip){setUrl('');return;}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file,cameraClip]);
 const choose=(input:HTMLInputElement)=>{const chosen=input.files?.[0];input.value='';if(!chosen)return;if(chosen.size>VIDEO_SOURCE_LIMIT){setError('50MB 이하의 영상을 선택해주세요.');return;}setError('');setCameraClip(false);setAutoFile(undefined);setDuration(0);setStart(0);setPlaying(false);setFile(chosen);};
 const valid=duration>=2&&duration<=120;
 const preview=async()=>{const video=player.current;if(!video)return;if(playing){video.pause();setPlaying(false);return;}video.currentTime=start;try{await video.play();setPlaying(true);}catch{setError('미리보기를 시작하지 못했어요. 다시 눌러주세요.');}};
 const save=async(selected=file,recorded=cameraClip)=>{
  if(!selected||(!recorded&&!valid)||lock.current)return;lock.current=true;player.current?.pause();setPlaying(false);setError('');setPhase('영상 업로드 중…');cancel.current=new AbortController();
  try{
   const client=await configureCloud(),session=await client?.auth.getSession(),token=session?.data.session?.access_token,owner=session?.data.session?.user.id;
   if(!client||!token||!owner)throw Error('실제 계정으로 로그인한 뒤 영상을 추가해주세요.');
   const call=async(body:unknown)=>{const response=await fetch('/api/video',{method:'POST',headers:{'Content-Type':'application/json','X-L2-Request':'1',Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:cancel.current!.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'영상을 준비하지 못했어요.');return result;};
   const target=await call({action:'prepare',size:selected.size});if(!alive.current)return;
   const uploaded=await client.storage.from('l2u-video-uploads').uploadToSignedUrl(target.path,target.token,selected,{contentType:selected.type||'application/octet-stream'});if(uploaded.error)throw Error('업로드하지 못했어요. 네트워크 연결을 확인해주세요.');
   if(!alive.current)return;setPhase(recorded?'영상을 저장하는 중…':'영상 구간을 준비하는 중…');
   const result=await call({action:'encode',id:target.id,start:recorded?0:start,recorded,poster:recorded?cameraVideoPoster(selected):undefined});
   const latest=await client.auth.getSession();if(latest.data.session?.user.id!==owner)throw Error('계정이 변경됐어요. 다시 선택해주세요.');
   if(!validVideo(result.video)||typeof result.imagePath!=='string'||typeof result.image!=='string')throw Error('영상 형식을 확인하지 못했어요.');
   if(alive.current)onDone(result);
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'영상을 준비하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;if(alive.current)setPhase('');}
 };
 // Defer one tick so a Strict Mode setup/cleanup cycle cannot upload twice.
 // Camera captures are already bounded to two seconds; only album clips need trimming.
 useEffect(()=>{if(!autoFile||!cloud)return;const timer=setTimeout(()=>{void save(autoFile,true);},0);return()=>clearTimeout(timer);},[autoFile,cloud]);
 if(cameraClip&&file&&cloud&&!captureOpen){if(background&&!error)return null;return <AccessibleDialog open title="영상 준비" closeLabel="영상 준비 취소" onClose={onClose} panelClassName="lab-dialog un-video-picker"><div className="un-video-auto" role={error?'alert':'status'}>{error?<><Film size={28}/><p>{error}</p><button type="button" className="un-primary un-full" disabled={!!phase} onClick={()=>void save(file,true)}>다시 시도</button></>:<><LoaderCircle className="lab-spin" size={28}/><strong>{phase||'영상을 준비하고 있어요'}</strong><p>준비가 끝나면 바로 작성 화면으로 이어져요.</p></>}</div></AccessibleDialog>;}
 if(captureOpen)return <AccessibleDialog open title="2초 영상 촬영" hideTitle closeLabel="영상 촬영 닫기" onClose={()=>setCaptureOpen(false)} panelClassName="lab-dialog lab-story-dialog un-story-v2 un-video-capture"><div className="lab-story-viewport"><CameraSurface active captureKind="video" onCapture={async()=>{}} onFallback={()=>{setCaptureOpen(false);setError('앨범에서 영상을 선택해주세요.');}} onVideo={next=>{onCaptured?.(next);setFile(next);setAutoFile(next);setCameraClip(true);setStart(0);setDuration(0);setPlaying(false);setError('');setCaptureOpen(false);}}/><p className="un-video-capture-guide">무음으로 2초 촬영 후 자동으로 끝나요.</p></div></AccessibleDialog>;
 return <AccessibleDialog open title="움직이는 2초" closeLabel="영상 선택 닫기" onClose={onClose} scrollBody panelClassName="lab-dialog un-video-picker">
  <p className="un-video-lead">사진처럼 가볍게, 잠깐 움직이는 티끌.<br/><strong>무음 · 약 2초 · 480p</strong>로 남겨요.</p>
  {!cloud?<p className="un-video-login" role="status">영상은 실제 계정으로 로그인하면 이용할 수 있어요. 예시 계정에서는 사진으로 둘러봐주세요.</p>:<>
   <div className="un-video-sources"><button type="button" disabled={!!phase} onClick={()=>album.current?.click()}><ImagePlus size={20}/><span>앨범에서 영상</span></button><button type="button" disabled={!!phase} onClick={()=>{player.current?.pause();setPlaying(false);setCaptureOpen(true);}}><Camera size={20}/><span>영상 촬영</span></button></div>
   {url&&<><div className="un-video-preview"><video ref={player} src={url} muted playsInline preload="metadata" onLoadedMetadata={event=>{const length=cameraClip?2:event.currentTarget.duration;setDuration(length);event.currentTarget.currentTime=0;if(!Number.isFinite(length)||length<2||length>120)setError('2초 이상, 2분 이하의 영상을 선택해주세요.');}} onError={()=>setError('이 영상 형식을 열지 못했어요. MP4 또는 MOV 영상을 선택해주세요.')} onTimeUpdate={event=>{if(event.currentTarget.currentTime>=start+2){event.currentTarget.pause();event.currentTarget.currentTime=start;setPlaying(false);}}} onEnded={()=>setPlaying(false)}/><span><Film size={14}/>영상 · 2초</span></div>
    {valid&&<div className="un-video-trim"><div><strong>{start.toFixed(1)}초 — {(start+2).toFixed(1)}초</strong><button type="button" aria-label={playing?'2초 미리보기 정지':'선택한 2초 미리보기'} disabled={!!phase} onClick={()=>void preview()}>{playing?<Square size={16}/>:<Play size={16}/>}미리보기</button></div>{!cameraClip&&<label>시작 지점<input type="range" aria-label="2초 영상 시작 지점" min="0" max={Math.max(0,duration-2)} step="0.1" value={start} disabled={!!phase} onChange={event=>{const next=Number(event.target.value);setStart(next);player.current?.pause();if(player.current)player.current.currentTime=next;setPlaying(false);}}/></label>}<small>{cameraClip?'2초 자동 촬영을 마쳤어요. 미리보기로 확인하고 담아주세요.':'슬라이더로 원하는 구간을 골라요. 카드 비율에 맞춰 가운데를 담아요.'}</small></div>}
   </>}
   <input ref={album} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden aria-label="앨범 영상 선택" onChange={event=>choose(event.currentTarget)}/>
  </>}
  {error&&<p className="lab-error" role="alert">{error}</p>}
  {phase&&<p className="un-video-progress" role="status"><LoaderCircle className="lab-spin" size={17}/>{phase}</p>}
  <p className="un-video-note">외부 공유는 선명한 정지 사진으로 보내요.<br/>원본 영상은 변환 후 정리돼요.</p>
  {cloud&&<button type="button" className="un-primary un-full" disabled={!file||!valid||!!phase} onClick={()=>void save()}>{phase?'영상 준비 중…':'이 2초 담기'}</button>}
 </AccessibleDialog>;
}
