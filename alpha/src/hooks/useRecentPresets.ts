'use client';
import { useCallback, useEffect, useState } from 'react';
const prefix = 'l2_recent_presets_v1:';
function read(key: string): string[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? [...new Set(data.filter((id): id is string => typeof id === 'string' && id.length < 100))].slice(0, 12) : []; } catch { return []; }
}
export function useRecentPresets(scope: string) {
  const key = prefix + scope;
  const [state, setState] = useState<{key:string;ids:string[]}>({key:'',ids:[]});
  useEffect(() => { setState({key,ids:read(key)}); }, [key]);
  const remember = useCallback((id:string) => {
    const ids = [id,...read(key).filter(value => value !== id)].slice(0,12);
    setState({key,ids}); try { localStorage.setItem(key,JSON.stringify(ids)); } catch { /* Recent selection remains usable for this session. */ }
  }, [key]);
  return { ids: state.key === key ? state.ids : [], remember };
}
