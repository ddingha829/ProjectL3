import type {MetadataRoute} from 'next';
export const dynamic='force-static';
const manifest:MetadataRoute.Manifest={
 id:'/viewport-install/v1',name:'로그 · 화면 테스트',short_name:'화면 테스트',
 description:'기존 아이콘을 유지한 채 설치 설정을 비교하는 화면 테스트',
 start_url:'/viewport-install/app/',scope:'/viewport-install/',display:'standalone',
 background_color:'#FFFFFF',theme_color:'#FFFFFF',
 icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
};
export function GET(){return Response.json(manifest,{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-cache'}});}
