import type {MetadataRoute} from 'next';
export const dynamic='force-static';
// Preserve installation identity, scope and display mode when branding changes.
const manifest:MetadataRoute.Manifest={
 id:'/',name:'티끌 ticgle',short_name:'티끌',
 description:'작은 기록을 모아 취향을 채우고, 원하는 모임에 나누세요.',
 start_url:'/',scope:'/',display:'standalone',background_color:'#FFFFFF',theme_color:'#FFFFFF',
 icons:[{src:'/brand/ticgle-icon-192.png',sizes:'192x192',type:'image/png'},{src:'/brand/ticgle-icon-512.png',sizes:'512x512',type:'image/png'},{src:'/brand/ticgle-icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
};
export function GET(){return Response.json(manifest,{headers:{'Content-Type':'application/manifest+json','Cache-Control':'public, max-age=0, must-revalidate'}});}
