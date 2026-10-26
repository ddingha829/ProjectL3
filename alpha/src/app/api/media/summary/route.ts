import {briefMediaText,plainMediaText} from '@/lib/media';
import {AI_DAILY_LIMIT,browserContext,cache,cached,dayKey,digest,json,limitedBody,providerStateKey,reserve,sameOrigin,settings,usage} from '@/server/integrationRuntime';
import {summarizeWork} from '@/server/workProviders';
export const dynamic='force-dynamic';
const pending=new Map<string,Promise<string|null>>();
export async function POST(request:Request){
 if(!sameOrigin(request)||request.headers.get('x-l2-request')!=='1')return json({error:'이 앱에서 요약을 요청해주세요.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'작품 정보를 확인해주세요.'},415);
 let context:Awaited<ReturnType<typeof browserContext>>|undefined;
 try{const raw=await limitedBody(request);if(raw.length>6000)return json({error:'작품 소개가 너무 길어요.'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'작품 정보를 확인해주세요.'},400);}if(typeof body?.title!=='string'||!body.title.trim()||body.title.length>200||typeof body.overview!=='string'||body.overview.length>3000||!['movie','tv','book'].includes(body.type))return json({error:'작품 정보를 확인해주세요.'},400);
 const overview=plainMediaText(body.overview),fallback=briefMediaText(overview);context=await browserContext(request);const used=await usage(context.id);if(!overview)return json({summary:'',source:'empty',used,limit:AI_DAILY_LIMIT},200,context.cookie);
 const key=`summary:v1:${await digest(JSON.stringify([body.type,body.title,overview]))}`,hit=await cached<string>(key);if(hit)return json({summary:hit,source:'ai-cache',used,limit:AI_DAILY_LIMIT},200,context.cookie);
 if(!settings().GEMINI_API_KEY)return json({summary:fallback,source:'excerpt',reason:'not-configured',used,limit:AI_DAILY_LIMIT},200,context.cookie);
 if(used>=AI_DAILY_LIMIT)return json({summary:fallback,source:'excerpt',reason:'daily-limit',used,limit:AI_DAILY_LIMIT},200,context.cookie);
 if(await cached(await providerStateKey()))return json({summary:fallback,source:'excerpt',reason:'provider-unavailable',used,limit:AI_DAILY_LIMIT},200,context.cookie);
 // Reuse an in-flight generation for the same public synopsis without consuming another call.
 const existing=pending.get(key);if(existing){const summary=await existing;return json({summary:summary||fallback,source:summary?'ai-cache':'excerpt',used,limit:AI_DAILY_LIMIT},200,context.cookie);}
 const reserved=await reserve(`ai:${dayKey()}:${context.id}`,AI_DAILY_LIMIT,3*86400000);if(!reserved)return json({summary:fallback,source:'excerpt',reason:'daily-limit',used:AI_DAILY_LIMIT,limit:AI_DAILY_LIMIT},200,context.cookie);
 const generation=summarizeWork(body.title,body.type,overview).catch(()=>null);pending.set(key,generation);let summary:string|null;try{summary=await generation;if(summary)await cache(key,summary,86400000);}finally{if(pending.get(key)===generation)pending.delete(key);}
 return json({summary:summary||fallback,source:summary?'ai':'excerpt',...(summary?{}:{reason:'provider-unavailable'}),used:reserved,limit:AI_DAILY_LIMIT},200,context.cookie);
 }catch(error){return error instanceof Error&&error.message==='BODY_TOO_LARGE'?json({error:'작품 소개가 너무 길어요.'},413):json({error:'소개 요약을 준비하지 못했어요. 짧은 소개는 그대로 사용할 수 있어요.'},502,context?.cookie);}
}
