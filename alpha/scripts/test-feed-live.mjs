// Opt-in live QA: generated disposable account/group/logs only; never print credentials.
if(process.env.L2_ALLOW_LIVE_QA!=='yes')throw Error('Set L2_ALLOW_LIVE_QA=yes to create and remove only generated QA data.');
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:"export * from './src/unified/feedRepository';export {fetchCloudState,cloudOperations} from './src/unified/cloudRepository';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {fetchFeedPage,fetchFeedState,fetchCloudState,cloudOperations}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));

import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const raw=await fs.readFile('.env.local','utf8');
const env=Object.fromEntries(raw.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const config=await fetch((process.env.L2_BASE_URL||'https://www.ticgle.kr')+'/api/backend/config').then(r=>r.json());
assert.equal(config.url,env.SUPABASE_URL,'Use the exact current live backend');
const options={auth:{persistSession:false,autoRefreshToken:false}},client=createClient(config.url,config.key,options),admin=createClient(config.url,env.SUPABASE_SERVICE_ROLE_KEY,options);
const email=`ticgle-feed-qa-${crypto.randomUUID()}@example.com`,password=crypto.randomBytes(24).toString('base64url')+'aA1!';
let id;const started=Date.now();
try{
 const result=await client.auth.signUp({email,password,options:{data:{display_name:'가입 검증',test_purpose:'ticgle-feed-paging'}}});
 if(result.error)throw Error('SIGNUP_'+result.error.code);
 id=result.data.user?.id;assert.ok(id);assert.ok(result.data.session,'First request returns a signed-in session');
 const empty=await fetchFeedState(client,id);assert.equal(empty.logs.length,0);assert.ok(empty.people.some(p=>p.id==='me'));
 const groupId=crypto.randomUUID();
 const time=Date.now(),ops=Array.from({length:12},(_,i)=>({kind:'log',id:crypto.randomUUID(),expected:0,groups:i<6?[groupId]:[],payload:{title:'Feed QA '+i,body:i===5?'needle, (quoted)':'QA body',image:i===4?'https://example.com/test.jpg':'',category:i%2?'book':'daily',createdAt:time-Math.floor(i/2)*1000,design:'cover'}}));
 const write=await client.rpc('l2u_apply',{p_operations:[{kind:'group',id:groupId,name:'피드 QA 모임',capacity:8,expected:0},...ops],p_operation_id:crypto.randomUUID()});if(write.error)throw write.error;
 const state=await fetchFeedState(client,id);assert.equal(state.logs.length,4);assert.equal(state.recordsComplete,false);
 const query={scope:'mine',category:'all',query:'',sort:'recent',photosOnly:false,saved:false};
 const a=await fetchFeedPage(client,id,query);
 const inserted=await client.rpc('l2u_apply',{p_operations:[{kind:'log',id:crypto.randomUUID(),expected:0,groups:[],payload:{...ops[0].payload,title:'new during paging',createdAt:time+1000}}],p_operation_id:crypto.randomUUID()});if(inserted.error)throw inserted.error;
 const b=await fetchFeedPage(client,id,query,a.cursor),c=await fetchFeedPage(client,id,query,b.cursor),d=await fetchFeedPage(client,id,query,c.cursor);
 assert.deepEqual([a.logs.length,b.logs.length,c.logs.length,d.logs.length],[4,4,4,0]);assert.equal(new Set([...a.logs,...b.logs,...c.logs].map(l=>l.id)).size,12);assert.equal(d.hasMore,false);
 assert.equal((await fetchFeedPage(client,id,{...query,query:'needle, (quoted)'})).logs.length,1);
 assert.equal((await fetchFeedPage(client,id,{...query,photosOnly:true})).logs.length,1);
 assert.equal((await fetchFeedPage(client,id,{...query,category:'book'})).logs.length,4);
 assert.equal((await fetchFeedPage(client,id,{...query,sort:'old'})).logs[0].createdAt,time-5000);
 assert.equal((await fetchFeedPage(client,id,{...query,saved:true})).logs.length,0);
 const groupPage=await fetchFeedPage(client,id,{...query,scope:groupId});assert.equal(groupPage.logs.length,4);assert.ok(groupPage.logs.every(l=>l.circleIds.includes(groupId)));
 const reaction=await client.rpc('l2u_apply',{p_operations:[{kind:'reaction',id:ops[0].id,type:'bookmark',active:true}],p_operation_id:crypto.randomUUID()});if(reaction.error)throw reaction.error;
 assert.equal((await fetchFeedPage(client,id,{...query,saved:true})).logs.length,1);
 const full=await fetchCloudState(client);assert.equal(full.recordsComplete,true);assert.equal(full.logs.length,13);assert.equal(cloudOperations(state,{...state,people:state.people.map(p=>({...p,name:'QA 변경'}))}).filter(op=>op.kind==='delete_log').length,0);
 const stranger=createClient(config.url,config.key,options);let blocked=false;try{await fetchFeedPage(stranger,id,query);}catch(e){blocked=e.code==='42501';}assert.equal(blocked,true);

 const login=await client.auth.signInWithPassword({email,password});if(login.error)throw Error('LOGIN_'+login.error.code);assert.ok(login.data.session);
 console.log(JSON.stringify({status:'passed',signupRequests:1,signupSession:true,serverPages:[4,4,4,0],noDuplicate:true,filters:true,anonymousPrivateDenied:true,subsequentLogin:true,elapsedMs:Date.now()-started}));
}finally{
 await client.auth.signOut();
 if(id){const verify=await admin.auth.admin.getUserById(id);assert.equal(verify.data.user?.email,email);assert.equal(verify.data.user?.user_metadata.test_purpose,'ticgle-feed-paging');const qaLogs=await admin.from('l2u_logs').select('id').eq('author_id',id);const logIds=(qaLogs.data||[]).map(l=>l.id);if(logIds.length){const cleanup=await admin.from('l2u_logs').delete().in('id',logIds).eq('author_id',id);if(cleanup.error)throw Error('QA_LOG_CLEANUP_FAILED');}
const cleanGroups=await admin.from('l2u_groups').delete().eq('owner_id',id);if(cleanGroups.error)throw Error('QA_GROUP_CLEANUP_FAILED');
const removed=await admin.auth.admin.deleteUser(id);if(removed.error)throw Error('QA_CLEANUP_FAILED');console.log(JSON.stringify({generatedQaAccountRemoved:true}));}
}
