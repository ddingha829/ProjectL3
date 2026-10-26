// Server entry points only. Never import this module from a client component.
import {validWeather,type CardWeather} from '../social/weatherValidation';
import {sameOrigin} from './requestOrigin';
const TTL=10*60_000;
const cache=new Map<string,{until:number;weather:CardWeather}>();
const pending=new Map<string,Promise<CardWeather>>();
const attempts=new Map<string,{until:number;count:number}>();
const snow=new Set([1066,1069,1114,1117,1204,1207,1210,1213,1216,1219,1222,1225,1237,1249,1252,1255,1258,1261,1264,1279,1282]);
const rain=new Set([1063,1072,1087,1150,1153,1168,1171,1198,1201,1180,1183,1186,1189,1192,1195,1240,1243,1246,1273,1276]);
export function weatherCondition(code:number,isDay:number):CardWeather['condition']{return snow.has(code)?'snow':rain.has(code)?'rain':code===1000?(isDay===0?'night':'sun'):'cloud';}
function reply(status:number,body:unknown){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
class WeatherFailure extends Error {constructor(public code:string,public status=503){super(code);}}
export async function handleWeather(request:Request,key?:string,fetcher:typeof fetch=fetch,now=Date.now()):Promise<Response>{
 if(request.method!=='POST')return reply(405,{error:'method'});
 if(!sameOrigin(request))return reply(403,{error:'origin'});
 if(!key)return reply(503,{error:'unavailable'});
 if(Number(request.headers.get('content-length'))>512)return reply(413,{error:'input'});
 let input;try{const text=await request.text();if(text.length>512)return reply(413,{error:'input'});input=JSON.parse(text);}catch{return reply(400,{error:'input'});}
 const {lat,lng}=input||{};
 if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return reply(400,{error:'input'});
 const cell=`${lat.toFixed(2)},${lng.toFixed(2)}`;
 const cached=cache.get(cell);if(cached&&cached.until>now)return reply(200,{weather:cached.weather});
 const actor=request.headers.get('oai-authenticated-user-id')||request.headers.get('cf-connecting-ip')||'private-preview';
 for(const [id,a] of attempts)if(a.until<=now)attempts.delete(id);
 if(!attempts.has(actor)&&attempts.size>=1000)return reply(429,{error:'limited'});
 const a=attempts.get(actor)||{until:now+60_000,count:0};a.count++;attempts.set(actor,a);
 if(a.count>12)return reply(429,{error:'limited'});
 try{
  let task=pending.get(cell);
  if(!task){
   if(pending.size>=20)return reply(429,{error:'limited'});
   task=(async()=>{
    const upstream=new URL('https://api.weatherapi.com/v1/current.json');
    upstream.search=new URLSearchParams({key,q:cell,aqi:'no'}).toString();
    const response=await fetcher(upstream,{signal:AbortSignal.timeout(7000)});
    const data=await response.json() as {error?:{code:number};current?:{temp_c:number;is_day:number;condition:{code:number};last_updated_epoch:number}};
    if(!response.ok||data.error){const code=data.error?.code;throw new WeatherFailure(code===2007?'quota':code===2006||code===2008?'configuration':'unavailable');}
    const c=data.current;
    if(!c||!Number.isFinite(c.condition?.code)||!Number.isFinite(c.last_updated_epoch)||c.last_updated_epoch*1000>now||now-c.last_updated_epoch*1000>3*60*60_000)throw new WeatherFailure('unavailable');
    const weather:CardWeather={condition:weatherCondition(c.condition.code,c.is_day),temperature:c.temp_c,observation:{source:'weatherapi',observedAt:c.last_updated_epoch*1000,fetchedAt:now,lat:Number(lat.toFixed(2)),lng:Number(lng.toFixed(2))}};
    if(!validWeather(weather))throw new WeatherFailure('unavailable');
    for(const [id,v] of cache)if(v.until<=now)cache.delete(id);
    if(cache.size>=200)cache.delete(cache.keys().next().value!);
    cache.set(cell,{until:now+TTL,weather});return weather;
   })();pending.set(cell,task);task.finally(()=>pending.delete(cell)).catch(()=>{});
  }
  return reply(200,{weather:await task});
 }catch(e){return reply(e instanceof WeatherFailure?e.status:503,{error:e instanceof WeatherFailure?e.code:'unavailable'});}
}
