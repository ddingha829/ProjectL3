export const TICGLE_SITE='https://www.ticgle.kr';
export function allowedSharedImage(value:unknown):string|null{
 if(typeof value!=='string'||value.length>2400)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 if(!['kakaocdn.net','kakao.com'].some(host=>u.hostname===host||u.hostname.endsWith('.'+host)))return null;
 // Kakao app/authorization pages are never an image destination.
 if(u.hostname.endsWith('kakao.com')&&!/^(?:mud-)?kage\.kakao\.com$/.test(u.hostname))return null;
 return u.href;
 }catch{return null;}
}
export function sharedCardUrl(image:string){const safe=allowedSharedImage(image);if(!safe)throw Error('공유 이미지 주소를 확인하지 못했어요.');return TICGLE_SITE+'/share/image/?image='+encodeURIComponent(safe);}
