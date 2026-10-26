import {browserContext,dayKey,json,reserve,sameOrigin,settings} from '@/server/integrationRuntime';
import {handleWeather} from '@/server/weatherService';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!sameOrigin(request)||request.headers.get('x-l2-request')!=='1')return json({error:'origin'},403);
 try{const context=await browserContext(request);
 if(!await reserve('weather-minute:'+context.id+':'+Math.floor(Date.now()/60000),12,120000)||!await reserve('weather-day:'+dayKey()+':'+context.id,80,3*86400000))return json({error:'limited'},429,context.cookie);
 const response=await handleWeather(request,settings().WEATHER_API_KEY);if(context.cookie)response.headers.set('Set-Cookie',context.cookie);return response;
 }catch{return json({error:'unavailable'},503);}
}
