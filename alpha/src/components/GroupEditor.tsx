'use client';
import { useState } from 'react';
import type { ArchiveItem } from '@/types/l2';
import { isLogGroup, MAX_GROUP_MEMBERS } from '@/lib/logGroups';

export default function GroupEditor({item,archives,onSave}:{item:ArchiveItem;archives:ArchiveItem[];onSave:(title:string,ids:string[])=>Promise<void>}){
  const [title,setTitle]=useState(item.title);const [ids,setIds]=useState((item.memberIds||[]).filter(id=>archives.some(entry=>entry.id===id)));
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  return <form className="group-editor" onSubmit={async event=>{event.preventDefault();if(!title.trim()||!ids.length||busy)return;setBusy(true);setError('');try{await onSave(title.trim(),ids);}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}}}>
    <label htmlFor="edit-group-name">모음 이름</label><input id="edit-group-name" value={title} onChange={event=>setTitle(event.target.value)} maxLength={80} disabled={busy}/><div className="group-editor-members">{archives.filter(entry=>!isLogGroup(entry)).map(entry=><label key={entry.id}><input type="checkbox" checked={ids.includes(entry.id)} disabled={busy||!ids.includes(entry.id)&&ids.length>=MAX_GROUP_MEMBERS} onChange={()=>setIds(previous=>previous.includes(entry.id)?previous.filter(id=>id!==entry.id):[...previous,entry.id])}/><span>{entry.title}</span></label>)}</div>{error&&<p role="alert">{error}</p>}<button type="submit" className="test-button primary" disabled={busy||!ids.length||!title.trim()}>{busy?'저장 중…':`그룹 저장 · ${ids.length}개`}</button>
  </form>;
}
