/** iOS in-app camera previews can work while video-to-canvas capture fails.
 * Keep the native file picker on the original shutter click (user activation). */
export function preferNativePhoto(userAgent:string){return /iPhone|iPad|iPod/i.test(userAgent)&&/KAKAOTALK/i.test(userAgent);}
export function emptyCameraPixels(pixels:Uint8ClampedArray){
 if(!pixels.length)return true;let opaque=false,colour=false;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>0){opaque=true;if(pixels[i]||pixels[i+1]||pixels[i+2])colour=true;}}
 return !opaque||!colour;
}
/** Wait for a presented video frame rather than only loaded metadata. */
export function waitForCameraFrame(video:HTMLVideoElement,signal:AbortSignal):Promise<void>{
 return new Promise((resolve,reject)=>{
  let finished=false,frame:number|undefined,raf=0,timer:ReturnType<typeof setTimeout>;
  const cleanup=()=>{clearTimeout(timer);if(frame!==undefined)video.cancelVideoFrameCallback?.(frame);cancelAnimationFrame(raf);signal.removeEventListener('abort',abort);};
  const finish=(error?:Error)=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve();};
  const abort=()=>finish(new DOMException('촬영이 취소됐어요.','AbortError'));
  const ready=()=>{if(signal.aborted){abort();return;}if(document.hidden||video.paused||video.readyState<2||!video.videoWidth||!video.videoHeight){finish(Error('카메라가 준비되지 않았어요. 다시 촬영해주세요.'));return;}finish();};
  timer=setTimeout(()=>finish(Error('카메라 화면을 받지 못했어요. 기본 카메라로 촬영해주세요.')),2200);
  if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
  try{if(video.requestVideoFrameCallback)frame=video.requestVideoFrameCallback(ready);else raf=requestAnimationFrame(()=>{raf=requestAnimationFrame(ready);});}catch{finish(Error('카메라 화면을 받지 못했어요. 기본 카메라로 촬영해주세요.'));}
 });
}
export function cameraCanvasIsEmpty(canvas:HTMLCanvasElement){
 const sample=document.createElement('canvas');sample.width=sample.height=32;const context=sample.getContext('2d',{willReadFrequently:true});if(!context)throw Error('사진을 확인하지 못했어요.');context.drawImage(canvas,0,0,32,32);return emptyCameraPixels(context.getImageData(0,0,32,32).data);
}
