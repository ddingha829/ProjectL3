'use client';
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { GripVertical, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import type { PresetSlot } from '@/types/l2';
import { getArchiveCategory } from '@/lib/archiveCategories';
import { reorderPresets } from '@/lib/presetDefaults';
import { allowsMotion } from '@/lib/motion';
import { useDragScrollRail } from '@/hooks/useDragScrollRail';
import AccessibleDialog from './AccessibleDialog';

interface Props {
  presets: PresetSlot[];
  activeId: string;
  defaultId: string;
  onSelect: (slot: PresetSlot, direction: number) => void;
  onAdd: () => void;
  onReorder: (ids: string[]) => void;
}
type Gesture = { pointer: number; id: string; x: number; y: number; startX: number; startY: number; before: string[]; next: string[]; moved: boolean };

export default function PresetLibrary(p: Props) {
  const railRef = useRef<HTMLDivElement>(null), railDrag = useDragScrollRail(railRef);
  const [order, setOrder] = useState<string[] | null>(null), [dragging, setDragging] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null), [announcement, setAnnouncement] = useState('');
  const gesture = useRef<Gesture | null>(null), animation = useRef(0), suppressClick = useRef(false);
  const positions = useRef(new Map<string, number>());
  const focusAfterMove = useRef<string | null>(null);
  const presets = reorderPresets(p.presets, order || p.presets.map(slot => slot.id));
  const ids = presets.map(slot => slot.id);
  const latest = useRef(p); latest.current = p;
  useEffect(() => () => cancelAnimationFrame(animation.current), []);
  const defaultAssignments = [...p.presets].sort((a,b)=>a.id.localeCompare(b.id)).map(slot => `${slot.id}:${slot.defaultFor?.join(',') || ''}`).join('|');
  const activeName = p.presets.find(slot => slot.id === p.activeId)?.name;
  useEffect(() => { setOrder(null); railRef.current?.scrollTo({ left: 0, behavior: 'instant' }); }, [p.defaultId, defaultAssignments]);
  useEffect(() => {
    const rail = railRef.current, item = rail?.querySelector<HTMLElement>(`[data-preset-id="${CSS.escape(p.activeId)}"]`);
    if (rail && item) {
      const left = item.offsetLeft - (rail.clientWidth - item.offsetWidth) / 2;
      // A new chip far outside the viewport must be usable immediately.
      rail.scrollTo({ left, behavior: allowsMotion() && Math.abs(left - rail.scrollLeft) < rail.clientWidth ? 'smooth' : 'instant' });
    }
  }, [p.activeId, activeName]);
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    railRef.current?.querySelectorAll<HTMLElement>('[data-preset-id]').forEach(node => {
      const id = node.dataset.presetId!, left = node.offsetLeft;
      next.set(id, left);
      const before = positions.current.get(id);
      if (before !== undefined && before !== left && id !== dragging && allowsMotion()) node.animate([{ transform: `translateX(${before - left}px)` }, { transform: 'translateX(0)' }], { duration: 180, easing: 'ease-out' });
    });
    positions.current = next;
    if (focusAfterMove.current) {
      const item = railRef.current?.querySelector<HTMLElement>(`[data-preset-id="${CSS.escape(focusAfterMove.current)}"]`);
      item?.querySelector<HTMLElement>('.preset-drag-handle')?.focus({ preventScroll: true });
      focusAfterMove.current = null;
    }
  }, [ids.join('|'), dragging]);

  const commit = (next: string[], id: string, before: string[]) => {
    try {
      latest.current.onReorder(next); setOrder(next);
      const name = latest.current.presets.find(slot => slot.id === id)?.name || '프리셋';
      setAnnouncement(`${name}, ${next.indexOf(id) + 1}번째로 이동했어요.`);
    } catch { setOrder(before); setAnnouncement('순서를 저장하지 못했어요. 원래 위치를 유지합니다.'); }
  };
  const move = (id: string, step: number) => {
    const index = ids.indexOf(id), target = index + step;
    if (index < 0 || target < 0 || target >= ids.length) return;
    if (!menuId) focusAfterMove.current = id;
    const next = [...ids]; next.splice(index, 1); next.splice(target, 0, id); commit(next, id, ids);
  };
  const updateTarget = () => {
    const g = gesture.current, rail = railRef.current;
    if (!g?.moved || !rail) return;
    const nodes = [...rail.querySelectorAll<HTMLElement>('[data-preset-id]')];
    if (nodes.map(node=>node.dataset.presetId).join('|') !== g.next.join('|')) return;
    const left = rail.getBoundingClientRect().left - rail.scrollLeft;
    // Hit-test layout positions, not the transient FLIP animation rectangles.
    const target = nodes.reduce<HTMLElement | null>((nearest, node) => {
      return !nearest || Math.abs(g.x - (left + node.offsetLeft + node.offsetWidth / 2)) < Math.abs(g.x - (left + nearest.offsetLeft + nearest.offsetWidth / 2)) ? node : nearest;
    }, null)?.dataset.presetId;
    if (!target || target === g.id) return;
    const from = g.next.indexOf(g.id), to = g.next.indexOf(target);
    if (from < 0 || to < 0) return;
    const next = [...g.next]; next.splice(from, 1); next.splice(to, 0, g.id); g.next = next; setOrder(next);
  };
  const scroll = () => {
    const g = gesture.current, rail = railRef.current;
    if (!g || !rail) return;
    if (g.moved) {
      const rect = rail.getBoundingClientRect();
      const delta = g.x < rect.left + 32 ? -7 : g.x > rect.right - 32 ? 7 : 0;
      if (delta) { rail.scrollLeft += delta; updateTarget(); }
    }
    animation.current = requestAnimationFrame(scroll);
  };
  const start = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
    suppressClick.current = false;
    gesture.current = { pointer: event.pointerId, id, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, before: ids, next: ids, moved: false };
    animation.current = requestAnimationFrame(scroll);
  };
  const drag = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current; if (!g || g.pointer !== event.pointerId) return;
    event.stopPropagation(); event.preventDefault(); g.x = event.clientX; g.y = event.clientY;
    if (!g.moved && Math.hypot(g.x - g.startX, g.y - g.startY) >= 6) { g.moved = true; suppressClick.current = true; railRef.current?.setPointerCapture(event.pointerId); setDragging(g.id); }
    updateTarget();
  };
  const finish = (event: PointerEvent<HTMLElement>, cancel = false) => {
    const g = gesture.current; if (!g || g.pointer !== event.pointerId) return;
    event.stopPropagation(); gesture.current = null; cancelAnimationFrame(animation.current); setDragging(null);
    if (railRef.current?.hasPointerCapture(event.pointerId)) railRef.current.releasePointerCapture(event.pointerId);
    if (cancel) setOrder(g.before);
    else if (g.moved) commit(g.next, g.id, g.before);
  };
  return <div className="preset-library" data-guide="studio-library">
    <div className="preset-library-heading"><h2>프리셋 목록</h2><small>{presets.length} / 20</small></div>
    <div className="preset-library-track">
      <div ref={railRef} {...railDrag} onPointerMove={event=>gesture.current?drag(event):railDrag.onPointerMove(event)} onPointerUp={event=>gesture.current?finish(event):railDrag.onPointerUp(event)} onPointerCancel={event=>gesture.current?finish(event,true):railDrag.onPointerCancel(event)} className={`preset-rail studio-preset-rail ${dragging ? 'is-reordering' : ''}`} aria-label="카드 프리셋">
        {presets.map((preset, index) => {
          const categories = preset.defaultFor?.map(category => getArchiveCategory(category).label) || [];
          const defaults = [...(p.defaultId === preset.id ? ['전체'] : []), ...categories].join('·');
          return <div className={`preset-library-item ${dragging === preset.id ? 'is-moving' : ''}`} data-preset-id={preset.id} key={preset.id}>
            <button type="button" className={`preset-library-chip ${p.activeId === preset.id ? 'selected' : ''} ${defaults ? 'is-default' : ''}`} aria-pressed={p.activeId === preset.id} onClick={() => p.onSelect(preset, index < ids.indexOf(p.activeId) ? -1 : 1)} title={defaults ? `${preset.name} · ${defaults} 기본 프리셋` : preset.name}><span>{preset.name}</span>{defaults && <small>{defaults}</small>}</button>
            <button type="button" className="preset-drag-handle" aria-label={`${preset.name} 순서 변경`} title="드래그로 이동 · 눌러서 순서 변경" onPointerDown={event => start(event, preset.id)} onPointerMove={drag} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onClick={event => { event.stopPropagation(); if (suppressClick.current) { suppressClick.current = false; return; } setMenuId(preset.id); }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); move(preset.id, event.key === 'ArrowLeft' ? -1 : 1); } }}><GripVertical size={13}/></button>
          </div>;
        })}
      </div>
      <button type="button" className="preset-add" onClick={p.onAdd} disabled={presets.length >= 20} aria-label="새 프리셋 추가" title={`${presets.length}/20`}><Plus size={18}/></button>
    </div>
    <span className="sr-only" role="status">{announcement}</span>
    <AccessibleDialog open={Boolean(menuId)} onClose={() => setMenuId(null)} title="프리셋 순서 변경"><div className="preset-order-actions"><button type="button" disabled={!menuId || ids.indexOf(menuId) <= 0} onClick={() => menuId && move(menuId, -1)}><ArrowLeft size={17}/>앞으로 이동</button><button type="button" disabled={!menuId || ids.indexOf(menuId) >= ids.length - 1} onClick={() => menuId && move(menuId, 1)}><ArrowRight size={17}/>뒤로 이동</button></div></AccessibleDialog>
  </div>;
}
