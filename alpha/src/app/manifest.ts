import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {
 id:'/',name:'L2 - 일상 로그하기',short_name:'L2.',
 description:'일상을 카드로 기록하고 원하는 모임에 나누세요.',
 start_url:'/',scope:'/',display:'standalone',background_color:'#FFFFFF',theme_color:'#FFFFFF',
 icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
};}
