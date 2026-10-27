import type {LabLog} from './model';
import {countDongLogs,type DongCollection,type DongCount} from './adminDong';

export type MapTier='dong'|'district'|'province'|'country';
export type WideMapTier=Exclude<MapTier,'dong'>;
export type MapViewport={zoom:number;bounds:[number,number,number,number];center:[number,number]};
export const MAP_TIER_LABEL:Record<MapTier,string>={dong:'동네',district:'시·군·구',province:'시·도',country:'국가'};
const thresholds:Record<MapTier,readonly number[]>={dong:[1,2,3,4],district:[1,4,10,20],province:[1,6,18,40],country:[1,10,30,80]};
const cache=new Map<WideMapTier,Promise<DongCollection>>();
export const mapTierForZoom=(zoom:number):MapTier=>zoom>=13.25?'dong':zoom>=10.75?'district':zoom>=7.75?'province':'country';
export function regionStrength(count:number,tier:MapTier):DongCount['level']{
 return Math.max(1,thresholds[tier].filter(n=>count>=n).length) as DongCount['level'];
}
export function regionalCoverage(logs:LabLog[],collection:DongCollection,tier:MapTier,originalDongs: DongCount[]=[]){
 // Count Korea from its precise dong membership, not the simplified coastline.
 // Generalization is visual only: a coastal log must not disappear on zoom-out.
 const features=new Map(collection.features.map(feature=>[feature.properties.code,feature])),groups=new Map<string,DongCount>(),assigned=new Set<string>();
 if(tier!=='dong')for(const dong of originalDongs){
  const code=tier==='district'?dong.feature.properties.code.slice(0,5):tier==='province'?dong.feature.properties.code.slice(0,2):'KOR',feature=features.get(code);
  if(!feature)continue;const group=groups.get(code)||{feature,count:0,level:1 as const,logIds:[]};
  for(const id of dong.logIds)if(!assigned.has(id)){group.logIds.push(id);assigned.add(id);}
  group.count=group.logIds.length;groups.set(code,group);
 }
 const rest=countDongLogs(logs.filter(log=>!assigned.has(log.id)),collection);
 for(const region of rest.dongs){const group=groups.get(region.feature.properties.code);if(group){group.logIds.push(...region.logIds);group.count=group.logIds.length;}else groups.set(region.feature.properties.code,region);}
 return {unmatched:rest.unmatched,dongs:[...groups.values()].map(region=>({...region,level:regionStrength(region.count,tier)}))};
}
export function loadMapRegions(tier:WideMapTier):Promise<DongCollection>{
 let request=cache.get(tier);
 if(!request){request=fetch(`/maps/admin-regions/20261001/${tier}.json`).then(response=>{if(!response.ok)throw new Error('지역 경계를 불러오지 못했어요.');return response.json();}).catch(error=>{cache.delete(tier);throw error;});cache.set(tier,request);}
 return request;
}
export function logsInViewport(logs:LabLog[],viewport:MapViewport):LabLog[]{
 const [west,south,east,north]=viewport.bounds;
 // Leaflet longitude may exceed ±180 after panning across the date line.
 return logs.filter(log=>{const p=log.place;if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||p.lat<south||p.lat>north)return false;return [-360,0,360].some(offset=>p.lng+offset>=west&&p.lng+offset<=east);})
  .sort((a,b)=>{const distance=(log:LabLog)=>{const p=log.place!,dLat=p.lat-viewport.center[0],dLng=Math.min(...[-360,0,360].map(offset=>Math.abs(p.lng+offset-viewport.center[1])));return dLat*dLat+dLng*dLng;};return distance(a)-distance(b)||b.createdAt-a.createdAt;});
}
