'use client';
import type { ArchiveItem } from '@/types/l2';
import { normalizeLogInput } from '@/lib/store/logInput';
import { isUuid } from '@/lib/logIdentity';
import { compressUploadedImage } from '@/lib/imageUtils';
import type { BackupProgress } from '@/lib/logBackup';

export interface BackupRestorePlan { scope:string; items:ArchiveItem[]; duplicates:number; invalid:number; missingImages:number; missingMembers:number; filename:string }
const MB=1024*1024;
async function destinationId(scope:string,id:string) {
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`l2-restore-v1:${scope}:${id}`)));
  bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
  const h=Array.from(bytes.slice(0,16),v=>v.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
const identity=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=150?(isUuid(value)?value.toLowerCase():value):null;
const safeImage=(value:unknown)=>typeof value==='string'&&(/^https?:\/\//i.test(value)||/^\/(?:api\/media\/image|images\/)/.test(value)||/^data:image\/(?:webp|png|jpeg|gif|avif);base64,/i.test(value))?value:'';
const parse=(text:string)=>JSON.parse(text.replace(/^\ufeff/,''));

/** Reads selected files locally. Existing IDs are skipped; new IDs are scoped to the destination owner. */
export async function prepareBackupRestore(file:File,current:readonly ArchiveItem[],scope:string,update:(progress:BackupProgress)=>void):Promise<BackupRestorePlan> {
  if(!scope)throw new Error('계정 연결을 확인한 뒤 다시 복원해 주세요.');
  if(file.size>250*MB)throw new Error('250MB 이하의 백업 파일을 선택해 주세요.');
  update({percent:0,label:'백업 파일 검사 중'});
  let raw:unknown, imageRefs:Record<string,unknown>={},zip:import('jszip')|undefined;
  const bounded=async(entry:import('jszip').JSZipObject,max:number)=>{
    const size=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
    if(typeof size!=='number'||size>max)throw new Error('백업에 포함된 파일이 너무 커서 읽을 수 없어요.');
    const data=await entry.async('uint8array');if(data.byteLength>max)throw new Error('백업 파일 크기를 확인해 주세요.');return data;
  };
  if(/\.zip$/i.test(file.name)){
    const {default:JSZip}=await import('jszip');zip=await JSZip.loadAsync(file);
    if(Object.keys(zip.files).length>10000)throw new Error('백업에 포함된 파일이 너무 많아요.');
    const logs=zip.file('logs.json');if(!logs)throw new Error('L2 ZIP 백업의 logs.json을 찾지 못했어요.');
    raw=parse(new TextDecoder().decode(await bounded(logs,64*MB)));
    const manifest=zip.file('manifest.json');if(manifest){const parsed=parse(new TextDecoder().decode(await bounded(manifest,4*MB)));if(parsed?.images&&typeof parsed.images==='object'&&!Array.isArray(parsed.images))imageRefs=parsed.images;}
  }else if(/\.json$/i.test(file.name)){
    if(file.size>64*MB)throw new Error('JSON 백업이 너무 커요. 사진이 포함된 ZIP 백업으로 복원해 주세요.');
    raw=parse(await file.text());
  }else throw new Error('L2 ZIP 또는 JSON 백업을 선택해 주세요.');
  const rows=Array.isArray(raw)?raw:raw&&typeof raw==='object'&&Array.isArray((raw as {archives?:unknown}).archives)?(raw as {archives:unknown[]}).archives:null;
  if(!rows||rows.length>10000)throw new Error('로그 목록 형식을 확인해 주세요.');
  const plan:BackupRestorePlan={scope,filename:file.name,items:[],duplicates:0,invalid:0,missingImages:0,missingMembers:0};
  const existing=new Map(current.map(item=>[identity(item.id),item])),ids=new Map<string,string>(),seen=new Set<string>();
  const candidates:Array<{raw:Record<string,unknown>;source:string;id:string}>=[];
  for(const row of rows){
    if(!row||typeof row!=='object'||Array.isArray(row)){plan.invalid++;continue;}
    const source=identity((row as {id?:unknown}).id);if(!source){plan.invalid++;continue;}
    if(seen.has(source)){plan.duplicates++;continue;}seen.add(source);
    const id=existing.get(source)?.id||await destinationId(scope,source);ids.set(source,id);
    if(existing.has(source)||existing.has(identity(id))){plan.duplicates++;continue;}
    candidates.push({raw:row as Record<string,unknown>,source,id});
  }
  const photos=new Map<string,string>();let extracted=0,preparedBytes=0;
  const groups:typeof candidates=[];
  for(let i=0;i<candidates.length;i++){
    const candidate=candidates[i];const row:Record<string,unknown>={...candidate.raw,id:candidate.id};
    if(row.cat==='GROUP'||row.kind==='group'){groups.push(candidate);continue;}
    try{
      if(typeof row.timestamp!=='number'||!Number.isFinite(row.timestamp)||row.timestamp<=0||row.timestamp>253402268399999)throw new Error('invalid timestamp');
      for(const key of ['title','quote','good','bad','note','loc','addressShort','fullAddress','link','author'])if(row[key]!==undefined&&typeof row[key]!=='string')throw new Error('invalid text');
      if(['good','bad','note'].some(key=>String(row[key]||'').length>10000)||['loc','addressShort','fullAddress','author'].some(key=>String(row[key]||'').length>2000))throw new Error('text too long');
      let image=safeImage(row.img);const reference=imageRefs[String(candidate.raw.id)];
      if(row.hasPhoto!==false&&(image||reference)){
        const fallback=image.startsWith('data:')?'':image;
        try{
        let blob:Blob|undefined,photoKey=image;
        if(zip&&typeof reference==='string'&&/^images\/[^\\]*$/.test(reference)&&!reference.split('/').includes('..')){
          const entry=zip.file(reference);if(entry){photoKey=reference;if(photos.has(photoKey))image=photos.get(photoKey)!;else{const data=await bounded(entry,30*MB);extracted+=data.byteLength;if(extracted>250*MB)throw new RangeError('사진 용량이 너무 커서 한 번에 복원할 수 없어요.');const ext=reference.split('.').pop()?.toLowerCase();const mime=ext==='webp'?'image/webp':ext==='png'?'image/png':ext==='jpg'||ext==='jpeg'?'image/jpeg':null;if(!mime)throw new Error('unsupported image');blob=new Blob([new Uint8Array(data)],{type:mime});}}else plan.missingImages++;
        }else if(image.startsWith('data:')){if(photos.has(photoKey))image=photos.get(photoKey)!;else blob=await(await fetch(image)).blob();}
        else plan.missingImages++;
        if(blob){image=await compressUploadedImage(new File([blob],'restored-photo',{type:blob.type}));photos.set(photoKey,image);preparedBytes+=image.length;if(preparedBytes>100*MB)throw new RangeError('사진이 많아 기기 메모리에서 한 번에 복원하기 어려워요.');}
        }catch(error){if(error instanceof RangeError)throw error;image=fallback;plan.missingImages++;}
      }
      row.img=image;row.hasPhoto=Boolean(image)&&row.hasPhoto!==false;
      row.link=typeof row.link==='string'&&/^https?:\/\//i.test(row.link)?row.link:'';
      plan.items.push(normalizeLogInput(row));
    }catch(error){if(error instanceof RangeError)throw error;plan.invalid++;}
    update({percent:Math.round((i+1)/Math.max(1,candidates.length)*95),label:`로그·사진 확인 중 · ${i+1} / ${candidates.length}`});
    if(i%10===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  const normalIds=new Set([...current.filter(item=>item.cat!=='GROUP'),...plan.items].map(item=>item.id));
  for(const group of groups){try{
    const members=Array.isArray(group.raw.memberIds)?group.raw.memberIds:[];
    const mapped=members.map(id=>{const key=identity(id);return key?ids.get(key)||existing.get(key)?.id:'';}).filter((id):id is string=>Boolean(id&&normalIds.has(id)));
    plan.missingMembers+=members.length-mapped.length;
    if(!mapped.length)throw new Error('empty group');
    const row={...group.raw,id:group.id,memberIds:[...new Set(mapped)],img:safeImage(group.raw.img)};
    const first=plan.items.find(item=>mapped.includes(item.id)&&item.img)||current.find(item=>mapped.includes(item.id)&&item.img);row.img=first?.img||'';
    plan.items.push(normalizeLogInput({...row,hasPhoto:Boolean(row.img)}));
  }catch{plan.invalid++;}}
  update({percent:100,label:'복원할 항목 확인 완료'});return plan;
}
