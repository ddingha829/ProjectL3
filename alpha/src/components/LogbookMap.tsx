'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, LocateFixed, MapPin, Plus, Minus } from 'lucide-react';
import type * as Leaflet from 'leaflet';
import type { ArchiveItem, GeoPoint } from '@/types/l2';
import { isGeoPoint } from '@/lib/mapLocations';
import { allowsMotion } from '@/lib/motion';
import 'leaflet/dist/leaflet.css';
import './LogbookMap.css';

interface Props {
  items: ArchiveItem[];
  onOpen: (item: ArchiveItem) => void;
  onCoordinates: (id: string, coordinates: GeoPoint) => Promise<void>;
}

export default function LogbookMap({ items, onOpen, onCoordinates }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [focusedId, setFocusedId] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const focusRef = useRef('');
  const active = items.find(item => item.id === focusedId) || items[0];
  focusRef.current = active?.id || '';
  const located = useMemo(() => items.filter((item): item is ArchiveItem & { coordinates: GeoPoint } => isGeoPoint(item.coordinates)), [items]);
  const geometryKey = located.map(item => `${item.id}:${item.coordinates.lat}:${item.coordinates.lng}`).join('|');
  const reduced = () => !allowsMotion();

  useEffect(() => {
    let canceled = false;
    let resize: ResizeObserver | undefined;
    setFailed(false); setReady(false);
    void import('leaflet').then(L => {
      if (canceled || !containerRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true, zoomAnimation: !reduced(), fadeAnimation: !reduced(), markerZoomAnimation: !reduced() }).setView([36.3, 127.8], 7);
      mapRef.current = map;
      let errors = 0;
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19, updateWhenIdle: true, keepBuffer: 1,
      }).addTo(map);
      tiles.on('tileerror', () => { if (++errors >= 3 && !canceled) setFailed(true); });
      tiles.on('tileload', () => { errors = 0; if (!canceled) setFailed(false); });
      markersRef.current = L.layerGroup().addTo(map);
      map.attributionControl.setPrefix(false);
      resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      resize.observe(containerRef.current);
      setReady(true);
    }).catch(() => { if (!canceled) setFailed(true); });
    return () => { canceled = true; resize?.disconnect(); mapRef.current?.remove(); mapRef.current = null; markersRef.current = null; };
  }, [revision]);

  useEffect(() => {
    const L = leafletRef.current, map = mapRef.current, layer = markersRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    const buckets = new Map<string, typeof located>();
    for (const item of located) {
      const key = `${item.coordinates.lat.toFixed(5)},${item.coordinates.lng.toFixed(5)}`;
      buckets.set(key, [...(buckets.get(key) || []), item]);
    }
    for (const bucket of buckets.values()) {
      const picked = bucket.find(item => item.id === focusRef.current) || bucket[0];
      const label = document.createElement('button');
      label.type = 'button'; label.className = `logbook-map-pin ${bucket.some(item => item.id === focusRef.current) ? 'active' : ''}`;
      label.dataset.logId = picked.id;
      label.setAttribute('aria-label', `${picked.title} 지도 핀${bucket.length > 1 ? `, 같은 장소 로그 ${bucket.length}개` : ''}`);
      const title = document.createElement('span'); title.textContent = picked.title; label.append(title);
      if (bucket.length > 1) { const count = document.createElement('small'); count.textContent = `+${bucket.length - 1}`; label.append(count); }
      label.onclick = () => {
        const current = bucket.findIndex(item => item.id === focusRef.current);
        setFocusedId(bucket[current < 0 ? 0 : (current + 1) % bucket.length].id);
      };
      L.DomEvent.disableClickPropagation(label);
      L.marker([picked.coordinates.lat, picked.coordinates.lng], { icon: L.divIcon({ className: 'logbook-map-marker', html: label, iconSize: [0, 0], iconAnchor: [0, 0] }), keyboard: false, zIndexOffset: picked.id === focusRef.current ? 1000 : 0 }).addTo(layer);
    }
  }, [located, ready, focusedId]);

  useEffect(() => {
    const map = mapRef.current, L = leafletRef.current;
    if (!ready || !map || !L || !located.length) return;
    map.fitBounds(L.latLngBounds(located.map(item => [item.coordinates.lat, item.coordinates.lng])), { paddingTopLeft: [60, 60], paddingBottomRight: [60, 125], maxZoom: 15, animate: false });
    // Only geometry changes should reset the user's zoom/pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, geometryKey]);

  useEffect(() => {
    if (focusedId && ready && isGeoPoint(active?.coordinates)) mapRef.current?.panTo([active.coordinates.lat, active.coordinates.lng], { animate: !reduced() });
  }, [ready, focusedId, active?.id, active?.coordinates]);

  const fitAll = () => {
    const L = leafletRef.current;
    if (L && located.length) mapRef.current?.fitBounds(L.latLngBounds(located.map(item => [item.coordinates.lat, item.coordinates.lng])), { padding: [65, 65], maxZoom: 15, animate: !reduced() });
  };
  const resolve = async () => {
    if (!active || resolving) return;
    setResolving(true); setResolveError('');
    try {
      const response = await fetch('/api/places/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: active.id }) });
      const data = await response.json();
      if (!response.ok || !isGeoPoint(data.coordinates)) throw new Error(data.detail || '장소를 다시 선택해 위치를 연결해 주세요.');
      await onCoordinates(active.id, data.coordinates);
    } catch (error) { setResolveError(error instanceof Error ? error.message : '위치를 연결하지 못했어요.'); }
    finally { setResolving(false); }
  };

  return <div className="logbook-map" aria-label="로그 지도">
    <div ref={containerRef} className="logbook-map-canvas" aria-label="OpenStreetMap 지도"/>
    <div className="logbook-map-caption"><MapPin size={12}/><span>MAP</span><small>{located.length} / {items.length}</small></div>
    <div className="logbook-map-controls"><button type="button" aria-label="모든 장소 보기" disabled={!located.length || !ready} onClick={fitAll}><LocateFixed size={16}/></button><button type="button" aria-label="지도 확대" disabled={!ready} onClick={() => mapRef.current?.zoomIn()}><Plus size={18}/></button><button type="button" aria-label="지도 축소" disabled={!ready} onClick={() => mapRef.current?.zoomOut()}><Minus size={18}/></button></div>
    {failed && <button type="button" className="logbook-map-retry" onClick={() => setRevision(v => v + 1)}>지도를 다시 연결</button>}
    {active ? <div className="logbook-map-focus"><button type="button" onClick={() => onOpen(active)} aria-label={`${active.title} 로그 열기`}><span><strong>{active.title}</strong><small>{active.addressShort || active.loc}</small><time>로그 추가 · {active.date}</time></span><ArrowUpRight size={20}/></button>{!isGeoPoint(active.coordinates) && <button type="button" className="logbook-map-resolve" disabled={resolving} onClick={() => void resolve()}>{resolving ? '연결 중…' : '위치 연결'}</button>}</div> : <p className="logbook-map-empty">장소가 연결된 로그가 없어요.</p>}
    {resolveError && <p className="logbook-map-error" role="alert">{resolveError}</p>}
  </div>;
}
