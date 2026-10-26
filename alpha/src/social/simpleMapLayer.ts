import {VectorTile, type VectorTileFeature} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
import type * as Leaflet from 'leaflet';

// Render only the map's visual hierarchy, not individual buildings or POIs.
// Shared bounded cache deduplicates the base and four clipped colour layers.
const tiles=new Map<string,Promise<HTMLCanvasElement>>();
const VECTOR='https://vector.openstreetmap.org/shortbread_v1';
const roads:Record<string,number>={motorway:3.6,trunk:3.1,primary:2.5,secondary:1.7,tertiary:1};
function path(ctx:CanvasRenderingContext2D,feature:VectorTileFeature){
 ctx.beginPath();const scale=256/feature.extent;
 for(const ring of feature.loadGeometry()){
  ring.forEach((p,i)=>i?ctx.lineTo(p.x*scale,p.y*scale):ctx.moveTo(p.x*scale,p.y*scale));
  if(feature.type===3)ctx.closePath();
 }
}
function paint(canvas:HTMLCanvasElement,tile:VectorTile,zoom:number,ratio:number){
 const ctx=canvas.getContext('2d')!;ctx.scale(ratio,ratio);ctx.fillStyle='#eeeae1';ctx.fillRect(0,0,256,256);
 const each=(name:string,draw:(f:VectorTileFeature)=>void)=>{const layer=tile.layers[name];if(layer)for(let i=0;i<layer.length;i++)draw(layer.feature(i));};
 each('ocean',f=>{path(ctx,f);ctx.fillStyle='#9ec9d4';ctx.fill('evenodd');});
 each('land',f=>{const kind=String(f.properties.kind);if(/forest|wood|park|grass|garden|recreation|nature|meadow|scrub/.test(kind)){path(ctx,f);ctx.fillStyle='#bed3ab';ctx.fill('evenodd');}});
 each('water_polygons',f=>{path(ctx,f);ctx.fillStyle='#9ec9d4';ctx.fill('evenodd');});
 each('water_lines',f=>{if(!/^(river|canal)$/.test(String(f.properties.kind)))return;path(ctx,f);ctx.strokeStyle='#9ec9d4';ctx.lineWidth=2;ctx.stroke();});
 ctx.lineJoin='round';ctx.lineCap='round';
 for(const casing of [true,false])each('streets',f=>{
  if(f.properties.rail)return;
  const kind=String(f.properties.kind),width=roads[kind]||(zoom>=14&&/^(residential|unclassified)$/.test(kind)?.6:0);
  if(!width)return;path(ctx,f);ctx.lineWidth=width+(casing?1.8:0);ctx.strokeStyle=casing?'#d9d4ca':/motorway|trunk|primary/.test(kind)?'#f1d9ad':'#fffdf7';ctx.stroke();
 });
 const boxes:number[][]=[];let labels=0;
 const label=(f:VectorTileFeature,water=false)=>{
  if(labels>=5||f.type!==1)return;
  if(!water&&!/^(city|town|suburb|quarter|neighbourhood)$/.test(String(f.properties.kind)))return;
  const name=String(f.properties.name||f.properties.name_en||'');if(!name||name.length>18)return;
  const point=f.loadGeometry()[0]?.[0];if(!point)return;
  const x=point.x/f.extent*256,y=point.y/f.extent*256;
  ctx.font=`${water?'500':'600'} 11px "Sebang Gothic",sans-serif`;const w=ctx.measureText(name).width;
  const b=[x-w/2-5,y-9,x+w/2+5,y+9];if(b[0]<2||b[2]>254||b[1]<2||b[3]>254||boxes.some(a=>b[0]<a[2]&&b[2]>a[0]&&b[1]<a[3]&&b[3]>a[1]))return;
  boxes.push(b);labels++;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#eeebe3';ctx.strokeText(name,x,y);ctx.fillStyle=water?'#4d7a87':'#6d7067';ctx.fillText(name,x,y);
 };
 each('place_labels',f=>label(f));each('water_polygons_labels',f=>label(f,true));
}
async function render(coords:Leaflet.Coords,ratio:number){
 const key=`${coords.z}/${coords.x}/${coords.y}@${ratio}`;const prior=tiles.get(key);if(prior)return prior;
 const pending=(async()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256*ratio;
  try{
   const response=await fetch(`${VECTOR}/${coords.z}/${coords.x}/${coords.y}.mvt`,{signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new Error('Map tile unavailable');
   paint(canvas,new VectorTile(new PbfReader(new Uint8Array(await response.arrayBuffer()))),coords.z,ratio);canvas.dataset.source='simplified-vector';
  }catch{
   // Preserve real geography if the vector service is temporarily unavailable.
   await new Promise<void>((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);canvas.dataset.source='raster-fallback';resolve();};image.onerror=()=>reject(new Error('Map tile unavailable'));image.src=`https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;});
  }
  return canvas;
 })();tiles.set(key,pending);if(tiles.size>24)tiles.delete(tiles.keys().next().value!);
 try{return await pending;}catch(error){tiles.delete(key);throw error;}
}
export function simpleMapLayer(L:typeof Leaflet,options:Leaflet.GridLayerOptions){
 const SimpleLayer=L.GridLayer.extend({createTile(coords:Leaflet.Coords,done:Leaflet.DoneCallback){
  const ratio=2,canvas=document.createElement('canvas');canvas.width=canvas.height=256*ratio;
  void render(coords,ratio).then(source=>{canvas.getContext('2d')!.drawImage(source,0,0);canvas.dataset.source=source.dataset.source;done(undefined,canvas);},error=>done(error,canvas));return canvas;
 }});
 return new (SimpleLayer as new(options:Leaflet.GridLayerOptions)=>Leaflet.GridLayer)({tileSize:256,maxNativeZoom:14,maxZoom:19,updateWhenIdle:true,keepBuffer:1,...options}) as Leaflet.GridLayer;
}
