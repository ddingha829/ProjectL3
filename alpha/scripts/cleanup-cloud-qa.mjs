import fs from 'node:fs/promises';import {createClient} from '@supabase/supabase-js';
if(process.env.L2_ALLOW_LIVE_QA!=='yes'||!process.env.L2_TEST_ENV_FILE)throw Error('Explicit disposable-test cleanup opt-in required.');
const raw=await fs.readFile(process.env.L2_TEST_ENV_FILE,'utf8'),env=Object.fromEntries(raw.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const run=JSON.parse(await fs.readFile('.test-data/cloud-qa-accounts.json','utf8')),admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),ids=run.users.map(u=>u.id);
for(const u of run.users){const r=await admin.auth.admin.getUserById(u.id);if(r.error||r.data.user.user_metadata.test_purpose!=='l2-unified-integration'||!/^l2-integration-\d+-[01]@example\.com$/.test(r.data.user.email||''))throw Error('Refusing cleanup: generated-account identity could not be verified.');}
let removedFiles=0;
async function objects(prefix){const r=await admin.storage.from('l2u-photos').list(prefix,{limit:1000});if(r.error)throw r.error;let paths=[];for(const o of r.data){const key=prefix+'/'+o.name;if(o.id)paths.push(key);else paths.push(...await objects(key));}return paths;}
for(const id of ids){const files=await objects(id);if(files.some(f=>!f.startsWith(id+'/')))throw Error('Outside generated user folder.');if(files.length){const r=await admin.storage.from('l2u-photos').remove(files);if(r.error)throw r.error;removedFiles+=files.length;}}
for(const [table,column]of [['l2u_groups','owner_id'],['l2u_logs','author_id']]){const r=await admin.from(table).delete().in(column,ids);if(r.error)throw r.error;}
// Compatibility with QA runs made before the unified backend reset: Ticgle's
// old signup trigger created profiles with a non-cascading auth foreign key.
const legacyProfiles=await admin.from('profiles').delete({count:'exact'}).in('id',ids);
// The fresh unified backend no longer contains Ticgle's profiles table.
if(legacyProfiles.error&&!['PGRST205','42P01'].includes(legacyProfiles.error.code))throw legacyProfiles.error;
for(const id of ids){const r=await admin.auth.admin.deleteUser(id);if(r.error)throw r.error;}
// Remove this workflow's plaintext disposable credentials, never real env files.
await fs.unlink('.test-data/cloud-qa-accounts.json');
const summary={status:'passed',generatedAccountsRemoved:ids.length,generatedPhotosRemovedThisRun:removedFiles,generatedLegacyProfilesRemoved:legacyProfiles.count||0,finishedAt:new Date().toISOString()};
await fs.writeFile('supabase/qa-cleanup-result.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
