'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Expand,RotateCcw,MapPin,LoaderCircle,X,ArrowUpRight,LocateFixed,Info} from 'lucide-react';
import type * as Leaflet from 'leaflet';
import type {FeatureCollection} from 'geojson';
import {archive,timeAgo,type LabLog,type Person,type Place} from './model';
import EditorialCard from './EditorialCard';
import {LocateFixedIcon,type LocateFixedIconHandle} from '@/components/icons/locate-fixed';
import {RotateCcwIcon,type RotateCcwIconHandle} from '@/components/icons/rotate-ccw';
import './InteractionPolish.css';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {cardView} from './cardView';
import {countDongLogs,dongRings,loadDongBoundaries,type DongCollection,type DongCount} from './adminDong';
import {simpleMapLayer} from './simpleMapLayer';
import {loadMapRegions,mapTierForZoom,MAP_TIER_LABEL,regionalCoverage,type MapTier,type WideMapTier,type MapViewport} from './mapRegions';
import 'leaflet/dist/leaflet.css';
import '@/components/LogbookMap.css';

type Props={logs:LabLog[];people:Person[];dark:boolean;onSelect?:(log:LabLog)=>void;onPick?:(place:Place)=>void;onDistrictSelect?:(dong:DongCount)=>void;onCoverageChange?:(dongs:DongCount[])=>void;onViewportChange?:(viewport:MapViewport)=>void;compact?:boolean;scopeKey:string;highlightedDong?:string;focusedLog?:string};
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_OPTIONS={maxZoom:19,updateWhenIdle:true,keepBuffer:1};
const mapTitle=(log:LabLog)=>log.title.trim()||log.place?.name||'장소 로그';
const LOG_DETAIL_ZOOM=13;
export default function ScratchMap({logs,people,dark,onSelect,onPick,onDistrictSelect,onCoverageChange,onViewportChange,compact=false,scopeKey,highlightedDong,focusedLog}:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<Leaflet.Map|null>(null),engine=useRef<typeof Leaflet|null>(null),markers=useRef<Leaflet.LayerGroup|null>(null),outlines=useRef<Leaflet.LayerGroup|null>(null),panes=useRef<HTMLElement[]>([]),colorLayers=useRef(new Map<number,Leaflet.GridLayer>()),raf=useRef(0),revealRaf=useRef(0),progress=useRef(1);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[focused,setFocused]=useState(''),[boundaries,setBoundaries]=useState<DongCollection|null>(null),[boundaryError,setBoundaryError]=useState(false),[retry,setRetry]=useState(0),[showLogDetails,setShowLogDetails]=useState(true);
 const [currentPoint,setCurrentPoint]=useState<{lat:number;lng:number}|null>(null),[locating,setLocating]=useState(false),[locationError,setLocationError]=useState('');
 const locationRequest=useRef(0),locateIcon=useRef<LocateFixedIconHandle>(null),replayIcon=useRef<RotateCcwIconHandle>(null);
 const [replaying,setReplaying]=useState(false);
 const [tier,setTier]=useState<MapTier>('dong'),[regional,setRegional]=useState<Partial<Record<WideMapTier,DongCollection>>>({}),[regionError,setRegionError]=useState('');
 const userMoved=useRef(false),autoLocated=useRef(false);
 const reduceMotion=useMotionPreference();
 const focusedRef=useRef(focused);focusedRef.current=focused;
 const floatingCard=useRef<HTMLDivElement>(null);
 useEffect(()=>()=>{locationRequest.current++;},[]);
 const located=logs.filter(l=>l.place&&Number.isFinite(l.place.lat)&&Number.isFinite(l.place.lng));
 const places=[...new Map(located.map(l=>[l.place!.id,l.place!])).values()];
 const geometry=located.map(l=>`${l.id}:${l.place!.lat}:${l.place!.lng}`).join('|');
 const markerContent=JSON.stringify(located.map(l=>[l.id,l.title,l.body,l.authorId,l.place!.name]));
 const coverage=useMemo(()=>boundaries?countDongLogs(logs,boundaries):{dongs:[],unmatched:0},[geometry,boundaries]);
 const activeCoverage=useMemo(()=>tier==='dong'||onPick?coverage:regional[tier]?regionalCoverage(logs,regional[tier]!,tier,coverage.dongs):{dongs:[],unmatched:0},[tier,onPick,coverage,regional,geometry]);
 const current=useRef({logs,people,onSelect,onPick,onDistrictSelect,onCoverageChange,onViewportChange,dongs:activeCoverage.dongs});current.current={logs,people,onSelect,onPick,onDistrictSelect,onCoverageChange,onViewportChange,dongs:activeCoverage.dongs};
 useEffect(()=>{if(tier==='dong'||onPick||regional[tier])return;let gone=false;setRegionError('');void loadMapRegions(tier).then(data=>{if(!gone)setRegional(previous=>({...previous,[tier]:data}));}).catch(()=>{if(!gone)setRegionError('지역 경계를 불러오지 못했어요.');});return()=>{gone=true;};},[tier,onPick,regional,retry]);
 useEffect(()=>{
  let gone=false;setBoundaries(null);setBoundaryError(false);
  void loadDongBoundaries(current.current.logs).then(data=>{if(!gone)setBoundaries(data);}).catch(()=>{if(!gone)setBoundaryError(true);});
  return()=>{gone=true;};
 },[geometry,scopeKey,retry]);
 useEffect(()=>{if(boundaries)current.current.onCoverageChange?.(coverage.dongs);},[coverage,boundaries]);
 const redraw=()=>{
  const m=map.current;if(!m)return;
  for(const pane of panes.current){
   const level=Number(pane.dataset.level),dongs=current.current.dongs.filter(d=>d.level===level);
   const path=dongs.flatMap(d=>dongRings(d.feature).map(ring=>ring.map(([lng,lat],index)=>{const p=m.latLngToLayerPoint([lat,lng]);return `${index?'L':'M'} ${p.x} ${p.y}`;}).join(' ')+' Z')).join(' ');
   pane.style.clipPath=`path("${path||'M 0 0'}")`;
   const strength=level;
   pane.style.opacity=String(progress.current*Math.min(1,strength));
   pane.style.filter=strength>1?`saturate(${strength})`:'none';
   pane.dataset.colourStrength=String(level*100);
   pane.dataset.dongs=dongs.map(d=>d.feature.properties.code).join(',');
  }
 };
 useEffect(()=>{if(reduceMotion){cancelAnimationFrame(revealRaf.current);progress.current=1;redraw();setReplaying(false);replayIcon.current?.stopAnimation();}},[reduceMotion]);
 const replay=(manual=false)=>{
  cancelAnimationFrame(revealRaf.current);setReplaying(manual);if(manual)replayIcon.current?.startAnimation();else replayIcon.current?.stopAnimation();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){progress.current=1;redraw();setReplaying(false);replayIcon.current?.stopAnimation();return;}
  const start=performance.now();progress.current=0;redraw();
  const frame=(now:number)=>{const t=Math.min(1,(now-start)/(manual?950:360));progress.current=1-Math.pow(1-t,3);redraw();if(t<1)revealRaf.current=requestAnimationFrame(frame);else{setReplaying(false);replayIcon.current?.stopAnimation();}};
  revealRaf.current=requestAnimationFrame(frame);
 };
 useEffect(()=>{
  let gone=false,resize:ResizeObserver|undefined;setReady(false);setFailed(false);
  void import('leaflet').then(L=>{
   if(gone||!host.current)return;engine.current=L;
   const first=(current.current.logs.find(l=>l.id===focusedLog&&l.place)||current.current.logs.find(l=>l.place))?.place;
   const nearby=currentPoint&&!compact&&!current.current.onPick&&!focusedLog?currentPoint:null;
   const m=L.map(host.current,{dragging:true,zoomControl:false,scrollWheelZoom:!compact,zoomSnap:.25,minZoom:2,maxZoom:18,attributionControl:false}).setView(nearby?[nearby.lat,nearby.lng]:first?[first.lat,first.lng]:[37.55,126.99],compact?12.75:nearby?15:14.25);
   map.current=m;
   userMoved.current=false;
   m.on('dragstart zoomstart',()=>{userMoved.current=true;});
   const gray=m.createPane('scratch-base');gray.style.zIndex='200';gray.classList.add('scratch-base-pane');
   panes.current=[1,2,3,4].map(level=>{const pane=m.createPane(`scratch-color-${level}`);pane.style.zIndex=String(240+level);pane.style.pointerEvents='none';pane.style.clipPath='path("M 0 0")';pane.classList.add('scratch-color-pane');pane.dataset.level=String(level);return pane;});
   const boundaryPane=m.createPane('scratch-boundaries');boundaryPane.style.zIndex='350';
   (current.current.onPick?L.tileLayer(TILE_URL,{...TILE_OPTIONS,pane:'scratch-base',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}):simpleMapLayer(L,{pane:'scratch-base',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'})).addTo(m).on('tileerror',()=>{if(!gone)setFailed(true);}).on('tileload',()=>{if(!gone)setFailed(false);});
   L.control.zoom({position:'bottomleft'}).addTo(m);markers.current=L.layerGroup().addTo(m);outlines.current=L.layerGroup().addTo(m);
   const update=()=>{if(gone)return;cancelAnimationFrame(raf.current);raf.current=requestAnimationFrame(redraw);};m.on('move zoom viewreset resize',update);
   const detailZoom=()=>{if(gone||map.current!==m||!host.current?.isConnected)return;const zoom=m.getZoom(),visible=zoom>=LOG_DETAIL_ZOOM,nextTier=current.current.onPick?'dong':mapTierForZoom(zoom);setTier(nextTier);setShowLogDetails(visible);if(host.current){host.current.dataset.logDetails=String(visible);host.current.dataset.zoom=String(zoom);host.current.dataset.regionTier=nextTier;}if(!visible)setFocused('');const bounds=m.getBounds(),center=m.getCenter();current.current.onViewportChange?.({zoom,bounds:[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()],center:[center.lat,center.lng]});};m.on('zoomend moveend resize',detailZoom);detailZoom();
   m.on('click',event=>{const callback=current.current.onPick;if(callback)callback({id:`point-${event.latlng.lat.toFixed(5)}-${event.latlng.lng.toFixed(5)}`,name:'지도에서 고른 장소',area:'선택한 위치',lat:event.latlng.lat,lng:event.latlng.lng});});
   resize=new ResizeObserver(()=>{m.invalidateSize({pan:false});update();});resize.observe(host.current);setReady(true);update();
  }).catch(()=>{if(!gone)setFailed(true);});
  return()=>{gone=true;cancelAnimationFrame(raf.current);cancelAnimationFrame(revealRaf.current);resize?.disconnect();map.current?.remove();map.current=null;engine.current=null;markers.current=null;outlines.current=null;panes.current=[];colorLayers.current.clear();};
 },[compact,scopeKey]);
 useEffect(()=>{
  const m=map.current,L=engine.current,layer=markers.current;if(!ready||!m||!L||!layer)return;layer.clearLayers();
  for(const log of located){
   const p=log.place!,person=people.find(u=>u.id===log.authorId),button=document.createElement('button');
   button.type='button';button.className='scratch-place-pin scratch-user-dot';button.dataset.logId=log.id;button.style.setProperty('--person',person?.color||'#ff4500');
   button.setAttribute('aria-label',`${person?.name||'나'} · ${p.name} 위치 정보 보기`);button.setAttribute('aria-expanded','false');
   const dot=document.createElement('span');dot.className='scratch-dot-core';dot.setAttribute('aria-hidden','true');
   const title=document.createElement('span');title.className='scratch-map-title';title.textContent=mapTitle(log);title.setAttribute('aria-hidden','true');
   button.append(dot,title);
   button.setAttribute('aria-label',`${person?.name||'나'} · ${title.textContent} · ${p.name} 위치 정보 보기`);
   button.onclick=()=>{if(focusedRef.current===log.id)current.current.onSelect?.(log);else setFocused(log.id);};L.DomEvent.disableClickPropagation(button);
   L.marker([p.lat,p.lng],{icon:L.divIcon({className:'logbook-map-marker',html:button,iconSize:[0,0],iconAnchor:[0,0]}),keyboard:false}).addTo(layer);
  }
 },[geometry,markerContent,ready,people]);
 useEffect(()=>{setFocused(focusedLog||'');},[focusedLog,scopeKey]);
 useEffect(()=>{
  const m=map.current,L=engine.current;if(!ready||!m||!L||!currentPoint)return;
  const point=L.circleMarker([currentPoint.lat,currentPoint.lng],{radius:7,color:'#fff',weight:2,fillColor:'#ff4500',fillOpacity:1,className:'scratch-current-location',interactive:false}).addTo(m);
  point.getElement()?.setAttribute('role','img');point.getElement()?.setAttribute('aria-label','내 현재 위치');
  return()=>{point.remove();};
 },[currentPoint,ready]);
 useEffect(()=>{
  host.current?.querySelectorAll<HTMLButtonElement>('.scratch-user-dot').forEach(button=>{const active=button.dataset.logId===focused;button.classList.toggle('active',active);button.setAttribute('aria-expanded',String(active));});
  const log=current.current.logs.find(row=>row.id===focused),m=map.current;if(ready&&log?.place&&m){if(m.getZoom()<LOG_DETAIL_ZOOM)m.setZoom(LOG_DETAIL_ZOOM,{animate:false});m.panInside([log.place.lat,log.place.lng],{paddingTopLeft:[76,Math.min(log.design==='ticket'?252:204,m.getSize().y-84)],paddingBottomRight:[76,84],animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});}
 },[focused,geometry,markerContent,ready,people]);

 useEffect(()=>{
  const m=map.current,L=engine.current,outline=outlines.current;if(!ready||!m||!L||!outline)return;
  const activeLevels=new Set(activeCoverage.dongs.map(d=>d.level));
  for(const [level,layer] of colorLayers.current)if(!activeLevels.has(level as DongCount['level'])){layer.remove();colorLayers.current.delete(level);}
  for(const level of activeLevels)if(!colorLayers.current.has(level))colorLayers.current.set(level,(onPick?L.tileLayer(TILE_URL,{...TILE_OPTIONS,pane:`scratch-color-${level}`}):simpleMapLayer(L,{pane:`scratch-color-${level}`})).addTo(m));
  outline.clearLayers();
  for(const dong of activeCoverage.dongs){
   const label=document.createElement('span');label.textContent=`${dong.feature.properties.label} · 로그 ${dong.count}개`;
   const polygon=L.geoJSON({type:'FeatureCollection',features:[dong.feature]} as FeatureCollection,{pane:'scratch-boundaries',interactive:!onPick,style:{className:`scratch-dong-outline ${dong.feature.properties.code===highlightedDong?'is-recent':''}`,weight:1,opacity:.45,fillOpacity:0,bubblingMouseEvents:false}}).addTo(outline);
   if(!onPick)polygon.eachLayer(shape=>{
    if(!(shape instanceof L.Path))return;
    const element=shape.getElement();if(!element)return;
    element.setAttribute('data-dong-code',dong.feature.properties.code);element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label',`${dong.feature.properties.label} 로그 ${dong.count}개 보기`);
    element.addEventListener('keydown',event=>{const key=(event as KeyboardEvent).key;if(key==='Enter'||key===' '){event.preventDefault();current.current.onDistrictSelect?.(dong);}});
   });
   polygon.bindTooltip(label,{sticky:true,className:'scratch-dong-tooltip'});
   polygon.on('click',()=>current.current.onDistrictSelect?.(dong));
  }
  redraw();
 },[activeCoverage,ready,onPick,highlightedDong]);
 useEffect(()=>{if(ready)replay();},[activeCoverage,ready]);
 const fit=()=>{const m=map.current,L=engine.current;if(m&&L&&places.length)m.fitBounds(L.latLngBounds(places.map(p=>[p.lat,p.lng])),{padding:[45,55],maxZoom:14,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});};
 const locate=(automatic=false)=>{
  if(locating)return;setFocused('');setLocationError('');
  if(!navigator.geolocation){setLocationError('이 브라우저에서는 현재 위치를 확인할 수 없어요.');return;}
  const request=++locationRequest.current;setLocating(true);locateIcon.current?.startAnimation();
  navigator.geolocation.getCurrentPosition(position=>{
   if(request!==locationRequest.current)return;setLocating(false);
   const lat=position.coords.latitude,lng=position.coords.longitude;
   if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){locateIcon.current?.stopAnimation();setLocationError('현재 위치를 확인하지 못했어요. 다시 눌러주세요.');return;}
   locateIcon.current?.startAnimation();setCurrentPoint({lat,lng});const m=map.current;if(m&&(!automatic||!userMoved.current))m.setView([lat,lng],15,{animate:!automatic&&!matchMedia('(prefers-reduced-motion: reduce)').matches});
  },error=>{
   if(request!==locationRequest.current)return;setLocating(false);locateIcon.current?.stopAnimation();
   setLocationError(error.code===1?'위치 권한을 허용하면 현재 위치를 볼 수 있어요.':'현재 위치를 확인하지 못했어요. 잠시 후 다시 눌러주세요.');
  },{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 };
 useEffect(()=>{if(!ready||onPick||compact||focusedLog||autoLocated.current)return;autoLocated.current=true;locate(true);},[ready,onPick,compact,focusedLog]);
 const selected=located.find(log=>log.id===focused),selectedPerson=selected?people.find(person=>person.id===selected.authorId):undefined;
 const appearance=selected?cardView(selected):null;
 useEffect(()=>{
  const m=map.current,place=selected?.place;if(!ready||!m||!place||!floatingCard.current)return;
  const position=()=>{const point=m.latLngToContainerPoint([place.lat,place.lng]),element=floatingCard.current;if(element){element.style.left=`${point.x}px`;element.style.top=`${point.y-52}px`;}};
  position();m.on('move zoom viewreset resize',position);
  return()=>{m.off('move zoom viewreset resize',position);};
 },[focused,geometry,ready]);
 const matched=activeCoverage.dongs.reduce((sum,d)=>sum+d.count,0);
 return <><div onKeyDown={event=>{if(event.key==='Escape'&&focused){event.stopPropagation();setFocused('');}}} className={`logbook-map scratch-map ${compact?'is-compact':''} ${dark?'is-dark':''} ${onPick?'is-picking':''}`} data-no-page-swipe data-reveal-style="admin-regions" data-region-tier={tier} data-detail={onPick?'precise':'simplified'} data-dongs={activeCoverage.dongs.length} data-matched-logs={matched} data-unmatched-logs={activeCoverage.unmatched}>
  <div ref={host} className="scratch-map-canvas" aria-label={onPick?'장소를 고를 수 있는 지도':'확대 수준별 지역 로그 지도'}/>
  {(!ready||!boundaries&&!boundaryError)&&<div className="scratch-loading" role="status"><LoaderCircle size={22}/>{ready?'행정동 경계를 불러오는 중':'지도를 펼치고 있어요'}</div>}
  {ready&&<div className="scratch-map-tools" data-no-swipe><button onClick={fit} aria-label="공유한 장소 전체 보기" title="전체 보기"><Expand size={13}/></button><button onClick={()=>replay(true)} aria-label="지도 색 채움 다시 보기" aria-busy={replaying} data-replaying={replaying||undefined} title="색 채움 다시 보기"><RotateCcwIcon ref={replayIcon} size={14} isAnimated={false} duration={1.15}/></button>{!onPick&&<button onClick={()=>locate()} disabled={locating} aria-label="내 현재 위치 보기" aria-busy={locating} data-location-state={locating?'locating':locationError?'error':currentPoint?'found':'idle'} title="내 현재 위치"><LocateFixedIcon ref={locateIcon} size={14} isAnimated={false} duration={.75}/></button>}</div>}
  {locationError&&<div className="scratch-location-status" role="status">{locationError}<button onClick={()=>setLocationError('')} aria-label="위치 안내 닫기"><X size={13}/></button></div>}
  {!onPick&&boundaries&&<div className="scratch-caption"><span className="scratch-dot"/><span>{activeCoverage.dongs.length?`${MAP_TIER_LABEL[tier]} ${activeCoverage.dongs.length}곳 · 로그 ${matched}개`:located.length?MAP_TIER_LABEL[tier]:'장소가 있는 로그부터 남겨보세요'}</span></div>}
  {showLogDetails&&selected&&appearance&&<div key={selected.id} ref={floatingCard} className="scratch-floating-card-anchor" style={{left:-1000,top:-1000}}>
   <button className="scratch-floating-card" aria-label={`${mapTitle(selected)} 카드 크게 보기`} onClick={()=>current.current.onSelect?.(selected)}>
    <span aria-hidden="true"><EditorialCard log={selected} author={selectedPerson?.name||'나'} interactive={false}/></span>
   </button>
  </div>}
  {showLogDetails&&selected&&<div className="scratch-point-card" role="region" aria-label="선택한 로그 정보">
   <button className="scratch-point-open" aria-label={`${mapTitle(selected)} 로그 열기`} onClick={()=>current.current.onSelect?.(selected)}>
    <span className="scratch-point-copy"><strong>{mapTitle(selected)}</strong><span>{selectedPerson?.name||'나'} · {timeAgo(selected.createdAt)}</span></span><ArrowUpRight size={13} aria-hidden="true"/>
   </button><button className="scratch-point-close" onClick={()=>setFocused('')} aria-label="장소 정보 닫기"><X size={15}/></button>
  </div>}
  {onPick&&<div className="scratch-pick-hint"><MapPin size={15}/>지도를 눌러 위치를 골라주세요</div>}
  {activeCoverage.unmatched>0&&!boundaryError&&<div className="scratch-unmatched">지역 미확인 {activeCoverage.unmatched}개 · 핀으로 확인</div>}
  {regionError&&<button className="scratch-failure" onClick={()=>setRetry(value=>value+1)}>지역 경계를 불러오지 못했어요. 다시 시도</button>}
  {boundaryError&&<button className="scratch-failure" onClick={()=>setRetry(value=>value+1)}>행정동 경계를 불러오지 못했어요. 다시 시도</button>}
  {failed&&<div className="scratch-failure" role="status">지도 타일 연결이 원활하지 않아요. 장소 목록은 계속 볼 수 있어요.</div>}
  <div className="scratch-map-credits"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>{!onPick&&<a className="scratch-boundary-credit" href="/maps/admin-regions/20261001/ATTRIBUTION.txt" target="_blank" rel="noopener noreferrer" aria-label="지도 경계 데이터 출처 및 라이선스" title="지도 경계 데이터 출처 및 라이선스"><Info size={10}/></a>}</div>
 </div></>;
}
