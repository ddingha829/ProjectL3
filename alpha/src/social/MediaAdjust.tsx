'use client';
import {useState} from 'react';
import AccessibleDialog from '@/components/AccessibleDialog';
import {DEFAULT_PHOTO,type PhotoSettings} from '@/unified/store';
import {MEDIA_PRESETS,mediaFilter} from './mediaFilter';
import './MediaAdjust.css';
export default function MediaAdjust({image,value,video=false,onApply,onClose}:{image:string;value:PhotoSettings;video?:boolean;onApply:(value:PhotoSettings)=>void;onClose:()=>void}){
 const [draft,setDraft]=useState(value);
 return <AccessibleDialog open title="필터·보정" onClose={onClose} panelClassName="lab-dialog un-media-adjust"><img className="un-media-adjust-preview" src={image} alt="보정 미리보기" style={{filter:mediaFilter(draft)}}/>{video&&<p className="un-subtle">대표 이미지로 미리 보여드려요. 영상 재생에도 같은 색감이 적용돼요.</p>}<div className="un-media-presets" role="group" aria-label="필터">{MEDIA_PRESETS.map(preset=><button type="button" key={preset.name} aria-pressed={draft.saturation===preset.saturation&&draft.brightness===preset.brightness&&draft.contrast===preset.contrast} onClick={()=>setDraft({...draft,saturation:preset.saturation,brightness:preset.brightness,contrast:preset.contrast})}>{preset.name}</button>)}</div>{([['saturation','채도',0,200],['brightness','밝기',50,150],['contrast','대비',50,150]] as const).map(([key,label,min,max])=><label className="un-range" key={key}>{label}<output>{draft[key]}%</output><input aria-label={label} type="range" min={min} max={max} value={draft[key]} onChange={event=>setDraft({...draft,[key]:Number(event.target.value)})}/></label>)}<div className="un-media-adjust-actions"><button type="button" className="un-outline" onClick={()=>setDraft({...draft,saturation:DEFAULT_PHOTO.saturation,brightness:DEFAULT_PHOTO.brightness,contrast:DEFAULT_PHOTO.contrast})}>원본으로</button><button type="button" className="un-primary" onClick={()=>onApply(draft)}>보정 적용</button></div></AccessibleDialog>;
}
