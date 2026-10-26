// Fixed Web Mercator cells stay attached to places when the map pans or zooms.
// At Seoul's latitude each cell is approximately 130 metres wide.
const CELL = 164;
const EARTH = 6378137;
export type RevealCell = {x:number;y:number;delay:number};
export function revealCells(places:{lat:number;lng:number}[],radius:number):RevealCell[]{
 const cells=new Map<string,RevealCell>();
 for(const place of places){
  if(!Number.isFinite(place.lat)||!Number.isFinite(place.lng))continue;
  const lat=Math.max(-85,Math.min(85,place.lat))*Math.PI/180;
  const px=EARTH*place.lng*Math.PI/180,py=EARTH*Math.log(Math.tan(Math.PI/4+lat/2));
  const reach=radius/Math.cos(lat),count=Math.ceil(reach/CELL);
  const cx=Math.floor(px/CELL),cy=Math.floor(py/CELL);
  for(let dx=-count;dx<=count;dx++)for(let dy=-count;dy<=count;dy++){
   const x=cx+dx,y=cy+dy,nx=Math.abs((x+.5)*CELL-px)/reach,ny=Math.abs((y+.5)*CELL-py)/reach;
   // A slightly irregular, chamfered patch rather than another pixelated circle.
   const hash=((Math.imul(x,73856093)^Math.imul(y,19349663))>>>0)%100/100;
   if(Math.max(nx,ny)>.87+hash*.13||nx+ny>1.42+hash*.16)continue;
   const delay=Math.min(.78,Math.max(nx,ny)*.58+hash*.14);
   const key=`${x}:${y}`,existing=cells.get(key);
   if(!existing||delay<existing.delay)cells.set(key,{x,y,delay});
  }
 }
 return [...cells.values()];
}
export function cellCorners(cell:RevealCell):[[number,number],[number,number]]{
 const lat=(y:number)=>(2*Math.atan(Math.exp(y/EARTH))-Math.PI/2)*180/Math.PI;
 return [[lat((cell.y+1)*CELL),cell.x*CELL/EARTH*180/Math.PI],[lat(cell.y*CELL),(cell.x+1)*CELL/EARTH*180/Math.PI]];
}
