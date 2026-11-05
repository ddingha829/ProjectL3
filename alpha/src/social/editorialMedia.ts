/** Restore a still poster in the detached export only. Never seek/capture a video
 * frame or copy playback opacity/visibility into the shared artwork. */
export function freezeEditorialMedia(source:HTMLElement,clone:HTMLElement){
 const sourcePoster=source.querySelector<HTMLImageElement>('img[data-ec-video-poster]');
 let poster=clone.querySelector<HTMLImageElement>('img[data-ec-video-poster]');
 const player=source.querySelector<HTMLVideoElement>('video');
 if(!poster&&player?.poster){
  poster=document.createElement('img');poster.className='ec-bento-image';poster.dataset.ecVideoPoster='true';poster.src=player.poster;
  poster.style.objectFit=player.style.objectFit;poster.style.objectPosition=player.style.objectPosition;poster.style.transform=player.style.transform;poster.style.filter=player.style.filter;
  clone.querySelector('.ec-bento-content')?.prepend(poster);
 }
 if(poster){
  poster.src=sourcePoster?.currentSrc||sourcePoster?.src||poster.src;
  poster.loading='eager';poster.decoding='sync';poster.removeAttribute('hidden');poster.removeAttribute('srcset');poster.removeAttribute('sizes');
  poster.style.visibility='visible';poster.style.opacity='1';
 }
 clone.querySelectorAll('[data-ec-ui],video').forEach(node=>node.remove());
}
