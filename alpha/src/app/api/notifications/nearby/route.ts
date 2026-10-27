import {notificationUser,json} from '@/server/notificationRuntime';
import {limitedBody} from '@/server/integrationRuntime';
export async function POST(request:Request){
 try{const user=await notificationUser(request);if(!user)return json({error:'로그인이 필요해요.'},401);
  const body=JSON.parse(await limitedBody(request,1000));
  if(body.action==='complete'){
   if(typeof body.token!=='string'||!/^[a-f0-9-]{36}$/i.test(body.token)||typeof body.delivered!=='boolean')return json({error:'알림 확인 정보가 맞지 않아요.'},400);
   const result=await user.client.rpc('l2u_nearby_complete',{p_token:body.token,p_delivered:body.delivered});if(result.error)throw Error();return json({ok:true});
  }
  if(body.action!=='reserve'||typeof body.logId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.logId))return json({error:'기록을 확인해주세요.'},400);
  const result=await user.client.rpc('l2u_nearby_reserve',{p_log:body.logId});if(result.error)throw Error();return json({notification:result.data});
 }catch{return json({error:'근처 알림을 확인하지 못했어요.'},503);}
}
