'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,RotateCw,LoaderCircle,SlidersHorizontal,Grid2X2,Zap,Check} from 'lucide-react';
import {cameraStill,knownLenses,type CameraLens} from './cameraQuality';

type ZoomRange={min:number;max:number;step:number};
type Device={track:MediaStreamTrack;nativeZoom:boolean;torch:boolean;working:boolean;appliedZoom:number;appliedTorch:boolean};
type CameraConstraints=MediaTrackConstraintSet&{zoom?:number;torch?:boolean};
const DIGITAL_RANGE:ZoomRange={min:1,max:4,step:.05};
const boundedZoom=(value:number,range:ZoomRange)=>Math.min(range.max,Math.max(range.min,Number((range.min+Math.round((value-range.min)/range.step)*range.step).toFixed(2))));
function cameraFeatures(track:MediaStreamTrack|undefined){
 let capabilities:(MediaTrackCapabilities&{zoom?:ZoomRange;torch?:boolean})|undefined,values:(MediaTrackSettings&{zoom?:number;torch?:boolean})|undefined;
 try{capabilities=track?.getCapabilities?.();}catch{/* Keep capture usable when capability probing is unavailable. */}
 try{values=track?.getSettings?.();}catch{/* The initial camera frame is still usable. */}
 return {capabilities,values};
}

export default function CameraSurface({active,onCapture,onFallback}:{active:boolean;onCapture:(photo:Blob)=>Promise<void>;onFallback:()=>void}){
 const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),captureLock=useRef(false);
 const [lenses,setLenses]=useState<CameraLens[]>([]),[selection,setSelection]=useState<CameraLens&{zoom:number}|null>(null),[lensBase,setLensBase]=useState(1);
 const [facing,setFacing]=useState<'environment'|'user'>('environment'),[attempt,setAttempt]=useState(0),[status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading'),[capturing,setCapturing]=useState(false),[error,setError]=useState('');
 const [zoom,setZoom]=useState(1),[range,setRange]=useState<ZoomRange>(DIGITAL_RANGE),[nativeZoom,setNativeZoom]=useState(false),[appliedZoom,setAppliedZoom]=useState(1),[adjusting,setAdjusting]=useState(false),[torchAvailable,setTorchAvailable]=useState(false),[torch,setTorch]=useState(false),[grid,setGrid]=useState(false),[settings,setSettings]=useState(false),[mirrored,setMirrored]=useState(false);
 const device=useRef<Device|null>(null),desired=useRef({zoom,torch});desired.current={zoom,torch};
 useEffect(()=>{
  let cancelled=false,ownedStream:MediaStream|null=null,ownedDevice:Device|null=null;setError('');setStatus('loading');setNativeZoom(false);const requested=selection?.zoom||1;setZoom(requested);setRange(DIGITAL_RANGE);setTorch(false);setTorchAvailable(false);setAdjusting(false);setSettings(false);
  const stop=()=>{ownedStream?.getTracks().forEach(track=>track.stop());if(stream.current===ownedStream){stream.current=null;if(video.current)video.current.srcObject=null;}if(device.current===ownedDevice)device.current=null;};
  if(!active)return stop;
  if(!navigator.mediaDevices?.getUserMedia){setStatus('unavailable');return stop;}
  const open=async()=>{
   const videoConstraints:MediaTrackConstraints&{zoom?:boolean}={...(selection?{deviceId:{exact:selection.id}}:{facingMode:{ideal:facing}}),width:{ideal:3840},height:{ideal:2160},frameRate:{ideal:30},zoom:true};
   let media=await navigator.mediaDevices.getUserMedia({audio:false,video:videoConstraints});
   if(cancelled){media.getTracks().forEach(track=>track.stop());return null;}ownedStream=media;
   let chosen=selection;
   try{
    const devices=await navigator.mediaDevices.enumerateDevices?.();if(cancelled){media.getTracks().forEach(track=>track.stop());return null;}
    const available=devices?knownLenses(devices):[],currentId=cameraFeatures(media.getVideoTracks()[0]).values?.deviceId;
    if(facing==='environment'&&!selection&&currentId&&!available.some(lens=>lens.id===currentId))available.push({id:currentId,label:'기본 후면 카메라',base:1});
    setLenses(available);
    const main=facing==='environment'&&!selection?available.find(lens=>lens.base===1):undefined;
    if(main&&main.id!==cameraFeatures(media.getVideoTracks()[0]).values?.deviceId){
     media.getTracks().forEach(track=>track.stop());ownedStream=null;
     try{media=await navigator.mediaDevices.getUserMedia({audio:false,video:{...videoConstraints,deviceId:{exact:main.id},facingMode:undefined}});chosen={...main,zoom:1};}
     catch{const {zoom:ignored,...fallback}=videoConstraints;void ignored;media=await navigator.mediaDevices.getUserMedia({audio:false,video:fallback});}
     if(cancelled){media.getTracks().forEach(track=>track.stop());return null;}ownedStream=media;
    }
   }catch{/* Device enumeration is optional; keep the working camera. */}
   if(media.getVideoTracks().some(track=>track.readyState==='ended'))throw Error('카메라를 다시 열어주세요.');
   return {media,base:chosen?.base||1};
  };
  void open().then(async result=>{
   if(!result)return;const {media,base}=result;
   if(cancelled){media.getTracks().forEach(track=>track.stop());return;}
   setLensBase(base);
   ownedStream=media;stream.current=media;if(!video.current){stop();return;}video.current.srcObject=media;
   const track=media.getVideoTracks()[0],{capabilities,values}=cameraFeatures(track),z=capabilities?.zoom;
   const supportsZoom=Boolean(z&&Number.isFinite(z.min)&&Number.isFinite(z.max)&&z.min>0&&z.max>z.min),limits=supportsZoom?{min:z!.min,max:Math.min(z!.max,Math.max(z!.min,8)),step:z!.step>0?z!.step:.05}:DIGITAL_RANGE;
   const initial=boundedZoom(requested/base,limits),actual=supportsZoom?boundedZoom(values?.zoom||initial,limits):1;const totalRange={min:limits.min*base,max:limits.max*base,step:limits.step*base};setRange(totalRange);setZoom(initial*base);desired.current={zoom:initial*base,torch:false};setAppliedZoom(actual*base);setNativeZoom(supportsZoom);setTorchAvailable(Boolean(capabilities?.torch));setMirrored((values?.facingMode||facing)==='user');
   if(track){ownedDevice={track,nativeZoom:supportsZoom,torch:Boolean(capabilities?.torch),working:false,appliedZoom:actual*base,appliedTorch:Boolean(values?.torch)};device.current=ownedDevice;}
   try{await video.current.play();if(!cancelled)setStatus('ready');}catch{if(!cancelled){stop();setStatus('unavailable');}}
  }).catch(()=>{stop();if(!cancelled)setStatus('unavailable');});
  return()=>{cancelled=true;stop();};
 },[active,facing,attempt,selection]);
 useEffect(()=>{
  const target=device.current;if(!active||status!=='ready'||!target||target.working||(!target.nativeZoom&&!target.torch))return;
  target.working=true;setAdjusting(true);
  void(async()=>{
   try{
    while(device.current===target){
     const next={...desired.current},constraint:CameraConstraints={...(target.nativeZoom?{zoom:next.zoom/lensBase}:{}),...(target.torch?{torch:next.torch}:{})};
     if((target.nativeZoom&&target.appliedZoom!==next.zoom)||(target.torch&&target.appliedTorch!==next.torch))await target.track.applyConstraints({advanced:[constraint]});
     if(device.current!==target)return;target.appliedZoom=next.zoom;target.appliedTorch=next.torch;setAppliedZoom(next.zoom);
     if(desired.current.zoom===next.zoom&&desired.current.torch===next.torch)break;
    }
   }catch{if(device.current===target){target.nativeZoom=false;target.torch=false;setNativeZoom(false);setTorchAvailable(false);setTorch(false);const fallback={min:lensBase,max:lensBase*4,step:.05};setRange(fallback);setZoom(boundedZoom(desired.current.zoom,fallback));}}
   finally{target.working=false;if(device.current===target)setAdjusting(false);}
  })();
 },[active,status,zoom,torch,nativeZoom,lensBase]);
 const changeZoom=(value:number)=>{
  if(captureLock.current)return;
  const candidates=facing==='environment'?lenses.filter(lens=>lens.base<=value).sort((a,b)=>b.base-a.base):[];
  const next=candidates[0];
  if(next&&next.base!==lensBase){setStatus('loading');setSelection({...next,zoom:value});return;}
  setZoom(boundedZoom(value,range));
 };
 const zoomMin=Math.min(range.min,...(facing==='environment'?lenses.map(lens=>lens.base):[]));
 const zoomMax=Math.max(range.max,...(facing==='environment'?lenses.map(lens=>lens.base):[]));
 useEffect(()=>{
  const surface=video.current;if(!surface||!active||status!=='ready')return;
  let pinch:{distance:number;zoom:number}|null=null;
  const distance=(touches:TouchList)=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
  const begin=(event:TouchEvent)=>{if(event.touches.length===2&&!captureLock.current){pinch={distance:Math.max(1,distance(event.touches)),zoom:desired.current.zoom};if(event.cancelable)event.preventDefault();}else pinch=null;};
  const move=(event:TouchEvent)=>{if(!pinch||event.touches.length!==2||captureLock.current)return;if(event.cancelable)event.preventDefault();changeZoom(Math.min(zoomMax,Math.max(zoomMin,pinch.zoom*distance(event.touches)/pinch.distance)));};
  const end=()=>{pinch=null;};const prevent=(event:Event)=>{if(event.cancelable)event.preventDefault();};
  surface.addEventListener('touchstart',begin,{passive:false});surface.addEventListener('touchmove',move,{passive:false});surface.addEventListener('touchend',end);surface.addEventListener('touchcancel',end);surface.addEventListener('gesturestart',prevent);surface.addEventListener('gesturechange',prevent);
  return()=>{surface.removeEventListener('touchstart',begin);surface.removeEventListener('touchmove',move);surface.removeEventListener('touchend',end);surface.removeEventListener('touchcancel',end);surface.removeEventListener('gesturestart',prevent);surface.removeEventListener('gesturechange',prevent);};
 },[active,status,range,lenses,lensBase,facing,zoomMin,zoomMax]);
 const changing=adjusting||(nativeZoom&&Math.abs(appliedZoom-zoom)>.001),digitalZoom=nativeZoom?1:zoom/lensBase;
 const nativeCapture=()=>{stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;device.current=null;if(video.current)video.current.srcObject=null;setStatus('unavailable');onFallback();};
 const capture=async()=>{
  if(captureLock.current||changing)return;
  const source=video.current;if(status!=='ready'||!source?.videoWidth||source.readyState<2){nativeCapture();return;}
  captureLock.current=true;setCapturing(true);setError('');
  try{
   const ratio=source.clientWidth/source.clientHeight||9/16;let sw:number,sh:number;
   const still=device.current?await cameraStill(device.current.track):null;
   const frame:CanvasImageSource=still||source;const frameWidth=still?.width||source.videoWidth,frameHeight=still?.height||source.videoHeight;sw=frameWidth;sh=sw/ratio;if(sh>frameHeight){sh=frameHeight;sw=sh*ratio;}
   const canvas=document.createElement('canvas');canvas.width=Math.min(1080,Math.round(sw/digitalZoom));canvas.height=Math.round(canvas.width/ratio);sw/=digitalZoom;sh/=digitalZoom;
   const context=canvas.getContext('2d');if(!context){still?.close();throw Error('사진을 촬영하지 못했어요.');}
   if(mirrored){context.translate(canvas.width,0);context.scale(-1,1);}
   try{context.drawImage(frame,(frameWidth-sw)/2,(frameHeight-sh)/2,sw,sh,0,0,canvas.width,canvas.height);}finally{still?.close();}
   const photo=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('사진을 촬영하지 못했어요.')),'image/png'));
   await onCapture(photo);
  }catch(e){setError(e instanceof Error?e.message:'촬영하지 못했어요. 앨범에서 사진을 선택해주세요.');}finally{captureLock.current=false;setCapturing(false);}
 };
 const presets=[.5,1,2,3];
 return <div className="lab-camera-surface" data-zoom-mode={nativeZoom?'device':'digital'} data-zoom={zoom} data-lens-base={lensBase}>
  <video ref={video} autoPlay muted playsInline aria-label="카메라 미리보기" style={{transform:`scale(${mirrored?-digitalZoom:digitalZoom},${digitalZoom})`}}/>
  {grid&&<div className="lab-camera-grid" aria-hidden="true"><i/><i/><i/><i/></div>}
  {active&&status==='ready'&&<>
   <button className="lab-camera-settings-button" aria-label="카메라 설정" aria-expanded={settings} onClick={()=>setSettings(value=>!value)}><SlidersHorizontal size={19}/></button>
   {settings&&<div className="lab-camera-settings" role="group" aria-label="카메라 설정 메뉴"><button disabled={capturing} onClick={nativeCapture}><Camera size={17}/>기본 카메라로 촬영</button>{!nativeZoom&&<p className="lab-camera-quality-note">확대하면 화질이 낮아질 수 있어요. 더 선명한 사진은 기본 카메라로 촬영해 주세요.</p>}<button aria-pressed={grid} onClick={()=>setGrid(value=>!value)}><Grid2X2 size={17}/>격자선{grid&&<Check size={14}/>}</button>{torchAvailable&&<button aria-pressed={torch} disabled={capturing} onClick={()=>setTorch(value=>!value)}><Zap size={17}/>조명{torch&&<Check size={14}/>}</button>}</div>}
   <div className="lab-camera-zoom" role="group" aria-label="카메라 배율 조절"><div>{presets.map(value=><button key={value} disabled={capturing||value<zoomMin||value>zoomMax} title={value<zoomMin||value>zoomMax?'이 기기 또는 브라우저에서 지원하지 않는 배율':undefined} aria-label={`배율 ${value}배`} aria-pressed={Math.abs(zoom-value)<.025} onClick={()=>changeZoom(value)}>{value}×</button>)}</div><output className="lab-camera-zoom-status" aria-label="현재 카메라 배율" aria-live="off">{zoom.toFixed(1)}×</output></div>
  </>}
  {active&&status!=='ready'&&<div className="lab-camera-placeholder">{status==='loading'?<><LoaderCircle className="lab-spin" size={30}/><p>카메라를 여는 중</p></>:<><Camera size={46} strokeWidth={1}/><p>사진으로 남기는 지금</p><button onClick={()=>setAttempt(value=>value+1)}>카메라 켜기</button><small>앨범을 고르거나 글만 남겨도 좋아요</small></>}</div>}
  {error&&<p className="lab-camera-error" role="alert">{error}</p>}
  <div className="lab-camera-capture"><button className="lab-camera-shutter" aria-label="사진 촬영" aria-busy={capturing||changing||status==='loading'} disabled={capturing||changing||status==='loading'||!active} onClick={()=>void capture()}>{capturing?<LoaderCircle className="lab-spin" size={24}/>:<span/>}</button><button className="lab-camera-flip" aria-label="전면 후면 카메라 전환" disabled={capturing||status==='loading'||!active} onClick={()=>{setSelection(null);setFacing(value=>value==='user'?'environment':'user');}}><RotateCw size={22}/></button></div>
 </div>;
}
