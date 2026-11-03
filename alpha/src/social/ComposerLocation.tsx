'use client';
import {useCallback,useEffect,useId,useRef,useState,type RefObject} from 'react';
import {Check,ChevronRight,Heart,LoaderCircle,LocateFixed,MapPin,Search,X} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import type {Place} from './model';
import './ComposerLocation.css';
import {requestBrowserLocation,type LocationIssue} from '@/lib/browserLocation';
type Nearby=Place&{distance?:number};
export default function ComposerLocation({active,automatic=true,work,value,onChange,triggerRef,label='',onLabelChange}:{automatic?:boolean;label?:string;onLabelChange?:(label:string)=>void;triggerRef?:RefObject<HTMLButtonElement|null>;active:boolean;work:boolean;value?:Place;onChange:(place:Place|undefined)=>void}){
 const [draftLabel,setDraftLabel]=useState(label);
 const [nameHint,setNameHint]=useState(false),hintOffered=useRef(false),hintId=useId();
 const [failure,setFailure]=useState<LocationIssue['kind']|''>('');
 const stopLocation=useRef<()=>void>(()=>{}),addressRequest=useRef<AbortController|null>(null);
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[locating,setLocating]=useState(false),[point,setPoint]=useState<{lat:number;lng:number}>(),[results,setResults]=useState<Nearby[]>([]),[error,setError]=useState(''),[query,setQuery]=useState('');
 const asked=useRef(false),revision=useRef(0),callback=useRef(onChange),valueRef=useRef(value),workRef=useRef(work),mounted=useRef(true);callback.current=onChange;valueRef.current=value;workRef.current=work;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;revision.current++;asked.current=false;stopLocation.current();addressRequest.current?.abort();};},[]);
 useEffect(()=>{
  if(!open||!active||work||!automatic||label||!value?.id.startsWith('gps:')){setNameHint(false);return;}
  if(!hintOffered.current){
   try{if(localStorage.getItem('ticgle_place_name_tip_v1')==='seen')return;}catch{/* Optional device-only guide preference. */}
   hintOffered.current=true;setNameHint(true);
   try{localStorage.setItem('ticgle_place_name_tip_v1','seen');}catch{/* Still show once for this mounted composer. */}
  }
  const timer=setTimeout(()=>setNameHint(false),4500);return()=>clearTimeout(timer);
 },[open,active,automatic,work,label,value?.id]);
 const locate=useCallback(()=>{
  stopLocation.current();addressRequest.current?.abort();
  const token=++revision.current;setLocating(true);setError('');setFailure('');
  stopLocation.current=requestBrowserLocation(async p=>{
   if(token!==revision.current||!mounted.current||workRef.current)return;
   const {latitude:lat,longitude:lng}=p.coords;setPoint({lat,lng});
   const controller=new AbortController();addressRequest.current=controller;
   const timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch(`/api/places/nearby?mode=address&lat=${lat}&lng=${lng}`,{headers:{'X-L2-Request':'1'},signal:controller.signal}),data=await response.json();
    if(!response.ok||!data.address)throw Error('ADDRESS_UNAVAILABLE');
    if(token===revision.current&&!workRef.current&&!valueRef.current)callback.current(data.address);
   }catch{if(token===revision.current&&mounted.current&&!workRef.current){
    if(!valueRef.current)callback.current({id:`gps:${lat.toFixed(5)}:${lng.toFixed(5)}`,name:'현재 위치',area:'좌표로 기록',lat,lng});
    setError('위치는 확인했어요. 주소 대신 현재 좌표로 기록하며, 표시할 이름은 직접 바꿀 수 있어요.');
   }}finally{clearTimeout(timeout);if(addressRequest.current===controller)addressRequest.current=null;if(token===revision.current&&mounted.current)setLocating(false);}
  },issue=>{if(token===revision.current&&mounted.current){setLocating(false);setFailure(issue.kind);setError(issue.message);}});
 },[]);
 useEffect(()=>{if(work||!active){revision.current++;stopLocation.current();addressRequest.current?.abort();asked.current=false;if(work)setOpen(false);setLocating(false);return;}if(automatic&&!asked.current&&!value){asked.current=true;locate();}},[active,automatic,work,value,locate]);
 useEffect(()=>{if(!open||work||!point)return;const controller=new AbortController();let current=true,timeout:ReturnType<typeof setTimeout>|undefined;const timer=setTimeout(()=>{setBusy(true);setError('');timeout=setTimeout(()=>{if(current){controller.abort();setBusy(false);setError('장소 검색이 지연되고 있어요. 다시 찾거나 이름만 남겨도 좋아요.');}},10000);void(async()=>{try{const response=await fetch(`/api/places/nearby?lat=${point.lat}&lng=${point.lng}&q=${encodeURIComponent(query.trim())}`,{headers:{'X-L2-Request':'1'},signal:controller.signal}),data=await response.json();if(!response.ok)throw Error(data.error);if(current){const places=[...(data.places||[])].sort((a:Nearby,b:Nearby)=>(a.distance??Infinity)-(b.distance??Infinity));setResults(query.trim()?places:places.slice(0,3));}}catch(e){if(current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'장소를 불러오지 못했어요.');}finally{clearTimeout(timeout);if(current)setBusy(false);}})();},query?350:0);return()=>{current=false;clearTimeout(timer);clearTimeout(timeout);controller.abort();};},[open,point,query,work]);
 if(work)return <span className="un-composer-location is-work"><Heart size={16}/><span>마음의 양식</span></span>;
 return <><button ref={triggerRef} type="button" className="un-composer-location" aria-label="현재 위치 및 근처 장소" onClick={()=>{setDraftLabel(label||value?.name||'');setOpen(true);setQuery('');if(!point){if(value)setPoint({lat:value.lat,lng:value.lng});else locate();}}}>{locating?<LoaderCircle size={15} className="lab-spin"/>:<MapPin size={16}/>}<span>{label||value?.name|| (locating?'위치 확인 중':failure==='permission'?'위치 권한 확인':failure?'위치 다시 찾기':'위치 선택')}</span><ChevronRight size={13}/></button>
 <AccessibleDialog open={open} onClose={()=>setOpen(false)} title="지금 있는 곳" panelClassName="lab-dialog lab-story-subdialog un-nearby-dialog"><form className="un-place-alias" onSubmit={e=>{e.preventDefault();if(!draftLabel.trim())return;onLabelChange?.(draftLabel.trim());setOpen(false);}}><label htmlFor="un-location-label">표시할 위치 이름</label><div><input id="un-location-label" aria-label="표시할 위치 이름" aria-describedby={nameHint?hintId:undefined} maxLength={60} placeholder="우리집, 회사, 단골 카페…" value={draftLabel} onChange={e=>{setNameHint(false);setDraftLabel(e.target.value);}}/><button type="submit" disabled={!draftLabel.trim()}>이름 사용</button></div><small>{nameHint?<span id={hintId} className="un-place-name-tip" role="status">주소 대신 ‘우리집’이나 ‘단골 카페’처럼 장소 이름을 적어도 좋아요.</span>:value?'이름을 바꿔도 지도 좌표는 그대로예요.':'좌표 없이 이름만 남길 수도 있어요.'}</small></form><label className="un-nearby-search"><Search size={17}/><input aria-label="주변 장소 검색" type="search" maxLength={100} placeholder="근처 장소 또는 이름 검색" value={query} onChange={e=>setQuery(e.target.value)}/></label>{value&&<button className="un-nearby-current" onClick={()=>setOpen(false)}><MapPin size={17}/><span>{value.name}<small>{value.area}</small></span><Check size={16}/></button>}{locating&&<p role="status" className="un-nearby-status">현재 위치를 확인하고 있어요.</p>}{error&&<p role="status" className="un-nearby-status">{error}</p>}{busy?<p className="un-nearby-status" role="status"><LoaderCircle size={15} className="lab-spin"/>근처 장소를 찾고 있어요</p>:<div className="un-nearby-results">{results.map(place=><button key={place.id} onClick={()=>{revision.current++;stopLocation.current();addressRequest.current?.abort();setLocating(false);onLabelChange?.('');callback.current(place);setOpen(false);}}><MapPin size={16}/><span><strong>{place.name}</strong><small>{place.area}</small></span>{place.distance!==undefined&&<small>{place.distance<1000?`${place.distance}m`:`${(place.distance/1000).toFixed(1)}km`}</small>}</button>)}{point&&!results.length&&!error&&<p className="un-nearby-status">가까운 장소가 없어요. 다른 이름으로 검색해보세요.</p>}</div>}{(!point||failure)&&<details className="un-location-permission-help" open={failure==='permission'||failure==='policy'||failure==='insecure'}><summary>위치 권한창이 안 뜨나요?</summary><ol><li>휴대폰의 위치 기능을 켜주세요.</li><li>{typeof navigator!=='undefined'&&/SamsungBrowser/i.test(navigator.userAgent)?'휴대폰 설정 → 애플리케이션 → 삼성 인터넷 → 권한 → 위치에서 허용해주세요.':'휴대폰 설정에서 사용 중인 브라우저의 위치 권한을 확인해주세요.'}</li><li>브라우저의 사이트 권한에서 현재 티끌 주소의 위치 접근을 허용한 뒤 아래 버튼을 눌러주세요.</li></ol></details>}<div className="un-nearby-bottom"><button type="button" onClick={locate}><LocateFixed size={15}/>현재 위치 다시 찾기</button><button onClick={()=>{revision.current++;stopLocation.current();addressRequest.current?.abort();setLocating(false);onLabelChange?.('');callback.current(undefined);setOpen(false);}}><X size={15}/>위치 없이</button></div><p className="un-nearby-credit">장소 정보 · Google Maps</p></AccessibleDialog></>;
}
