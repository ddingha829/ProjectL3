import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

// Run real Supabase client initialization without credentials or any network I/O.
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/cloud-configuration.mjs');
await build({stdin:{contents:"export {configureCloud} from './src/unified/cloudRepository';",resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,platform:'node',format:'esm',external:['@supabase/supabase-js'],logLevel:'silent'});
const {configureCloud}=await import(pathToFileURL(outfile));
const originalFetch=globalThis.fetch,originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
const values=new Map(),clients=new Set();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}});
let config={enabled:true,url:'https://offline-test.supabase.co',key:'sb_publishable_offline_test'};
globalThis.fetch=async url=>{assert.equal(url,'/api/backend/config','unexpected external network request');return new Response(JSON.stringify(config),{status:200,headers:{'Content-Type':'application/json'}});};
try{
 const [first,second]=await Promise.all([configureCloud(),configureCloud()]);clients.add(first);clients.add(second);
 assert.strictEqual(first,second,'parallel StrictMode initialization must share one auth client');
 assert.strictEqual(await configureCloud(),first,'repeat initialization preserves the session client');
 values.set('l2_unified_preview_session_v1','old demo login');
 config={...config,generation:'fresh-alpha-1'};
 const fresh=await configureCloud();clients.add(fresh);
 assert.notStrictEqual(fresh,first,'a backend reset must use a fresh auth session');
 assert.equal(values.has('l2_unified_preview_session_v1'),false,'the old demo login cannot mask the fresh login screen');
 assert.strictEqual(await configureCloud(),fresh,'reset generation is stable across repeat mounts');
 config={...config,enabled:false};
 assert.equal(await configureCloud(),null,'disabled backend does not supply a stale client');
 console.log('Cloud configuration lifecycle: parallel/repeated mounts, reset isolation and disabled backend passed.');
}finally{for(const client of clients)client?.auth.stopAutoRefresh();globalThis.fetch=originalFetch;if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else delete globalThis.localStorage;}
