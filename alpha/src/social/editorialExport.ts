import {prepareCardExport,downloadCardFile} from '@/lib/cardExport';
import {compressCardBlob} from '@/lib/imageCompression';
export type EditorialExportMode='front'|'carousel'|'pair';
export type EditorialProgress={stage:'front'|'back'|'pair';completed:number;total:number;message:string};

function fitSinglePage(scroll:HTMLElement,inner:HTMLElement,square:boolean){
 const fits=()=>scroll.clientHeight>0&&inner.scrollHeight<=scroll.clientHeight+1;
 if(fits())return;
 const text=Array.from(inner.querySelectorAll<HTMLElement>('.ec-quote,.ec-spec p,.ec-spec b'),node=>{const css=getComputedStyle(node);return {node,size:parseFloat(css.fontSize),leading:parseFloat(css.lineHeight)/parseFloat(css.fontSize)||1.6};});
 const spaces=[inner,...Array.from(inner.querySelectorAll<HTMLElement>('.ec-quote,.ec-specs,.ec-spec'))].map(node=>{const css=getComputedStyle(node);return {node,row:parseFloat(css.rowGap)||0,column:parseFloat(css.columnGap)||0,top:parseFloat(css.paddingTop)||0,bottom:parseFloat(css.paddingBottom)||0};});
 for(let factor=.94;factor>=.63;factor-=.06){
  for(const {node,size,leading} of text){const floor=node.matches('.ec-quote')?(square?13:16):node.tagName==='B'?8:(square?11:12),font=Math.max(Math.min(size,floor),size*factor);node.style.fontSize=`${font}px`;node.style.lineHeight=`${font*Math.max(1.4,leading*factor)}px`;}
  for(const {node,row,column,top,bottom} of spaces){node.style.rowGap=`${row*factor}px`;node.style.columnGap=`${column*factor}px`;node.style.paddingTop=`${top*factor}px`;node.style.paddingBottom=`${bottom*factor}px`;}
  if(fits())return;
 }
 throw Error('리뷰가 한 면에 담기에는 길어요. 본문을 줄이거나 뒷면 전체 저장을 이용해주세요.');
}

export async function exportEditorialFace(root:HTMLElement,side:'front'|'back',title:string,onProgress?:(page:number,total:number)=>void,options:{singlePage?:boolean}={}):Promise<File[]>{
 const deadline=Date.now()+14000;while(root.querySelector('[data-ec-material=\"pending\"]')){if(Date.now()>deadline)throw Error('사진 질감을 준비 중이에요. 잠시 후 다시 저장해주세요.');await new Promise(resolve=>setTimeout(resolve,80));}
 const source=root.querySelector<HTMLElement>(`[data-ec-face="${side}"]`);if(!source)throw Error('사진이 없는 티끌은 뒷면으로 저장해주세요.');
 const clone=source.cloneNode(true) as HTMLElement,host=document.createElement('div');host.inert=true;host.setAttribute('aria-hidden','true');Object.assign(host.style,{position:'fixed',left:'-15000px',top:'0',width:'420px',pointerEvents:'none'});host.append(clone);document.body.append(host);
 try{
  clone.querySelectorAll<HTMLElement>('.ec-satin-sheen').forEach(node=>{node.style.backgroundPosition='45% 45%';node.style.transition='none';});
  clone.style.transform='none';clone.style.position='relative';clone.dataset.cardWidth='420';clone.dataset.cardHeight=clone.classList.contains('ec-square')?'420':String(672);
  if(clone.classList.contains('ec-ticket')){clone.style.setProperty('--card-notch-radius','10');clone.style.setProperty('--card-notch-y',clone.classList.contains('ec-square')?'60':'73');}
  const scroll=clone.querySelector<HTMLElement>('[data-ec-scroll]'),inner=clone.querySelector<HTMLElement>('.ec-scroll-inner');
  // Paginate actual text nodes, preserving each page's header/footer. Negative
  // transforms inside SVG foreignObject can scroll/flatten the whole card.
  const plans:Node[][]=[];
  if(scroll&&inner&&options.singlePage){
   await document.fonts.ready;void clone.offsetHeight;fitSinglePage(scroll,inner,clone.classList.contains('ec-square'));scroll.style.overflow='hidden';plans.push(Array.from(inner.childNodes,node=>node.cloneNode(true)));
  }else if(scroll&&inner){
   void clone.offsetHeight;await document.fonts.ready;
   const quote=inner.querySelector<HTMLElement>('.ec-quote'),specs=inner.querySelector<HTMLElement>('.ec-specs');
   const pending:{node:HTMLElement;text:string;spec:boolean}[]=[];
   if(quote?.textContent)pending.push({node:quote.cloneNode(true) as HTMLElement,text:quote.textContent,spec:false});
   specs?.querySelectorAll<HTMLElement>('.ec-spec').forEach(node=>{const text=node.querySelector('p')?.textContent||'';if(text)pending.push({node:node.cloneNode(true) as HTMLElement,text,spec:true});});
   inner.replaceChildren();scroll.style.overflow='hidden';
   const fits=()=>inner.scrollHeight<=scroll.clientHeight+1;
   const finish=()=>{plans.push(Array.from(inner.childNodes,node=>node.cloneNode(true)));inner.replaceChildren();clone.scrollTop=0;scroll.scrollTop=0;};
   while(pending.length){
    if(plans.length>=60)throw Error('이 비율로 저장할 내용이 너무 길어요. 본문이나 줄바꿈을 조금 줄여주세요.');
    const item=pending[0],node=item.node.cloneNode(true) as HTMLElement;let container:HTMLElement=inner;
    if(item.spec){container=inner.querySelector<HTMLElement>('.ec-specs')!;if(!container){container=specs!.cloneNode(false) as HTMLElement;inner.append(container);}}
    const textNode=item.spec?node.querySelector('p')!:node;
    textNode.textContent=item.text;container.append(node);
    if(fits()){pending.shift();continue;}
    node.remove();if(container!==inner&&!container.childNodes.length)container.remove();
    if(inner.childNodes.length){finish();continue;}
    if(item.spec){container=specs!.cloneNode(false) as HTMLElement;inner.append(container);}else container=inner;
    container.append(node);let low=0,high=item.text.length;
    while(low<high){const middle=Math.ceil((low+high)/2);textNode.textContent=item.text.slice(0,middle);if(fits())low=middle;else high=middle-1;}
    if(!low)throw Error('본문을 담을 공간이 부족해요. 내용을 줄이거나 다른 뒷면 디자인을 선택해주세요.');
    const prefix=item.text.slice(0,low),space=Math.max(prefix.lastIndexOf(' '),prefix.lastIndexOf('\n'));if(space>low*.7)low=space+1;
    textNode.textContent=item.text.slice(0,low);item.text=item.text.slice(low);finish();
   }
   if(inner.childNodes.length||!plans.length)finish();
  }else plans.push([]);
  const files:File[]=[];
  for(let page=0;page<plans.length;page++){
   if(inner)inner.replaceChildren(...plans[page].map(node=>node.cloneNode(true)));
   clone.scrollTop=0;if(scroll)scroll.scrollTop=0;
   const prepared=await prepareCardExport(clone,{filename:`${title}-${side}${plans.length>1?'-'+(page+1):''}.png`});files.push(prepared.file);onProgress?.(page+1,plans.length);
  }
  return files;
 }finally{host.remove();}
}
const safeName=(title:string)=>title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,100)||'card';
export async function pairEditorialFiles(front:File,back:File,background:string,title:string){
 const urls=[URL.createObjectURL(front),URL.createObjectURL(back)];
 try{
  const images=await Promise.all(urls.map(async url=>{const image=new Image();image.src=url;await image.decode();return image;}));
  const canvas=document.createElement('canvas'),padding=40,gap=24,width=1080,cardWidth=(width-padding*2-gap)/2,cardHeight=cardWidth*images[0].naturalHeight/images[0].naturalWidth;
  canvas.width=width;canvas.height=Math.ceil(cardHeight+padding*2);const context=canvas.getContext('2d');if(!context)throw Error('합본 이미지를 준비하지 못했어요.');
  context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(images[0],padding,padding,cardWidth,cardHeight);context.drawImage(images[1],padding+cardWidth+gap,padding,cardWidth,cardHeight);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('합본 이미지를 만들지 못했어요.')),'image/png'));
  return new File([await compressCardBlob(blob)],`${safeName(title)}-front-back-pair.png`,{type:'image/png'});
 }finally{urls.forEach(url=>URL.revokeObjectURL(url));}
}

export async function exportEditorialMode(root:HTMLElement,mode:EditorialExportMode,title:string,onProgress?:(progress:EditorialProgress)=>void):Promise<File[]>{
 const total=mode==='front'?1:mode==='carousel'?2:3;
 onProgress?.({stage:'front',completed:0,total,message:'앞면 준비 중'});
 const [front]=await exportEditorialFace(root,'front',title);
 if(mode==='front')return [front];
 onProgress?.({stage:'back',completed:1,total,message:'뒷면 준비 중'});
 const [back]=await exportEditorialFace(root,'back',title,undefined,{singlePage:true});
 if(mode==='carousel')return [new File([front],`${safeName(title)}-01-front.png`,{type:'image/png'}),new File([back],`${safeName(title)}-02-back.png`,{type:'image/png'})];
 onProgress?.({stage:'pair',completed:2,total,message:'앞뒤 합본 준비 중'});
 const background=getComputedStyle(root.querySelector<HTMLElement>('[data-ec-face="back"]')!).backgroundColor;
 return [await pairEditorialFiles(front,back,background,title)];
}

export async function saveEditorialFiles(files:File[],name:string,onProgress?:(percent:number)=>void){
 if(files.length===1){downloadCardFile(files[0]);return;}
 const {default:JSZip}=await import('jszip'),zip=new JSZip();files.forEach(file=>zip.file(file.name,file));const blob=await zip.generateAsync({type:'blob'},metadata=>onProgress?.(metadata.percent));downloadCardFile(new File([blob],name.replace(/[<>:"/\\|?*]/g,'_')+'.zip',{type:'application/zip'}));
}
