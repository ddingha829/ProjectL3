import 'server-only';
import {readUsage,reserve,cached,cache} from './integrationStore';
export {settings} from './integrationSettings';
import {settings} from './integrationSettings';
export {reserve,cached,cache};
export {sameOrigin} from './requestOrigin';
export const AI_DAILY_LIMIT=20;
export const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const bytes=(value:string)=>new TextEncoder().encode(value);
const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
async function signature(id:string){const secret=settings().API_COOKIE_SECRET;if(!secret)throw Error('INTEGRATION_SESSION_UNAVAILABLE');const key=await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,bytes(id)));}
export async function browserContext(request:Request){
 const cookie=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith('l2_api_browser='))?.slice('l2_api_browser='.length)||'',match=cookie.match(/^([a-f0-9-]{36})\.([a-f0-9]{64})$/);
 let id=match?.[1],valid=false;if(id&&match){const expected=await signature(id);let difference=0;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^match[2].charCodeAt(i);valid=difference===0;}
 if(!valid)id=crypto.randomUUID();
 return {id:id!,cookie:valid?undefined:`l2_api_browser=${id}.${await signature(id!)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`};
}
export const dayKey=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
export const providerStateKey=async()=>`gemini-state:${await digest(settings().GEMINI_API_KEY||'missing')}`;
export async function limitedBody(request:Request,maxBytes=12000){if(Number(request.headers.get('content-length'))>maxBytes)throw Error('BODY_TOO_LARGE');const reader=request.body?.getReader();if(!reader)return '';const decoder=new TextDecoder();let size=0,text='';while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('BODY_TOO_LARGE');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}
export async function usage(id:string){return Math.min(await readUsage(`ai:${dayKey()}:${id}`),AI_DAILY_LIMIT);}
export function json(value:unknown,status=200,cookie?:string){const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});if(cookie)headers.set('Set-Cookie',cookie);return new Response(JSON.stringify(value),{status,headers});}
