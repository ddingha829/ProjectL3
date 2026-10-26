import {validWeather,type CardWeather} from './weatherValidation';

const messages:Record<string,string>={
 quota:'이번 달 날씨 조회 한도를 다 썼어요. 직접 입력할 수 있어요.',
 limited:'잠시 뒤 다시 가져와주세요.',
 configuration:'날씨 연결을 확인하고 있어요. 우선 직접 입력해주세요.',
};

/** Shared by automatic lookup and the explicit retry control. */
export async function requestWeather(lat:number,lng:number,{signal,fetcher=fetch,timeoutMs=10000}:{signal?:AbortSignal;fetcher?:typeof fetch;timeoutMs?:number}={}):Promise<CardWeather>{
 const controller=new AbortController();
 const cancel=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',cancel,{once:true});
 const timeout=setTimeout(cancel,timeoutMs);
 try{
  const response=await fetcher('/api/weather',{method:'POST',headers:{'Content-Type':'application/json','X-L2-Request':'1'},body:JSON.stringify({lat,lng}),signal:controller.signal});
  const result=await response.json();
  if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
  if(!response.ok||!validWeather(result.weather))throw new Error(messages[result.error]||'날씨를 가져오지 못했어요. 다시 시도하거나 직접 입력해주세요.');
  return result.weather;
 }catch(error){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  if(controller.signal.aborted)throw new Error('연결이 지연되고 있어요. 직접 입력하거나 다시 시도해주세요.');
  throw error;
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}
