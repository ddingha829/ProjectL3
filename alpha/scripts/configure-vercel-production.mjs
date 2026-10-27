// Explicit release helper. Credentials travel through stdin, never CLI arguments.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const root=path.resolve('..'),project=JSON.parse(await fs.readFile(path.join(root,'.vercel/project.json'),'utf8'));
assert.equal(project.projectId,'prj_JKI4aqqavQolp8zXtbijW1gKydaH');
assert.equal(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),'codex/unified-vercel');
const backup=(await fs.readFile('.test-data/release-backup-path.txt','utf8')).trim();
const baseline=JSON.parse(await fs.readFile(path.join(backup,'project-before.json'),'utf8'));
assert.equal(baseline.name,'project-l3');
assert.ok(baseline.targets?.production?.id?.startsWith('dpl_'),'A production rollback deployment is required.');
await fs.access(path.join(backup,'production.env'));
const cli=process.env.VERCEL_CLI_JS;if(!cli)throw Error('Set VERCEL_CLI_JS.');
const scope='ddingha829s-projects';
const names=['TMDB_API_KEY','KAKAO_REST_API_KEY','GEMINI_API_KEY','GEMINI_MODEL','GOOGLE_MAPS_API_KEY','WEATHER_API_KEY','API_COOKIE_SECRET','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','L2_UNIFIED_BACKEND'];
const secrets=new Set(['TMDB_API_KEY','KAKAO_REST_API_KEY','GEMINI_API_KEY','GOOGLE_MAPS_API_KEY','WEATHER_API_KEY','API_COOKIE_SECRET','SUPABASE_SERVICE_ROLE_KEY']);
for(const name of names)assert.ok(process.env[name],'Missing '+name);
const clean=text=>names.reduce((text,key)=>text.replaceAll(process.env[key],'[REDACTED]'),text);
const run=(args,input)=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,[cli,...args],{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',part=>out+=part);child.stderr.on('data',part=>err+=part);child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(Error(clean(err+out).slice(-1200))));child.stdin.end(input);});
const inspected=JSON.parse(await run(['project','inspect',project.projectId,'--json','--scope',scope,'--non-interactive']));
assert.equal(inspected.id,project.projectId);assert.equal(inspected.owner.slug,scope);assert.equal(inspected.rootDirectory,'alpha');
if(!process.argv.includes('--apply-production'))console.log(JSON.stringify({project:inspected.name,environment:'production',rollback:baseline.targets.production.id,keys:names,dryRun:true}));
else{
 for(const key of names){await run(['env','add',key,'--environment','production','--force','--yes','--non-interactive','--scope',scope,secrets.has(key)?'--sensitive':'--no-sensitive'],process.env[key]+'\n');console.log(JSON.stringify({key,environment:'production',applied:true}));}
 await fs.writeFile(path.join(backup,'environment-change.json'),JSON.stringify({projectId:project.projectId,keys:names,rollbackDeployment:baseline.targets.production.id,at:new Date().toISOString(),note:'Sensitive old values cannot be exported; the immutable rollback deployment retains its original runtime environment.'},null,2));
}
