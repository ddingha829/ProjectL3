// Local/operator setup only. No values are printed and no existing key is rotated.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import webpush from 'web-push';
import {createClient} from '@supabase/supabase-js';
import {spawn} from 'node:child_process';
const keys=['WEB_PUSH_PUBLIC_KEY','WEB_PUSH_PRIVATE_KEY','WEB_PUSH_DISPATCH_SECRET'];
let contents=await fs.readFile('.env.local','utf8');const env={};for(const line of contents.split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
if(process.argv.includes('--prepare-local')){
 if(Boolean(env.WEB_PUSH_PUBLIC_KEY)!==Boolean(env.WEB_PUSH_PRIVATE_KEY))throw Error('Incomplete existing VAPID pair; do not rotate silently.');
 if(!env.WEB_PUSH_PUBLIC_KEY){const pair=webpush.generateVAPIDKeys();env.WEB_PUSH_PUBLIC_KEY=pair.publicKey;env.WEB_PUSH_PRIVATE_KEY=pair.privateKey;}
 env.WEB_PUSH_DISPATCH_SECRET||=crypto.randomBytes(32).toString('hex');
 webpush.setVapidDetails('https://project-l3-nine.vercel.app',env.WEB_PUSH_PUBLIC_KEY,env.WEB_PUSH_PRIVATE_KEY);
 for(const key of keys)if(!new RegExp('^'+key+'=','m').test(contents))contents+='\n'+key+'='+env[key];
 await fs.writeFile('.env.local',contents.trimEnd()+'\n');console.log(JSON.stringify({phase:'local-prepared',keys,valuesPrinted:false}));
}
if(process.argv.includes('--configure-server')){
 if(keys.some(key=>!env[key]))throw Error('Prepare local keys first.');
 if(new URL(env.SUPABASE_URL).hostname!=='tcsdhfkicbbxizurdfrd.supabase.co')throw Error('Unexpected backend target');
 const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const health=await db.rpc('l2u_push_health');if(health.error||health.data?.version!==7)throw Error('Install notification migration 7 before activation.');
 const result=await db.rpc('l2u_push_configure',{p_url:'https://project-l3-nine.vercel.app/api/notifications/dispatch/',p_secret:env.WEB_PUSH_DISPATCH_SECRET});if(result.error)throw Error('Server notification configuration failed.');
 console.log(JSON.stringify({phase:'database-configured',webhook:(await db.rpc('l2u_push_health')).data?.webhook===true}));
}
if(process.argv.includes('--configure-vercel')){
 if(!process.env.VERCEL_CLI_JS||keys.some(key=>!env[key]))throw Error('Prepare local keys and set VERCEL_CLI_JS.');
 for(const environment of ['preview','production'])for(const key of keys)await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[process.env.VERCEL_CLI_JS,'env','add',key,'--environment',environment,'--force','--yes','--non-interactive','--scope','ddingha829s-projects',key==='WEB_PUSH_PUBLIC_KEY'?'--no-sensitive':'--sensitive'],{cwd:'..',windowsHide:true,stdio:['pipe','pipe','pipe']});child.stdout.resume();child.stderr.resume();child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Vercel notification configuration failed for '+key)));child.stdin.end(env[key]+'\n');});
 console.log(JSON.stringify({phase:'vercel-configured',keys,redeployRequired:true,valuesPrinted:false}));
}
if(!process.argv.some(arg=>arg.startsWith('--')))console.log('Use --prepare-local, then apply SQL migration/runtime setup, --configure-server, --configure-vercel and redeploy.');
