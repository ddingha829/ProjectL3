import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { NextRequest } from 'next/server.js';
const require=createRequire(import.meta.url),ts=require('typescript'),modules=new Map(),root=process.cwd();
const stub=(name,exports)=>modules.set(path.resolve('src',name),{exports});
const keys={KAKAO_REST_API_KEY:'fixture-kakao',GEMINI_API_KEY:'fixture-gemini'};
stub('lib/env.ts',{getRuntimeEnvKey:key=>keys[key]});
let used=0,generations=0,network=0;
const store={ensureProfile:async()=>({}),getUsage:async()=>used,bumpUsage:async()=>++used};
stub('lib/session.ts',{requireDevice:async()=>({deviceId:'fixture-owner'})});
stub('lib/store/index.ts',{getStore:()=>store,AI_DAILY_LIMIT:20});
function load(file){if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>{if(name==='server-only')return {};if(name.startsWith('@/')||name.startsWith('.')){let next=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(file),name);if(fs.existsSync(next)&&fs.statSync(next).isDirectory())next=path.join(next,'index.ts');else if(!path.extname(next))next+='.ts';return load(next);}return require(name);},m,m.exports);return m.exports;}
const originalFetch=global.fetch;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
global.fetch=async(url,options)=>{
 network++;const target=new URL(url);
 if(target.hostname==='dapi.kakao.com'){assert.equal(target.pathname,'/v3/search/book');assert.equal(options.headers.Authorization,'KakaoAK fixture-kakao');assert.equal(target.searchParams.get('query'),'책 검색');return Response.json({documents:[{title:'<b>읽는</b> 하루',contents:'책을 읽는 이야기입니다. 두 번째 문장입니다. 세 번째는 버립니다.',authors:['작가'],publisher:'출판사',isbn:'1234567890 9781234567890',datetime:'2026-10-01',thumbnail:'https://search1.kakaocdn.net/thumb/test',url:'https://search.daum.net/book/123'}]});}
 if(target.hostname==='generativelanguage.googleapis.com'){generations++;assert.ok(JSON.parse(options.body).contents[0].parts[0].text.includes('최대 두 문장'));return Response.json({candidates:[{content:{parts:[{text:'책과 함께 일상을 바꾸는 이야기다. 작은 발견을 담았다. 세 번째 문장은 제외한다.'}]}}]});}
 if(target.hostname==='search1.kakaocdn.net')return new Response(png,{headers:{'content-type':'image/png'}});
 throw Error('Unexpected test origin: '+target.origin);
};
const request=(route,body)=>new NextRequest('http://localhost'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 const books=load(path.resolve('src/app/api/books/search/route.ts'));
 const result=await books.GET(new NextRequest('http://localhost/api/books/search?q='+encodeURIComponent('책 검색'))),data=await result.json();assert.equal(result.status,200);assert.equal(data.results[0].title,'읽는 하루');assert.equal(data.results[0].authors[0],'작가');assert.match(data.results[0].poster,/^\/api\/media\/image\?/);assert.equal(generations,0,'searching must not generate AI summaries');
 delete keys.KAKAO_REST_API_KEY;assert.equal((await books.GET(new NextRequest('http://localhost/api/books/search?q=book'))).status,503);keys.KAKAO_REST_API_KEY='fixture-kakao';
 const images=load(path.resolve('src/app/api/media/image/route.ts')),before=network;
 for(const url of ['http://127.0.0.1/private','https://search1.kakaocdn.net.attacker.example/image','https://user@search1.kakaocdn.net/image'])assert.equal((await images.GET(new NextRequest('http://localhost/api/media/image?url='+encodeURIComponent(url)))).status,400);
 assert.equal(network,before,'invalid image URLs never fetch');const image=await images.GET(new NextRequest('http://localhost/api/media/image?url='+encodeURIComponent('https://search1.kakaocdn.net/thumb/test')));assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.ok((await image.arrayBuffer()).byteLength>0);
 const summary=load(path.resolve('src/app/api/media/summary/route.ts'));const input={title:'작품',type:'movie',overview:'기존 소개입니다. 너무 길게 이어지는 소개입니다. 셋째 문장입니다.'};
 const first=await(await summary.POST(request('/api/media/summary',input))).json();assert.equal(first.source,'ai');assert.equal(first.summary,'책과 함께 일상을 바꾸는 이야기다. 작은 발견을 담았다.');assert.equal(used,1);assert.equal(generations,1);
 const cached=await(await summary.POST(request('/api/media/summary',input))).json();assert.equal(cached.source,'ai-cache');assert.equal(used,1);assert.equal(generations,1);
 used=20;const fallback=await(await summary.POST(request('/api/media/summary',{...input,title:'다른 작품'}))).json();assert.equal(fallback.source,'excerpt');assert.equal(fallback.summary,'기존 소개입니다. 너무 길게 이어지는 소개입니다.');assert.equal(generations,1);assert.equal(used,20);
 assert.equal((await summary.POST(request('/api/media/summary',{...input,overview:'x'.repeat(3001)}))).status,400);
 const {initialPresetPreferences}=load(path.resolve('src/lib/presetPreferences.ts'));assert.equal(initialPresetPreferences().defaultPresetId,'02');
 const {normalizePresetSlot}=load(path.resolve('src/lib/cardAppearance.ts'));const {PRESET_SLOTS}=load(path.resolve('src/data/initialData.ts'));const tone=normalizePresetSlot({...PRESET_SLOTS[1],photoSaturation:500,photoLightness:-999,photoBrightness:NaN});assert.deepEqual([tone.photoSaturation,tone.photoLightness,tone.photoBrightness],[200,-50,100]);
 const {callGemini}=load(path.resolve('src/lib/gemini.ts'));let billingRequests=0;global.fetch=async()=>{billingRequests++;return new Response('',{status:402});};assert.equal(await callGemini({contents:[{parts:[{text:'fixture'}]}]}),null);assert.equal(billingRequests,1,'prepayment exhaustion must not retry every model');
 console.log('PASS Kakao request/response, missing-key status, cover proxy allowlist, AI selection-only/caching/quota/2-sentence fallback, INSTA fresh default and tone normalization. All external calls mocked.');
}finally{global.fetch=originalFetch;}
