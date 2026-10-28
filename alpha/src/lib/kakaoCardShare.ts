import {sharedCardUrl} from './sharedCardImage';
type KakaoSDK={isInitialized:()=>boolean;init:(key:string)=>void;Share:{uploadImage:(options:{file:FileList})=>Promise<{infos:{original:{url:string}}}>;sendDefault:(options:Record<string,unknown>)=>void}};
let sdkPromise:Promise<KakaoSDK>|undefined;
export const TICGLE_URL='https://www.ticgle.kr/';
export function groupInviteText(name:string,code:string,expiresAt?:string){
 const safeCode=code.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(safeCode))throw Error('초대 코드를 다시 불러와주세요.');
 const group=name.replace(/[\r\n]/g,' ').trim().slice(0,40)||'우리 모임';
 const expiry=expiresAt&&Number.isFinite(Date.parse(expiresAt))?'\n유효기간: '+new Date(expiresAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
 return `‘${group}’에서 취향을 함께 모아요!\n\n일상·영화·책을 가볍게 남기는 티끌에 초대해요.\n초대 코드: ${safeCode}${expiry}\n\n가입 또는 로그인 후 상단 ‘내 티끌’ → ‘코드로 참여 · 모임 만들기’에서 코드를 입력해주세요.\n${TICGLE_URL}`;
}
export async function prepareKakaoInvite(name:string,code:string,expiresAt?:string):Promise<()=>void>{
 const text=groupInviteText(name,code,expiresAt),sdk=await loadKakao();
 return ()=>sdk.Share.sendDefault({objectType:'text',text,link:{webUrl:TICGLE_URL,mobileWebUrl:TICGLE_URL},buttonTitle:'모임 참여하기'});
}
async function loadKakao():Promise<KakaoSDK>{
 if(!sdkPromise){sdkPromise=(async()=>{
  const response=await fetch('/api/share/config/');if(!response.ok)throw Error('카카오톡 공유 연결을 확인하지 못했어요.');
  const config=await response.json();if(!config.enabled||!config.key)throw Error('카카오톡 공유를 준비 중이에요. 기기 공유를 이용해주세요.');
  const sdk=()=> (window as Window&{Kakao?:KakaoSDK}).Kakao;
  if(!sdk())await new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js';script.async=true;script.crossOrigin='anonymous';
   const timer=setTimeout(()=>{script.remove();reject(Error('카카오톡 연결이 지연되고 있어요. 다시 눌러주세요.'));},10000);
   script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('카카오톡 공유를 불러오지 못했어요.'));};document.head.append(script);
  });
  const kakao=sdk();if(!kakao)throw Error('카카오톡 공유를 불러오지 못했어요.');if(!kakao.isInitialized())kakao.init(config.key);return kakao;
 })();sdkPromise.catch(()=>{sdkPromise=undefined;});}
 return sdkPromise;
}
// Warm up the public SDK only; this never uploads an image or sends an invite.
export const warmKakao=()=>loadKakao().then(()=>undefined);
/** Called only after an explicit Kakao-share click. No log is made public. */
export async function prepareKakaoCard(file:File,title:string):Promise<()=>void>{
 if(file.size>5*1024*1024)throw Error('카카오톡에는 5MB 이하 이미지만 보낼 수 있어요. 앞면 한 장으로 다시 준비해주세요.');
 const sdk=await loadKakao(),transfer=new DataTransfer();transfer.items.add(file);
 const image=await createImageBitmap(file);const width=image.width,height=image.height;image.close();
 let imageUrl:string;
 try{imageUrl=(await sdk.Share.uploadImage({file:transfer.files})).infos.original.url;}catch{throw Error('카카오톡 이미지 전송을 준비하지 못했어요. 다시 시도하거나 기기 공유를 이용해주세요.');}
 const cardUrl=sharedCardUrl(imageUrl);
 const payload={objectType:'feed',content:{title:title.slice(0,200),description:'티끌로 남긴 한 장',imageUrl,imageWidth:width,imageHeight:height,link:{webUrl:cardUrl,mobileWebUrl:cardUrl}},buttons:[{title:'카드 크게 보기',link:{webUrl:cardUrl,mobileWebUrl:cardUrl}}]};
 return ()=>sdk.Share.sendDefault(payload);
}
