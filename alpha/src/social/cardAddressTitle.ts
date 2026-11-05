import type {LabLog} from './model';
const same=(a:string,b:string)=>a.replace(/[\s,]+/g,'')===b.replace(/[\s,]+/g,'');
/** Display only: keep the original title and stored address intact. */
export function compactAddressTitle(title:string,place?:LabLog['place']){
 if(!place||![place.area,place.name].some(address=>address?.trim()&&same(title,address)))return title;
 const parts=title.trim().split(/\s+/),city=parts.find(part=>/[가-힣](?:특별자치시|특별시|광역시|시)$/.test(part)),county=parts.find(part=>/[가-힣]군$/.test(part)),local=parts.find(part=>/[가-힣0-9][동읍면]$/.test(part));
 const region=city?.replace(/(?:특별자치시|특별시|광역시)$/,'시')||county;
 if(region&&local)return region+' '+local;
 const district=parts.find(part=>/[가-힣]구$/.test(part)),road=parts.find(part=>/[가-힣0-9](?:로|길)$/.test(part));
 const short=[region,district,road].filter(Boolean).join(' ');
 return short||title;
}
