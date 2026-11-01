const cameraPosters=new WeakMap<File,string>();
export const cameraVideoPoster=(file:File)=>cameraPosters.get(file);
/** About two seconds, silent, portrait capture. Cancellation never returns a partial clip. */
export function recordCameraVideo(source:HTMLVideoElement,options:{zoom:number;mirrored:boolean;signal:AbortSignal;onStart:()=>void}){
 return new Promise<File>((resolve,reject)=>{
  if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream){reject(Error('이 브라우저에서는 자동 영상 촬영을 지원하지 않아요. 앨범에서 영상을 선택해주세요.'));return;}
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=768;
  const context=canvas.getContext('2d');if(!context||!source.videoWidth){reject(Error('카메라가 준비되면 다시 촬영해주세요.'));return;}
  let frame=0,timer:ReturnType<typeof setTimeout>|undefined,recorder:MediaRecorder|undefined,stream:MediaStream|undefined,finished=false;
  const chunks:Blob[]=[];
  const cleanup=()=>{if(timer)clearTimeout(timer);cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());options.signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);};
  const fail=(error:Error)=>{if(finished)return;finished=true;try{if(recorder?.state!=='inactive')recorder?.stop();}catch{/* Already stopped. */}cleanup();reject(error);};
  const abort=()=>fail(new DOMException('촬영이 취소됐어요.','AbortError'));
  const visibility=()=>{if(document.hidden)fail(Error('촬영 중 화면을 벗어났어요. 다시 촬영해주세요.'));};
  const draw=()=>{const width=source.videoWidth,height=source.videoHeight,ratio=480/768;let sw=Math.min(width,height*ratio)/options.zoom,sh=sw/ratio;context.save();if(options.mirrored){context.translate(480,0);context.scale(-1,1);}context.drawImage(source,(width-sw)/2,(height-sh)/2,sw,sh,0,0,480,768);context.restore();frame=requestAnimationFrame(draw);};
  try{
   if(options.signal.aborted){abort();return;}
   draw();stream=canvas.captureStream(24);
   const mime=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
   recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:1000000});
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   recorder.onerror=()=>fail(Error('영상을 촬영하지 못했어요. 다시 시도해주세요.'));
   recorder.onstart=()=>{options.onStart();timer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},2000);};
   recorder.onstop=()=>{if(finished)return;finished=true;cleanup();if(!chunks.length){reject(Error('촬영된 영상이 없어요. 다시 시도해주세요.'));return;}const type=(recorder?.mimeType||chunks[0].type).split(';')[0];const file=new File(chunks,'ticgle-2s.'+(type.includes('mp4')?'mp4':'webm'),{type});try{cameraPosters.set(file,canvas.toDataURL('image/webp',.85));}catch{/* Server cover is still available if local thumbnail capture fails. */}resolve(file);};
   options.signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);recorder.start();
  }catch{fail(Error('이 브라우저에서는 자동 영상 촬영을 시작하지 못했어요. 앨범에서 영상을 선택해주세요.'));}
 });
}
