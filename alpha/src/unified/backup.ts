import {downloadCardFile} from '@/lib/cardExport';
import {csvCell} from '@/lib/logBackup';
import {type UnifiedState} from './store';
export async function backupOwn(state:UnifiedState,actorId:string,onProgress:(percent:number)=>void){
 const {default:JSZip}=await import('jszip');const zip=new JSZip(),logs=state.logs.filter(l=>l.authorId===actorId),errors:string[]=[];
 const ownIds=new Set(logs.map(l=>l.id));
 const mosaic={personalBoard:Object.fromEntries(Object.entries(state.mosaic.personalBoard).filter(([,id])=>ownIds.has(id))),groupBoards:Object.fromEntries(Object.entries(state.mosaic.groupBoards).map(([id,rows])=>[id,Object.fromEntries(Object.entries(rows).filter(([,p])=>ownIds.has(p.logId)&&p.placedBy===actorId))]))};
 const payload={format:'l2-unified-ui',version:2,exportedAt:new Date().toISOString(),logs,presets:state.presets,collections:state.collections,mosaic};
 zip.file('logs.json',JSON.stringify(payload,null,2));zip.file('logs.csv',String.fromCharCode(0xfeff)+[['제목','내용','날짜','장소','카테고리','평점'],...logs.map(l=>[l.title,l.body,new Date(l.createdAt).toISOString(),l.locationLabel||l.place?.name||'',l.category,l.rating||''])].map(row=>row.map(csvCell).join(',')).join('\r\n'));
 const unique=new Map<string,string>();let total=0;
 for(let i=0;i<logs.length;i++){const log=logs[i];if(log.image&&!unique.has(log.image)){try{const response=await fetch(log.image,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error();const b=await response.blob();if(!b.type.startsWith('image/')||b.size>20*1024*1024||total+b.size>200*1024*1024)throw Error();total+=b.size;const name=`images/${log.id.replace(/[^a-zA-Z0-9-]/g,'_')}.${b.type.includes('webp')?'webp':b.type.includes('png')?'png':'jpg'}`;zip.file(name,b,{compression:'STORE'});unique.set(log.image,name);}catch{errors.push(log.id);}}onProgress(Math.round((i+1)/Math.max(1,logs.length)*60));}
 zip.file('image-references.json',JSON.stringify(Object.fromEntries(unique),null,2));if(errors.length)zip.file('missing-images.txt',errors.join('\n'));
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'},meta=>onProgress(60+Math.round(meta.percent*.4)));
 downloadCardFile(new File([blob],`ticgle-my-records-${new Date().toISOString().slice(0,10)}.zip`,{type:'application/zip'}));return errors.length;
}
