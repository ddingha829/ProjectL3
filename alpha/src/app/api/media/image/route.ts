import {bookCover,tmdbPath} from '@/server/workProviders';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,raw=params.get('url')||'',path=tmdbPath(params.get('path')),url=params.get('type')==='tmdb'&&path?`https://image.tmdb.org/t/p/w500${path}`:raw.length<=2000?bookCover(raw):null;
 if(!url)return new Response(null,{status:400});
 try{const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)}),type=response.headers.get('content-type')?.split(';')[0]||'';if(!response.ok||!/^image\/(jpeg|png|webp)$/.test(type)||Number(response.headers.get('content-length'))>3*1024*1024)return new Response(null,{status:502});const reader=response.body?.getReader();if(!reader)return new Response(null,{status:502});const chunks:Uint8Array<ArrayBuffer>[]= [];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>3*1024*1024){await reader.cancel();return new Response(null,{status:413});}chunks.push(new Uint8Array(value));}if(!size)return new Response(null,{status:502});return new Response(new Blob(chunks,{type}),{headers:{'Content-Type':type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});}catch{return new Response(null,{status:502});}
}
