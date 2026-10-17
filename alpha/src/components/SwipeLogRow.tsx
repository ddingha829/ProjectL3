'use client';
import { useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';

export default function SwipeLogRow({ title, children, onDelete, disabled }: { title: string; children: ReactNode; onDelete: () => Promise<void>; disabled: boolean }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const gesture = useRef<{ x:number;y:number;offset:number;horizontal:boolean } | null>(null);
  const suppress = useRef(false);
  const remove = async () => { if (busy) return; setBusy(true); try { await onDelete(); } catch { /* Parent retains the log and explains the failure. */ } finally { setBusy(false); setOffset(0); } };
  return <div className={`swipe-log ${dragging ? 'is-dragging' : ''}`} onPointerDown={event => {
    if (disabled || busy || event.button !== 0 || (event.target as HTMLElement).closest('.swipe-log-delete,.swipe-log-more')) return;
    gesture.current = { x:event.clientX,y:event.clientY,offset,horizontal:false };
  }} onPointerMove={event => {
    const start=gesture.current; if (!start) return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if (!start.horizontal && Math.abs(dy)>10 && Math.abs(dy)>Math.abs(dx)) { gesture.current=null; return; }
    if (!start.horizontal && Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)*1.2) { start.horizontal=true; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }
    if (start.horizontal) { suppress.current=true; setOffset(Math.max(-88,Math.min(0,start.offset+dx))); }
  }} onPointerUp={() => { const start=gesture.current; gesture.current=null; setDragging(false); if(start?.horizontal){setOffset(offset < -32 ? -88 : 0);setTimeout(()=>{suppress.current=false;},250);} }} onPointerCancel={() => {gesture.current=null;setDragging(false);setOffset(0);setTimeout(()=>{suppress.current=false;},250);}}>
    <button type="button" className="swipe-log-delete" aria-label={`${title} 삭제`} tabIndex={offset < 0 ? 0 : -1} disabled={busy || offset === 0} onClick={() => void remove()}><Trash2 size={19}/><span>{busy?'삭제 중':'삭제'}</span></button>
    <div className="swipe-log-content" style={{transform:`translateX(${disabled?0:offset}px)`}} onClickCapture={event => {if(suppress.current){event.preventDefault();event.stopPropagation();}}} onKeyDown={event=>{if(event.key==='Delete'&&!disabled){event.preventDefault();setOffset(-88);}}}>{children}</div>
    {!disabled&&<button type="button" className="swipe-log-more" aria-label={`${title} 삭제 메뉴`} aria-expanded={offset<0} onClick={()=>setOffset(offset<0?0:-88)} style={{transform:`translateX(${offset}px)`}}><MoreHorizontal size={16}/></button>}
  </div>;
}
