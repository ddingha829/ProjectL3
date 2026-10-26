import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
if(process.env.L2_ALLOW_LIVE_QA!=='yes')throw Error('Set L2_ALLOW_LIVE_QA=yes explicitly. Only temporary quota/cache fixtures are written.');
process.loadEnvFile('.env.local');
const opts={auth:{persistSession:false,autoRefreshToken:false}},url=process.env.SUPABASE_URL;
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,opts),anon=createClient(url,process.env.SUPABASE_PUBLISHABLE_KEY,opts);
const versions=await admin.from('l2u_schema_migrations').select('version').order('version');if(versions.error)throw Error(versions.error.message);
if(process.argv.includes('--schema-only')){console.log(JSON.stringify({versions:versions.data.map(row=>row.version)}));}else{
const checks=[],bucket='qa:vercel:'+crypto.randomUUID();
const call=async(name,args)=>{const r=await admin.rpc(name,args);if(r.error)throw Error(r.error.message);return r.data;};
const reservations=await Promise.all(Array.from({length:30},()=>call('l2u_api_reserve',{p_bucket:bucket,p_limit:20,p_ttl_ms:60000})));
assert.equal(reservations.filter(value=>value!==null).length,20);checks.push('parallel requests stop at 20');
assert.equal(await call('l2u_api_usage',{p_bucket:bucket}),20);checks.push('usage persisted across requests');
await call('l2u_api_cache_put',{p_key:bucket,p_value:[{title:'public fixture'}],p_ttl_ms:60000});
assert.deepEqual(await call('l2u_api_cached',{p_key:bucket}),[{title:'public fixture'}]);checks.push('provider cache JSON roundtrip');
assert.ok((await anon.rpc('l2u_api_usage',{p_bucket:bucket})).error);checks.push('anonymous quota read denied');
assert.ok((await anon.rpc('l2u_api_reserve',{p_bucket:bucket,p_limit:20,p_ttl_ms:60000})).error);checks.push('anonymous quota write denied');
assert.ok((await anon.rpc('l2u_api_cache_put',{p_key:bucket,p_value:{},p_ttl_ms:60000})).error);checks.push('anonymous cache write denied');
await fs.mkdir('work',{recursive:true});const result={status:'passed',checks,fixturesExpireAfterSeconds:60,finishedAt:new Date().toISOString()};
await fs.writeFile('work/vercel-integrations-live.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
