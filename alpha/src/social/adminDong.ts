import type {LabLog} from './model';

export type Position=[number,number];
export type DongGeometry={type:'Polygon';coordinates:Position[][]}|{type:'MultiPolygon';coordinates:Position[][][]};
export type DongFeature={type:'Feature';properties:{code:string;name:string;label:string};bbox:[number,number,number,number];geometry:DongGeometry};
export type DongCollection={type:'FeatureCollection';features:DongFeature[]};
type BoundaryIndex={districts:{code:string;bbox:DongFeature['bbox']}[]};
export type DongCount={feature:DongFeature;count:number;level:1|2|3|4;logIds:string[]};
const ROOT='/maps/admin-dong/20261001';
const cache=new Map<string,Promise<unknown>>();

function localJson<T>(path:string):Promise<T>{
 let request=cache.get(path);
 if(!request){
  request=fetch(`${ROOT}/${path}`).then(response=>{
   if(!response.ok)throw new Error('행정동 경계를 불러오지 못했어요.');
   return response.json();
  }).catch(error=>{cache.delete(path);throw error;});
  cache.set(path,request);
 }
 return request as Promise<T>;
}
const valid=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
const inBox=(lng:number,lat:number,bbox:DongFeature['bbox'])=>lng>=bbox[0]&&lng<=bbox[2]&&lat>=bbox[1]&&lat<=bbox[3];

// Load only districts whose bounding boxes intersect the logs, never the whole
// country. These are bundled static assets; no reverse-geocoding API is used.
export async function loadDongBoundaries(logs:LabLog[]):Promise<DongCollection>{
 const points=logs.flatMap(log=>log.place&&valid(log.place.lat,log.place.lng)?[log.place]:[]);
 if(!points.length)return {type:'FeatureCollection',features:[]};
 const index=await localJson<BoundaryIndex>('index.json');
 const districts=index.districts.filter(d=>points.some(p=>inBox(p.lng,p.lat,d.bbox)));
 const groups=await Promise.all(districts.map(d=>localJson<DongCollection>(`${d.code}.json`)));
 return {type:'FeatureCollection',features:groups.flatMap(group=>group.features)};
}

// Boundary segments are included. Holes are excluded; a separate island polygon
// can still contain the point. Sorting below gives edge ties a stable owner.
function ringHit(point:Position,ring:Position[]):'inside'|'edge'|'outside'{
 let inside=false;
 const [x,y]=point;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i];
  const cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
  if(Math.abs(cross)<1e-12&&x>=Math.min(a[0],b[0])-1e-10&&x<=Math.max(a[0],b[0])+1e-10&&y>=Math.min(a[1],b[1])-1e-10&&y<=Math.max(a[1],b[1])+1e-10)return 'edge';
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside?'inside':'outside';
}
export function containsDong(feature:DongFeature,lat:number,lng:number):boolean{
 if(!valid(lat,lng)||!inBox(lng,lat,feature.bbox))return false;
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 return polygons.some(rings=>{
  const outer=ringHit([lng,lat],rings[0]);
  return outer==='edge'||outer==='inside'&&!rings.slice(1).some(ring=>ringHit([lng,lat],ring)!=='outside');
 });
}
export function countDongLogs(logs:LabLog[],collection:DongCollection):{dongs:DongCount[];unmatched:number}{
 const features=[...collection.features].sort((a,b)=>a.properties.code.localeCompare(b.properties.code));
 const counts=new Map<string,DongCount>(),seen=new Set<string>();let unmatched=0;
 for(const log of logs){
  if(!log.place||seen.has(log.id))continue;
  seen.add(log.id);
  const place=log.place,feature=features.find(f=>containsDong(f,place.lat,place.lng));
  if(!feature){unmatched++;continue;}
  const key=feature.properties.code,entry=counts.get(key)||{feature,count:0,level:1 as const,logIds:[]};
  entry.count++;entry.level=Math.min(4,entry.count) as DongCount['level'];entry.logIds.push(log.id);counts.set(key,entry);
 }
 return {dongs:[...counts.values()],unmatched};
}

// Keep outer rings and holes wound in opposite directions for CSS nonzero
// clipping, independently of the source geometry's winding convention.
export function dongRings(feature:DongFeature):Position[][]{
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 return polygons.flatMap(polygon=>polygon.map((ring,index)=>{
  const area=ring.reduce((sum,p,i)=>{const next=ring[(i+1)%ring.length];return sum+p[0]*next[1]-next[0]*p[1];},0);
  return (area>0)===(index===0)?ring:[...ring].reverse();
 }));
}
