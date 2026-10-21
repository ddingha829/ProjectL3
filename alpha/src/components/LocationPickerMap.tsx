'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { LocateFixed, MapPin, Minus, Plus } from 'lucide-react';
import type * as Leaflet from 'leaflet';
import type { GeoPoint } from '@/types/l2';
import { isGeoPoint } from '@/lib/mapLocations';
import 'leaflet/dist/leaflet.css';
import './LogbookMap.css';
import './LocationPickerMap.css';

export default function LocationPickerMap({ point, onChange }: { point: GeoPoint; onChange: (point: GeoPoint) => void }) {
  const node = useRef<HTMLDivElement>(null), mapRef = useRef<Leaflet.Map | null>(null);
  const origin = useRef(point), latest = useRef(point), change = useRef(onChange);
  latest.current = point; change.current = onChange;
  const [ready,setReady] = useState(false), [failed,setFailed] = useState(false), [revision,setRevision] = useState(0);
  const hint = useId();
  useEffect(() => {
    let canceled = false, resize: ResizeObserver | undefined, frame = 0;
    setReady(false); setFailed(false);
    void import('leaflet').then(L => {
      if (canceled || !node.current) return;
      const map = L.map(node.current, { zoomControl:false, scrollWheelZoom:false, zoomAnimation:false, fadeAnimation:false, markerZoomAnimation:false, keyboard:false, inertia:false, worldCopyJump:true }).setView([latest.current.lat,latest.current.lng],17);
      mapRef.current = map;
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, keepBuffer:1, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      let errors = 0;
      tiles.on('tileerror',()=>{if(++errors>=3&&!canceled)setFailed(true);});
      tiles.on('tileload',()=>{errors=0;if(!canceled)setFailed(false);});
      let resizing = false;
      const choose = () => { if(resizing)return;const center = map.getCenter().wrap(), next = {lat:center.lat,lng:center.lng};if(isGeoPoint(next))change.current(next); };
      map.on('moveend',choose);
      map.on('click',(event:Leaflet.LeafletMouseEvent)=>map.panTo(event.latlng.wrap(),{animate:false}));
      map.attributionControl.setPrefix(false);
      resize = new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{resizing=true;map.invalidateSize({pan:false,debounceMoveend:false});map.setView([latest.current.lat,latest.current.lng],map.getZoom(),{animate:false});resizing=false;});});
      resize.observe(node.current);setReady(true);
    }).catch(()=>{if(!canceled)setFailed(true);});
    return()=>{canceled=true;cancelAnimationFrame(frame);resize?.disconnect();mapRef.current?.remove();mapRef.current=null;};
  },[revision]);
  useEffect(()=>{
    const map=mapRef.current;if(!map||!ready)return;
    const center=map.getCenter();
    if(Math.abs(center.lat-point.lat)>1e-8||Math.abs(center.lng-point.lng)>1e-8)map.panTo([point.lat,point.lng],{animate:false});
  },[point.lat,point.lng,ready]);
  return <div className="location-picker-map-wrap">
    <p id={hint} className="location-picker-hint">지도를 움직이거나 눌러 위치를 정하세요</p>
    <div className="logbook-map location-picker-map" data-no-swipe data-lat={point.lat} data-lng={point.lng}>
      <div ref={node} className="logbook-map-canvas location-picker-canvas" role="group" aria-label="위치 선택 지도" aria-describedby={hint} tabIndex={0} onKeyDown={event=>{const map=mapRef.current;if(!map)return;const offset=({ArrowLeft:[-32,0],ArrowRight:[32,0],ArrowUp:[0,-32],ArrowDown:[0,32]} as Record<string,[number,number]>)[event.key];if(offset){event.preventDefault();map.panBy(offset,{animate:false});}else if(['+','=','-'].includes(event.key)){event.preventDefault();if(event.key==='-')map.zoomOut();else map.zoomIn();}}}/>
      <span className="location-picker-center" aria-hidden="true"><MapPin size={38} strokeWidth={1.5}/></span>
      <div className="logbook-map-controls location-picker-controls">
        <button type="button" aria-label="처음 위치로" disabled={!ready} onClick={()=>mapRef.current?.setView([origin.current.lat,origin.current.lng],17,{animate:false})}><LocateFixed size={18}/></button>
        <button type="button" aria-label="지도 확대" disabled={!ready} onClick={()=>mapRef.current?.zoomIn()}><Plus size={20}/></button>
        <button type="button" aria-label="지도 축소" disabled={!ready} onClick={()=>mapRef.current?.zoomOut()}><Minus size={20}/></button>
      </div>
      {failed&&<button type="button" className="location-picker-retry" onClick={()=>setRevision(value=>value+1)}>지도를 다시 불러오기</button>}
      {!ready&&!failed&&<span className="location-picker-loading" role="status">지도 불러오는 중…</span>}
      <span className="sr-only" role="status">선택한 위치: 위도 {point.lat.toFixed(5)}, 경도 {point.lng.toFixed(5)}</span>
    </div>
  </div>;
}
