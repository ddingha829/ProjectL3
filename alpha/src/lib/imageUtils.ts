import { blobToDataUrl, compressPhotoBlob } from './imageCompression';
export async function compressUploadedImage(file: File, maxWidth = 1080, quality = .8): Promise<string> {
  return blobToDataUrl(await compressPhotoBlob(file, maxWidth, quality));
}
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: blob.type });
}
