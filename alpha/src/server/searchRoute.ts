import 'server-only';
import {browserContext,cache,cached,digest,json,reserve,sameOrigin,settings} from './integrationRuntime';
import {searchBooks,searchMovies} from './workProviders';
import type {MediaResult} from '@/lib/media';
export async function searchRoute(request:Request,kind:'movie'|'book'){
 if(!sameOrigin(request))return json({error:'이 앱에서 검색해주세요.'},403);
 const q=new URL(request.url).searchParams.get('q')?.trim()||'';if(q.length<(kind==='movie'?2:1)||q.length>120)return json({results:[]});
 if(!(kind==='book'?settings().KAKAO_REST_API_KEY:settings().TMDB_API_KEY))return json({error:'검색 연결을 준비 중이에요.'},503);
 try{const context=await browserContext(request),key=`search:${kind}:${await digest(q.toLocaleLowerCase())}`,hit=await cached<MediaResult[]>(key);if(hit)return json({results:hit},200,context.cookie);
 const allowed=await reserve(`search:${context.id}:${Math.floor(Date.now()/60000)}`,30,120000);if(!allowed)return json({error:'검색이 잠시 많아요. 1분 뒤 다시 검색해주세요.'},429,context.cookie);
 const results=await(kind==='book'?searchBooks(q):searchMovies(q));await cache(key,results);return json({results},200,context.cookie);
 }catch{return json({error:'검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'},502);}
}
