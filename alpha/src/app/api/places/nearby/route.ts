import {browserContext,dayKey,json,reserve,sameOrigin,settings} from '@/server/integrationRuntime';
import {nearbyPlaces,reverseAddress,validPoint} from '@/server/placeProviders';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!sameOrigin(request)||request.headers.get('x-l2-request')!=='1')return json({error:'이 앱에서 위치를 확인해주세요.'},403);
 const params=new URL(request.url).searchParams,lat=Number(params.get('lat')),lng=Number(params.get('lng')),mode=params.get('mode')||'nearby',q=params.get('q')?.trim()||'';
 if(!params.get('lat')?.trim()||!params.get('lng')?.trim()||!validPoint(lat,lng)||!['address','nearby'].includes(mode)||q.length>100)return json({error:'위치와 검색어를 확인해주세요.'},400);
 if(!settings().GOOGLE_MAPS_API_KEY)return json({error:'장소 검색 연결을 준비 중이에요.'},503);
 let cookie:string|undefined;
 try{const context=await browserContext(request);cookie=context.cookie;
 if(!await reserve(`places-minute:${context.id}:${Math.floor(Date.now()/60000)}`,12,120000)||!await reserve(`places-day:${dayKey()}:${context.id}`,80,3*86400000))return json({error:'장소 확인 요청이 많아요. 잠시 후 다시 시도해주세요.'},429,cookie);
 if(mode==='address')return json({address:await reverseAddress(lat,lng)},200,cookie);
 return json({places:await nearbyPlaces(lat,lng,q)},200,cookie);
 }catch{return json({error:'장소를 불러오지 못했어요. 다시 시도하거나 위치 없이 등록할 수 있어요.'},502,cookie);}
}
