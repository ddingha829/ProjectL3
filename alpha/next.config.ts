import type {NextConfig} from 'next';
import {execFileSync} from 'node:child_process';
let revision=process.env.VERCEL_GIT_COMMIT_SHA||'';
if(!revision)try{revision=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const publicRevision=/^[0-9a-f]{7,40}$/i.test(revision)?revision.slice(0,7):'local';
const config:NextConfig={devIndicators:false,env:{NEXT_PUBLIC_APP_REVISION:publicRevision},images:{unoptimized:true},trailingSlash:true,async headers(){return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-store, max-age=0'},{key:'Service-Worker-Allowed',value:'/'}]}];}};
export default config;
