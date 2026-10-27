import {notificationUser,notificationHealth,json} from '@/server/notificationRuntime';
import {limitedBody} from '@/server/integrationRuntime';
import {validPushSubscription} from '@/unified/notificationRules';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const user=await notificationUser(request);if(!user)return json({error:'로그인한 뒤 알림을 설정해주세요.'},401);
  const health=await notificationHealth();if(!health.available)return json({...health,preferences:null});
  const result=await user.client.rpc('l2u_notification_status');if(result.error)throw Error();
  return json({...health,preferences:result.data});
 }catch{return json({error:'알림 설정을 불러오지 못했어요.'},503);}
}
export async function POST(request:Request){
 try{const user=await notificationUser(request);if(!user)return json({error:'로그인한 뒤 알림을 설정해주세요.'},401);
  const body=JSON.parse(await limitedBody(request,8000));
  if(body.action==='unsubscribe'){
   if(typeof body.endpoint!=='string'||body.endpoint.length>4096)return json({error:'알림 기기를 확인해주세요.'},400);
   const result=await user.client.rpc('l2u_push_unsubscribe',{p_endpoint:body.endpoint});if(result.error)throw Error();return json({ok:true});
  }
  if(body.action!=='save'||typeof body.newLogs!=='boolean'||typeof body.nearby!=='boolean')return json({error:'알림 설정을 확인해주세요.'},400);
  const health=await notificationHealth();if(!health.available||body.newLogs&&!health.pushReady)return json({error:'알림 서버 연결을 준비 중이에요.'},503);
  if(body.subscription){if(!validPushSubscription(body.subscription))return json({error:'이 기기의 알림 연결을 다시 허용해주세요.'},400);
   const result=await user.client.rpc('l2u_push_subscribe',{p_subscription:body.subscription});if(result.error)throw Error();
  }
  const saved=await user.client.rpc('l2u_notification_preferences',{p_new_logs:body.newLogs,p_nearby:body.nearby});if(saved.error)throw Error();
  const result=await user.client.rpc('l2u_notification_status');if(result.error)throw Error();return json({preferences:result.data});
 }catch{return json({error:'알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.'},503);}
}
