import type {MetadataRoute} from 'next';
export const dynamic='force-static';
// Same URL, identity and content as the original file-based manifest. An explicit
// route lets the isolated install-check layout select its own manifest.
const manifest:MetadataRoute.Manifest={
 id:'/',name:'L2 - 일상 로그하기',short_name:'L2.',
 description:'일상을 카드로 기록하고 원하는 모임에 나누세요.',
 start_url:'/',scope:'/',display:'standalone',background_color:'#FFFFFF',theme_color:'#FFFFFF',
 icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
};
export function GET(){return Response.json(manifest,{headers:{'Content-Type':'application/manifest+json','Cache-Control':'public, max-age=0, must-revalidate'}});}
