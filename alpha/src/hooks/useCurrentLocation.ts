'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '@/types/l2';
import { isGeoPoint } from '@/lib/mapLocations';

/** One explicit, one-shot browser request. Late results never replace another selection. */
export function useCurrentLocation(active: boolean) {
  const [locating, setLocating] = useState(false), [locationMessage, setMessage] = useState('');
  const [locationError, setError] = useState('');
  const serial = useRef(0), pending = useRef(false), activeRef = useRef(active);
  activeRef.current = active;
  const cancelLocation = useCallback(() => {
    serial.current += 1; pending.current = false;
    setLocating(false); setMessage(''); setError('');
  }, []);
  useEffect(() => { if (!active) cancelLocation(); }, [active, cancelLocation]);
  useEffect(() => () => { serial.current += 1; pending.current = false; }, []);
  const requestLocation = (onLocate: (point: GeoPoint) => void) => {
    if (!activeRef.current || pending.current) return;
    setMessage(''); setError('');
    if (!window.isSecureContext) { setError('현재 위치는 HTTPS로 접속했을 때 사용할 수 있어요.'); return; }
    if (!navigator.geolocation) { setError('이 브라우저에서는 현재 위치를 지원하지 않아요. 장소 이름으로 검색해 주세요.'); return; }
    const token = ++serial.current;
    pending.current = true; setLocating(true);
    const valid = () => activeRef.current && token === serial.current;
    const fail = (code: number) => {
      if (!valid()) return;
      pending.current = false; setLocating(false);
      setError(code === 1 ? '위치 권한이 꺼져 있어요. 브라우저·기기 설정에서 허용하거나 장소 이름으로 검색해 주세요.' : code === 3 ? '위치를 확인하는 데 시간이 걸려요. 다시 눌러 시도해 주세요.' : '현재 위치를 확인하지 못했어요. 기기의 위치 설정을 확인하거나 장소 이름으로 검색해 주세요.');
    };
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (!valid()) return;
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!isGeoPoint(point)) { fail(2); return; }
        pending.current = false; setLocating(false);
        const accuracy = position.coords.accuracy;
        setMessage(`현재 위치를 추가했어요${Number.isFinite(accuracy) && accuracy >= 0 ? ` · 정확도 약 ${accuracy >= 1000 ? `${(accuracy / 1000).toFixed(1)}km` : `${Math.max(1, Math.round(accuracy))}m`}` : ''}`);
        onLocate(point);
      }, error => fail(error.code), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
    } catch { fail(2); }
  };
  return { locating, locationMessage, locationError, requestLocation, cancelLocation };
}
