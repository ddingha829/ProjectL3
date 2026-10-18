'use client';
import {useState} from 'react';
import type {ArchiveItem,PresetSlot,SkinTheme} from '@/types/l2';
import {photoCrop,photoCropKey,type PhotoCrop} from '@/lib/photoCrop';
import AccessibleDialog from './AccessibleDialog';
import CardStage from './CardStage';
import FitCard from './FitCard';
import PhotoCropControls from './PhotoCropControls';
export default function PhotoAdjustDialog(p:{item:ArchiveItem;slot:PresetSlot;skin:SkinTheme;authorName:string;onApply:(crop:PhotoCrop)=>void;onClose:()=>void}){
 const [crop,setCrop]=useState(()=>photoCrop(p.item));
 return <AccessibleDialog open title="사진 조정" onClose={p.onClose}><div className="photo-adjust-dialog">
 <div className="photo-adjust-preview"><FitCard ratio={p.slot.ratio}><CardStage item={{...p.item,...crop}} slot={p.slot} skin={p.skin} authorName={p.authorName} selectedItems={[]} curationTitle="" photoEditing onPhotoChange={setCrop}/></FitCard></div>
 <p className="photo-adjust-hint">사진을 드래그하고 확대해 구도를 맞춰보세요.</p>
 <PhotoCropControls value={crop} defaultFit={p.slot.layout==='ticket'?'contain':'cover'} onChange={setCrop}/>
 <div className="photo-adjust-actions"><button type="button" onClick={p.onClose}>취소</button><button type="button" className="primary" disabled={photoCropKey(crop)===photoCropKey(p.item)} onClick={()=>{p.onApply(crop);p.onClose();}}>적용</button></div>
 </div></AccessibleDialog>;
}
