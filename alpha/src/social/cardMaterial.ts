/** Local, bounded photo processing. No API, upload, or stored duplicate image. */
export type PhotoMaterial={film:string;colors:string[]};
const cache=new Map<string,Promise<PhotoMaterial>>();
export function photoMaterial(source:string):Promise<PhotoMaterial>{
 const previous=cache.get(source);if(previous)return previous;
 const pending=new Promise<PhotoMaterial>((resolve,reject)=>{
  const image=new Image();image.crossOrigin='anonymous';let done=false;
  const finish=(error?:Error,result?:PhotoMaterial)=>{if(done)return;done=true;clearTimeout(timer);image.onload=null;image.onerror=null;if(error)reject(error);else resolve(result!);};
  const timer=setTimeout(()=>finish(Error('사진 질감 준비 시간 초과')),12000);
  image.onerror=()=>finish(Error('사진 질감을 읽지 못했어요'));
  image.onload=()=>{try{
   const small=document.createElement('canvas');small.width=12;small.height=12;const sc=small.getContext('2d',{willReadFrequently:true})!;sc.drawImage(image,0,0,12,12);
   const pixels=sc.getImageData(0,0,12,12).data,colors=[0,1,2,3].map(quadrant=>{const sums=[0,0,0];let count=0;for(let y=0;y<12;y++)for(let x=0;x<12;x++)if((x>=6?1:0)+(y>=6?2:0)===quadrant){const i=(y*12+x)*4;for(let c=0;c<3;c++)sums[c]+=pixels[i+c];count++;}return '#'+sums.map(n=>Math.round(n/count).toString(16).padStart(2,'0')).join('');});
   const canvas=document.createElement('canvas'),ratio=Math.min(1,1080/image.naturalWidth,1920/image.naturalHeight);canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
   const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const glow=document.createElement('canvas');glow.width=canvas.width;glow.height=canvas.height;const gc=glow.getContext('2d')!,data=ctx.getImageData(0,0,canvas.width,canvas.height),high=gc.createImageData(canvas.width,canvas.height);
   // Only bright source pixels create warm halation; dark areas keep their tone.
   let seed=1827;for(let i=0;i<data.data.length;i+=4){const lum=(data.data[i]*.2126+data.data[i+1]*.7152+data.data[i+2]*.0722)/255,alpha=Math.max(0,(lum-.68)/.32)*.4;high.data[i]=255;high.data[i+1]=137;high.data[i+2]=74;high.data[i+3]=Math.round(alpha*255);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const grain=(seed/4294967296-.5)*18;for(let c=0;c<3;c++)data.data[i+c]=Math.max(0,Math.min(255,data.data[i+c]+grain));}
   ctx.putImageData(data,0,0);gc.putImageData(high,0,0);ctx.save();ctx.globalCompositeOperation='screen';ctx.filter=`blur(${Math.max(3,canvas.width*.012)}px)`;ctx.drawImage(glow,0,0);ctx.restore();
   const vignette=ctx.createRadialGradient(canvas.width/2,canvas.height/2,Math.min(canvas.width,canvas.height)*.23,canvas.width/2,canvas.height/2,Math.hypot(canvas.width,canvas.height)/2);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'rgba(0,0,0,.10)');ctx.fillStyle=vignette;ctx.fillRect(0,0,canvas.width,canvas.height);
   finish(undefined,{film:canvas.toDataURL('image/webp',.9),colors});
  }catch(error){finish(error instanceof Error?error:Error('사진 질감을 준비하지 못했어요'));}};
  image.src=source;
 });
 if(cache.size>=16)cache.delete(cache.keys().next().value!);cache.set(source,pending);pending.catch(()=>cache.delete(source));return pending;
}
