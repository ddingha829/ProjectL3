import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const root = process.cwd(), require = createRequire(import.meta.url), ts = require('typescript');
function loader(overrides = {}) {
  const modules = new Map();
  function load(file) {
    const full = path.isAbsolute(file) ? file : path.join(root, file);
    if (modules.has(full)) return modules.get(full).exports;
    const module = { exports: {} }; modules.set(full, module);
    const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', source)(name => {
      if (name in overrides) return overrides[name];
      if (name === 'server-only') return {};
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(full), name);
        return load(fs.existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, 'index.ts'));
      }
      return require(name);
    }, module, module.exports);
    return module.exports;
  }
  return load;
}

const pass=text=>console.log('PASS '+text), realFetch=globalThis.fetch;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'l2-google-auth-'));process.env.L2_DATA_DIRECTORY=dir;
const load=loader(),{fileStore}=load('src/lib/store/fileStore.ts');
const guest=randomUUID(),googleId=randomUUID(),registered=randomUUID();
const profile=await fileStore.ensureProfile(guest);await fileStore.savePrefs(guest,{authorName:'내 서명',presetSlots:[{...profile.presetSlots[0],name:'나의 스타일'}]});
const sample={...load('src/data/initialData.ts').INITIAL_ARCHIVES[0],id:randomUUID()};await fileStore.saveArchive(guest,sample);
const result=await fileStore.loginWithGoogle({id:googleId,label:'테스트 사용자'},guest);
assert.equal(result.accountId,googleId);assert.equal((await fileStore.listArchives(googleId)).length,1);assert.equal((await fileStore.listArchives(guest)).length,0);assert.equal((await fileStore.getProfile(googleId)).authorName,'내 서명');assert.equal((await fileStore.getProfile(googleId)).presetSlots[0].name,'나의 스타일');assert.ok((await fileStore.getAccountUsername(googleId)).startsWith('Google'));
await fileStore.loginWithGoogle({id:googleId,label:'테스트 사용자'},guest);assert.equal((await fileStore.listArchives(googleId)).length,1);
const second=await fileStore.loginOrRegister('ordinary-user','password',googleId);assert.equal((await fileStore.listArchives(googleId)).length,1);assert.equal((await fileStore.listArchives(second.accountId)).length,0);
await fileStore.loginWithGoogle({id:registered,label:'별도 계정'},second.accountId);assert.equal((await fileStore.listArchives(googleId)).length,1);
pass('guest logs and preset profile migrate once; Google identities stay registered and never merge into another account');
const authLoad=loader({'@/lib/env':{getRuntimeEnvKey:key=>key.includes('URL')?'https://fixture.supabase.co':key.includes('ANON')?'fixture-key':undefined}}),auth=authLoad('src/lib/googleAuth.ts');
const pkce=auth.newPkce();assert.ok(pkce.verifier.length>=43);assert.equal(pkce.challenge,require('crypto').createHash('sha256').update(pkce.verifier).digest('base64url'));assert.notEqual(auth.newPkce().verifier,pkce.verifier);
let exchange;globalThis.fetch=async(url,init)=>{if(url.includes('/token')){exchange=JSON.parse(init.body);return Response.json({access_token:'verified-token'});}assert.equal(init.headers.Authorization,'Bearer verified-token');return Response.json({id:googleId,email:'test@example.invalid',identities:[{provider:'google'}],user_metadata:{full_name:'테스트'}});};
assert.equal((await auth.verifiedGoogleIdentity('one-time-code',pkce.verifier)).id,googleId);assert.deepEqual(exchange,{auth_code:'one-time-code',code_verifier:pkce.verifier});
globalThis.fetch=async(url)=>Response.json(url.includes('/token')?{access_token:'bad-token'}:{id:googleId,identities:[{provider:'email'}]});await assert.rejects(()=>auth.verifiedGoogleIdentity('bad-code',pkce.verifier),/IDENTITY_REJECTED/);
globalThis.fetch=async()=>Response.json({error:'invalid_grant'},{status:400});await assert.rejects(()=>auth.verifiedGoogleIdentity('used-code',pkce.verifier),/CODE_REJECTED/);globalThis.fetch=realFetch;
pass('PKCE uses unique verifier and SHA-256 challenge; exchanges single-use code, verifies user with Auth, rejects wrong provider and invalid code');
let readOwner=guest,identityCalls=0,transfers=0,written=null;const jar=new Map(),cookieApi={get:key=>jar.has(key)?{value:jar.get(key)}:undefined,set:(key,value)=>jar.set(key,value)};
const routeLoad=loader({'next/headers':{cookies:async()=>cookieApi},'@/lib/session':{DEVICE_COOKIE:'device',readDeviceId:async()=>readOwner,writeDeviceId:async id=>{written=id;}},'@/lib/googleAuth':{GOOGLE_FLOW_COOKIE:'flow',verifiedGoogleIdentity:async()=>{identityCalls++;return{id:googleId,label:'테스트'};}},'@/lib/store':{getStore:()=>({loginWithGoogle:async(identity,previous)=>{assert.equal(previous,guest);transfers++;return{accountId:identity.id};}})}}),route=routeLoad('src/app/api/auth/google/callback/route.ts');const {NextRequest}=require('next/server');
for(const flow of [null,{verifier:pkce.verifier,ownerToken:'other',issuedAt:Date.now()},{verifier:pkce.verifier,ownerToken:'signed',issuedAt:Date.now()-601000}]){jar.set('device','signed');if(flow)jar.set('flow',JSON.stringify(flow));else jar.delete('flow');const r=await route.GET(new NextRequest('https://app.invalid/api/auth/google/callback?code=code'));assert.ok(r.headers.get('location').endsWith('?auth=retry'));}assert.equal(identityCalls,0);assert.equal(transfers,0);
jar.set('flow',JSON.stringify({verifier:pkce.verifier,ownerToken:'signed',issuedAt:Date.now()}));const response=await route.GET(new NextRequest('https://app.invalid/api/auth/google/callback?code=code'));assert.ok(response.headers.get('location').endsWith('?auth=connected'));assert.equal(written,googleId);assert.equal(transfers,1);assert.equal(jar.get('flow'),'');
pass('callback refuses missing, expired and changed-owner cookies before exchange; sets signed session only after verified transfer and clears OAuth cookie');
fs.rmSync(dir,{recursive:true,force:true});console.log('Google auth checks complete');
