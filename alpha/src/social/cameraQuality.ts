export type CameraLens={id:string;label:string;base:number};
export type CameraRange={min:number;max:number;step:number};

// Lens labels are vendor/localization dependent. Never infer focal length from
// enumeration order or an opaque device id; unknown lenses keep the browser default.
export function knownLenses(devices:MediaDeviceInfo[]):CameraLens[]{
 return devices.flatMap(device=>{
  if(device.kind!=='videoinput'||!device.deviceId||/front|user|전면|앞면|facetime/i.test(device.label))return [];
  const label=device.label;
  if(/ultra[\s-]*wide|초광각|超広角|超广角/i.test(label))return [{id:device.deviceId,label,base:.5}];
  if(/telephoto|tele\b|망원/i.test(label)){
   const match=label.match(/(?:^|\D)([23])\s*[x×배]/i);return match?[{id:device.deviceId,label,base:Number(match[1])}]:[];
  }
  if(/(?:back|rear|후면|뒷면).*(?:wide|main|standard|기본|광각)|(?:wide|main|standard).*(?:back|rear)/i.test(label)&&!/dual|triple|듀얼|트리플/i.test(label))return [{id:device.deviceId,label,base:1}];
  return [];
 });
}

type StillCapture={getPhotoCapabilities?:()=>Promise<{imageWidth?:{max:number};imageHeight?:{max:number}}>;takePhoto:(settings?:{imageWidth?:number;imageHeight?:number})=>Promise<Blob>};
type StillConstructor=new(track:MediaStreamTrack)=>StillCapture;

// A still exposure can retain considerably more detail than a preview frame.
// Native camera controls also remain available when a browser hides this API.
export async function cameraStill(track:MediaStreamTrack):Promise<ImageBitmap|null>{
 const Capture=(window as Window&{ImageCapture?:StillConstructor}).ImageCapture;
 if(!Capture||!window.createImageBitmap)return null;
 try{
  const capture=new Capture(track);let settings:{imageWidth?:number;imageHeight?:number}|undefined;
  try{const caps=await capture.getPhotoCapabilities?.();if(caps?.imageWidth?.max&&caps?.imageHeight?.max)settings={imageWidth:Math.min(6000,caps.imageWidth.max),imageHeight:Math.min(6000,caps.imageHeight.max)};}catch{/* A plain still exposure may still work. */}
  let blob:Blob;try{blob=await capture.takePhoto(settings);}catch{if(!settings)return null;blob=await capture.takePhoto();}
  return await createImageBitmap(blob);
 }catch{return null;}
}
