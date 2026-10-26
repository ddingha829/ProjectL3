import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const root=path.resolve('..'),project=JSON.parse(await fs.readFile(path.join(root,'.vercel/project.json'),'utf8'));
assert.equal(project.projectId,'prj_JKI4aqqavQolp8zXtbijW1gKydaH');
const scope='ddingha829s-projects',branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(branch,'codex/unified-vercel');
const cli=process.env.VERCEL_CLI_JS;if(!cli)throw Error('Set VERCEL_CLI_JS to the installed official Vercel CLI entrypoint.');
const names=['TMDB_API_KEY','KAKAO_REST_API_KEY','GEMINI_API_KEY','GEMINI_MODEL','GOOGLE_MAPS_API_KEY','WEATHER_API_KEY','API_COOKIE_SECRET','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','L2_UNIFIED_BACKEND'];
const secretNames=new Set(['TMDB_API_KEY','KAKAO_REST_API_KEY','GEMINI_API_KEY','GOOGLE_MAPS_API_KEY','WEATHER_API_KEY','API_COOKIE_SECRET','SUPABASE_SERVICE_ROLE_KEY']);
const clean=text=>names.reduce((value,name)=>process.env[name]?value.replaceAll(process.env[name],'[REDACTED]'):value,text);
async function run(args,input){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[cli,...args],{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',part=>out+=part);child.stderr.on('data',part=>err+=part);child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(Error(clean(err+out).slice(-1400))));child.stdin.end(input);});}
const inspected=JSON.parse(await run(['project','inspect',project.projectId,'--json','--scope',scope,'--non-interactive']));
assert.equal(inspected.id,project.projectId);assert.equal(inspected.owner.slug,scope);assert.equal(inspected.rootDirectory,'alpha');
for(const name of names){if(!process.env[name])throw Error('Missing local '+name);}
if(process.argv.includes('--dry-run'))console.log(JSON.stringify({verifiedProject:inspected.name,branch,environment:'preview',keys:names}));
else for(const name of names){await run(['env','add',name,'--environment','preview','--git-branch',branch,'--force','--yes','--non-interactive','--scope',scope,secretNames.has(name)?'--sensitive':'--no-sensitive'],process.env[name]+'\n');console.log(JSON.stringify({key:name,environment:'preview',branch,applied:true}));}
