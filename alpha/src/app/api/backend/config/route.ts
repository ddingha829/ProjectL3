import {settings,json} from '@/server/integrationRuntime';
export const dynamic='force-dynamic';
export async function GET(){
 const env=settings(),url=env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY;
 // Only a publishable/anon key may cross this boundary. Never fall back to a
 // service-role key, even if an operator accidentally configures one here.
 let publicKey=Boolean(key?.startsWith('sb_publishable_'));
 if(key?.startsWith('eyJ'))try{publicKey=JSON.parse(atob(key.split('.')[1])).role==='anon';}catch{}
 if(env.L2_UNIFIED_BACKEND!=='enabled'||!url||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)||!key||!publicKey)return json({enabled:false});
 return json({enabled:true,url,key});
}
