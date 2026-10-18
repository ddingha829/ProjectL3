import type { ArchiveItem } from '@/types/l2';
export type PhotoFit = 'contain' | 'cover';
export type PhotoCrop = Pick<ArchiveItem,'cropX'|'cropY'|'cropZoom'|'photoFit'>;
export const clampPosition = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 50));
export const clampZoom = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(1, Math.min(3, n)) : 1;
export function photoCrop(value: Partial<PhotoCrop>): PhotoCrop {
  return {cropX:clampPosition(value.cropX ?? 50),cropY:clampPosition(value.cropY ?? 50),cropZoom:clampZoom(value.cropZoom),...(value.photoFit==='contain'||value.photoFit==='cover'?{photoFit:value.photoFit}:{})};
}
export const photoCropKey = (value: Partial<PhotoCrop>) => {const c=photoCrop(value);return JSON.stringify([c.cropX,c.cropY,c.cropZoom,c.photoFit||'auto']);};
/** Work in displayed pixels so a scaled card and a full-size photo drag identically. */
export function movePhoto(crop: PhotoCrop, box: {width:number;height:number}, image: {width:number;height:number}, fit: PhotoFit, dx:number, dy:number): PhotoCrop {
  const scale=(fit==='contain'?Math.min:Math.max)(box.width/image.width,box.height/image.height)*clampZoom(crop.cropZoom);
  const slackX=box.width-image.width*scale,slackY=box.height-image.height*scale;
  return {...crop,cropX:clampPosition(crop.cropX+(Math.abs(slackX)>1?dx/slackX*100:0)),cropY:clampPosition(crop.cropY+(Math.abs(slackY)>1?dy/slackY*100:0))};
}
