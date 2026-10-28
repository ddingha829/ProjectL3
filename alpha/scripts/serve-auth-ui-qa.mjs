// Browser harness for the actual login form. All outcomes are local mocks;
// this cannot create an account, send email, or contact Supabase.
import {build} from 'esbuild';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const source=`import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import Login from './src/unified/PreviewLogin';
function App(){
 const [version,setVersion]=useState(0),[outcome,setOutcome]=useState('success'),[requests,setRequests]=useState(0),[kind,setKind]=useState('none');
 const submit=async(email,password,signup)=>{setRequests(n=>n+1);setKind(signup?'signup':'login');await new Promise(resolve=>setTimeout(resolve,outcome==='slow'?9000:1500));if(outcome==='failure')throw Error('테스트 연결 오류예요. 다시 시도해주세요.');};
 return <><aside className="qa-controls"><label>Response<select aria-label="Response" value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="success">Success</option><option value="failure">Failure</option><option value="slow">Slow</option></select></label><button onClick={()=>{setVersion(n=>n+1);setRequests(0);setKind('none');}}>Reset form</button><output aria-label="Requests">Requests: {requests}; kind: {kind}</output></aside><Login key={version} enabled onEnter={()=>{}} onAuthenticate={submit} onResetPassword={()=>submit('','',false)}/></>;
}createRoot(document.getElementById('root')).render(<App/>);`;
const bundle=await build({stdin:{contents:source,loader:'tsx',resolveDir:process.cwd()},jsx:'automatic',bundle:true,format:'iife',platform:'browser',outdir:'.test-data/auth-ui-qa',write:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'omit-report-dialog',setup(b){b.onResolve({filter:/^\.\/AlphaSupport$/},()=>({path:'report',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export default function Report(){return null}',loader:'js'}));}}]});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')).text,css=bundle.outputFiles.find(file=>file.path.endsWith('.css')).text;
const page=`<!doctype html><html class="light"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Auth UI QA · no real signup</title><style>*{box-sizing:border-box}body{margin:0}button{font:inherit;cursor:pointer}button:not(.un-auth-submit){background:none;border:0}input{display:block}.qa-controls{padding:8px;background:#edf6ed;font:12px sans-serif;display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}.tween-slide-label{height:20px;overflow:hidden}.tween-slide-label>span{display:block}.tween-slide-badge{display:grid;place-items:center;overflow:hidden;border-radius:50%}.tween-slide-badge>svg{grid-area:1/1;width:14px;height:14px}.tween-slide-badge>svg:last-child:not(:first-child){translate:-24px 0}.lab-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}${css}</style><div id="root"></div><script src="/app.js"></script></html>`;
const server=http.createServer(async(req,res)=>{
 if(req.url?.startsWith('/brand/')){try{const asset=path.basename(req.url),content=await fs.readFile(path.join('public/brand',asset));res.setHeader('Content-Type',asset.endsWith('.svg')?'image/svg+xml':'image/png');res.end(content);}catch{res.writeHead(404);res.end();}return;}
 res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/app.js'?js:page);
});
server.listen(3017,'127.0.0.1',()=>console.log('Auth UI QA: http://127.0.0.1:3017 — mocked auth only'));
