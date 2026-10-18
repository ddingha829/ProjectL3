'use client';
import {clampZoom,photoCrop,type PhotoCrop,type PhotoFit} from '@/lib/photoCrop';
import './PhotoAdjust.css';
export default function PhotoCropControls({value,defaultFit='cover',onChange,disabled=false,positions=false}:{value:PhotoCrop;defaultFit?:PhotoFit;onChange:(value:PhotoCrop)=>void;disabled?:boolean;positions?:boolean}){
 const crop=photoCrop(value),zoom=clampZoom(crop.cropZoom),fit=crop.photoFit||defaultFit;
 return <div className="photo-crop-controls"><div className="photo-fit-options" role="group" aria-label="사진 맞춤">{([{id:'contain',label:'전체 보기'},{id:'cover',label:'여백 채우기'}] as const).map(option=><button type="button" key={option.id} disabled={disabled} aria-pressed={fit===option.id} onClick={()=>onChange({...crop,photoFit:option.id,cropZoom:1})}>{option.label}</button>)}<button type="button" disabled={disabled} onClick={()=>onChange({...crop,cropX:50,cropY:50,cropZoom:1})}>위치 초기화</button></div>
 <label className="photo-zoom-label">확대 <output>{Math.round(zoom*100)}%</output><input aria-label="사진 확대" type="range" min="1" max="3" step=".01" value={zoom} disabled={disabled} onChange={e=>onChange({...crop,cropZoom:Number(e.target.value)})}/></label>
 {positions&&<div className="photo-axis-controls">{(['cropX','cropY'] as const).map(axis=><label key={axis}>{axis==='cropX'?'가로 위치':'세로 위치'}<input aria-label={axis==='cropX'?'가로 위치':'세로 위치'} type="range" min="0" max="100" step="1" value={crop[axis]} disabled={disabled} onChange={e=>onChange({...crop,[axis]:Number(e.target.value)})}/></label>)}</div>}
 </div>;
}
