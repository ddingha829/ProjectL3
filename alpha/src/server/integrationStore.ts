import 'server-only';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {settings} from './integrationSettings';

let connection:{url:string;key:string;client:SupabaseClient}|undefined;
function database(){
 const env=settings(),url=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('INTEGRATION_STORAGE_UNAVAILABLE');
 if(!connection||connection.url!==url||connection.key!==key)connection={url,key,client:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})};
 return connection.client;
}
async function call(name:string,args:Record<string,unknown>){const {data,error}=await database().rpc(name,args);if(error)throw Error('INTEGRATION_STORAGE_UNAVAILABLE');return data;}
export async function readUsage(bucket:string):Promise<number>{return Number(await call('l2u_api_usage',{p_bucket:bucket}))||0;}
export async function reserve(bucket:string,limit:number,ttl:number):Promise<number|null>{const result=await call('l2u_api_reserve',{p_bucket:bucket,p_limit:limit,p_ttl_ms:ttl});return result===null?null:Number(result);}
export async function cached<T>(key:string):Promise<T|null>{return await call('l2u_api_cached',{p_key:key}) as T|null;}
export async function cache(key:string,value:unknown,ttl=3600000):Promise<void>{await call('l2u_api_cache_put',{p_key:key,p_value:value,p_ttl_ms:ttl});}
