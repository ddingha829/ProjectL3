// Read credentials only from the existing ignored local env. Never log tokens.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
if(process.env.L2_ALLOW_LIVE_QA!=='yes'||!process.env.L2_TEST_ENV_FILE)throw Error('Set L2_ALLOW_LIVE_QA=yes and L2_TEST_ENV_FILE explicitly. This script creates disposable test accounts in that project.');
const raw=await fs.readFile(process.env.L2_TEST_ENV_FILE,'utf8');
const config=Object.fromEntries(raw.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(config.NEXT_PUBLIC_SUPABASE_URL,config.SUPABASE_SERVICE_ROLE_KEY,options);
const users=[],checks=[];
const check=(v,name)=>{if(!v)throw Error(name);checks.push(name);};
async function rpc(client,name,args){const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;}
const apply=(client,ops,id=crypto.randomUUID())=>rpc(client,'l2u_apply',{p_operations:ops,p_operation_id:id});
const snapshot=client=>rpc(client,'l2u_snapshot',{});
const deny=async(fn,name)=>{let failed=false;try{await fn();}catch{failed=true;}check(failed,name);};
const ids={group:crypto.randomUUID(),private:crypto.randomUUID(),shared:crypto.randomUUID(),member:crypto.randomUUID()};
const payload=title=>({title,body:'실제 서버 연결 검증용 기록',image:'',category:'book',createdAt:Date.now(),design:'cover',work:{id:'test:book',kind:'book',title:'연결 검증',image:''}});
await fs.mkdir('.test-data',{recursive:true});
try{
 let prior;
 try{prior=JSON.parse(await fs.readFile('.test-data/cloud-qa-accounts.json','utf8'));}catch{}
 if(prior){
  // Only this script's exact generated IDs are cleaned. Never enumerate or
  // remove real accounts, groups, logs or photos.
  for(const old of prior.users){const verified=await admin.auth.admin.getUserById(old.id);if(verified.error||verified.data.user.user_metadata.test_purpose!=='l2-unified-integration'||!/^l2-integration-\d+-[01]@example\.com$/.test(verified.data.user.email||''))throw Error('Refusing to clean an unverified test account.');}
  const oldPath=prior.users[0].id+'/'+prior.ids.shared+'/test.webp';
  const removedPhoto=await admin.storage.from('l2u-photos').remove([oldPath]);if(removedPhoto.error)throw removedPhoto.error;
  const removedGroup=await admin.from('l2u_groups').delete().in('owner_id',prior.users.map(u=>u.id));if(removedGroup.error)throw removedGroup.error;
  const removedLogs=await admin.from('l2u_logs').delete().in('author_id',prior.users.map(u=>u.id));if(removedLogs.error)throw removedLogs.error;
 }
 for(let i=0;i<2;i++){
  if(prior?.users[i]){const old=prior.users[i],client=createClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_ANON_KEY,options),login=await client.auth.signInWithPassword({email:old.email,password:old.password});if(login.error)throw login.error;users.push({...old,client});check(!!login.data.session,'existing-test-account-login-'+i);continue;}
  const email=`l2-integration-${Date.now()}-${i}@example.com`,password=crypto.randomBytes(22).toString('base64url')+'aA2!',client=createClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
  const signup=await client.auth.signUp({email,password,options:{data:{display_name:'연결 검증 '+i,test_purpose:'l2-unified-integration'}}});
  if(signup.error)throw signup.error;check(!!signup.data.session,'immediate-signup-session-'+i);users.push({id:signup.data.user.id,email,password,client});
  await fs.writeFile('.test-data/cloud-qa-accounts.json',JSON.stringify({ids,users:users.map(({client,...u})=>u)},null,2));
 }
 await fs.writeFile('.test-data/cloud-qa-accounts.json',JSON.stringify({ids,users:users.map(({client,...u})=>u)},null,2));
 const [a,b]=users;
 check((await snapshot(a.client)).logs.length===0,'new-real-account-has-no-demo-logs');
 await apply(a.client,[{kind:'group',id:ids.group,name:'연결 검증 모임',capacity:2,expected:0},{kind:'log',id:ids.private,payload:payload('비공개 테스트'),groups:[],expected:0},{kind:'log',id:ids.shared,payload:payload('공유 테스트'),groups:[ids.group],expected:0}]);
 check((await snapshot(b.client)).logs.length===0,'other-account-cannot-read-private');
 const inviteCode=await rpc(a.client,'l2u_invite_code',{p_group:ids.group});check(/^[A-HJ-NP-Z2-9]{6}$/.test(inviteCode.code),'automatic-six-character-code');
 const token=await rpc(a.client,'l2u_create_invite',{p_group:ids.group});
 const codeJoin=await rpc(b.client,'l2u_join_code',{p_code:inviteCode.code.toLowerCase()});check(codeJoin.groupId===ids.group,'code-join-case-insensitive');
 check((await snapshot(b.client)).logs.length===1,'invited-account-reads-existing-shared-log');
 await deny(()=>apply(b.client,[{kind:'log',id:ids.shared,payload:payload('위조'),groups:[ids.group],expected:1}]),'other-author-update-rejected');
 await apply(b.client,[{kind:'log',id:ids.member,payload:payload('모임원 테스트'),groups:[ids.group],expected:0}]);
 await apply(a.client,[{kind:'place',id:ids.shared,slot:0,groupId:ids.group}]);
 await deny(()=>apply(b.client,[{kind:'place',id:ids.member,slot:0,groupId:ids.group}]),'group-slot-conflict-rejected');
 await apply(b.client,[{kind:'place',id:ids.member,slot:1,groupId:ids.group}]);
 await apply(a.client,[{kind:'log',id:ids.shared,payload:payload('수정 반영 테스트'),groups:[ids.group],expected:1}]);
 check((await snapshot(b.client)).logs.some(l=>l.title==='수정 반영 테스트'),'original-update-shared-live');
 const body=Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA','base64'),path=a.id+'/'+ids.shared+'/test.webp';
 const upload=await a.client.storage.from('l2u-photos').upload(path,body,{contentType:'image/webp',upsert:false,cacheControl:'0'});if(upload.error)throw upload.error;
 const blocked=await b.client.storage.from('l2u-photos').download(path);check(!!blocked.error,'unshared-private-photo-denied');
 const own=await a.client.storage.from('l2u-photos').download(path);check(!own.error,'owner-can-download-photo');
 await apply(a.client,[{kind:'log',id:ids.shared,payload:{...payload('사진 접근 검증'),imagePath:path},groups:[ids.group],expected:2}]);
 const sharedPhoto=await b.client.storage.from('l2u-photos').download(path);check(!sharedPhoto.error,'shared-photo-readable-by-member');
 await apply(a.client,[{kind:'remove_member',groupId:ids.group,userId:b.id,keepShares:true}]);
 check((await snapshot(b.client)).logs.length===1,'removed-member-keeps-only-personal-original');
 await deny(()=>rpc(b.client,'l2u_join',{p_token:token}),'kicked-member-cannot-reuse-old-invite');
 check((await rpc(b.client,'l2u_join_code',{p_code:inviteCode.code})).error==='INVALID_INVITE','kicked-member-cannot-reuse-old-code');
 const session=(await b.client.auth.getSession()).data.session;
 const uncached=await fetch(config.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/authenticated/l2u-photos/'+path+'?verify='+crypto.randomUUID(),{headers:{Authorization:'Bearer '+session.access_token,apikey:config.NEXT_PUBLIC_SUPABASE_ANON_KEY,'Cache-Control':'no-cache'}});
 check(!uncached.ok,'removed-member-fresh-photo-request-denied');
 const signAfterKick=await b.client.storage.from('l2u-photos').createSignedUrl(path,60);check(!!signAfterKick.error,'removed-member-cannot-mint-photo-link');
 check((await snapshot(a.client)).logs.some(l=>l.id===ids.member),'keep-choice-retains-shared-original');
 await fs.writeFile('supabase/live-api-test-result.json',JSON.stringify({status:'passed',checks:checks.length,names:checks,finishedAt:new Date().toISOString()},null,2)+'\n');
 console.log(JSON.stringify({status:'passed',checks:checks.length,names:checks,accountsKeptForBrowserQA:true}));
}catch(error){console.log(JSON.stringify({status:'failed',code:error.code,message:error.message,passed:checks}));process.exitCode=1;}
