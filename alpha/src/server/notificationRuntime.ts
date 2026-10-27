import 'server-only';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {settings} from './integrationSettings';
import {sameOrigin} from './requestOrigin';
import {json} from './integrationRuntime';

export {json};
let admin:{url:string;key:string;client:SupabaseClient}|undefined;
export function notificationAdmin(){const env=settings();if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('NOTIFICATION_UNAVAILABLE');
 if(!admin||admin.url!==env.SUPABASE_URL||admin.key!==env.SUPABASE_SERVICE_ROLE_KEY)admin={url:env.SUPABASE_URL,key:env.SUPABASE_SERVICE_ROLE_KEY,client:createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})};
 return admin.client;
}
export async function notificationUser(request:Request){
 if(!sameOrigin(request)||request.headers.get('x-l2-request')!=='1')return null;
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1],env=settings();if(!token||token.length>16000||!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)return null;
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const user=await client.auth.getUser(token);return user.error||!user.data.user?null:{id:user.data.user.id,client};
}
export async function notificationHealth(){
 const env=settings(),keys=!!env.WEB_PUSH_PUBLIC_KEY&&!!env.WEB_PUSH_PRIVATE_KEY;
 try{const {data,error}=await notificationAdmin().rpc('l2u_push_health');return {available:!error&&data?.version>=7,publicKey:keys?env.WEB_PUSH_PUBLIC_KEY:null,pushReady:keys&&!error&&data?.webhook===true};}
 catch{return {available:false,publicKey:null,pushReady:false};}
}
