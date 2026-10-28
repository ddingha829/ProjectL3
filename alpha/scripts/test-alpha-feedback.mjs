import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const outfile=path.resolve('.test-data/alpha-feedback.mjs');await fs.mkdir('.test-data',{recursive:true});
await build({entryPoints:['src/unified/alphaFeedback.ts'],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {alphaReport,alphaRevision,ALPHA_INVITATION}=await import(pathToFileURL(outfile));
const context={view:'mosaic',mode:'cloud',sync:'idle',revision:'123456789abcdef',environment:{agent:'Test Browser',width:390,height:844,standalone:true,online:true}};
const checks=[];function test(name,run){run();checks.push(name);}
test('report identifies view, build and installed mode',()=>{const text=alphaReport('타일을 옮긴 뒤 저장되지 않아요.',context);assert.ok(text.includes('화면: 끌렉션'));assert.ok(text.includes('alpha-1234567'));assert.ok(text.includes('홈 화면 설치 앱'));assert.ok(text.includes('390 × 844'));assert.ok(text.includes('실제 계정'));});
test('account ids, email, logs and location are never auto attached',()=>{const text=alphaReport('오류 확인',{...context,email:'secret@example.test',token:'AUTH_SECRET',logs:[{body:'PRIVATE_LOG'}],lat:37.777777,href:'https://example.test/?invite=PRIVATE_CODE'});for(const value of ['secret@example.test','AUTH_SECRET','PRIVATE_LOG','37.777777','PRIVATE_CODE'])assert.ok(!text.includes(value));});
test('agent cannot add report headers',()=>{const text=alphaReport('내용',{...context,environment:{...context.environment,agent:'Browser\nInjected header\tvalue'}});assert.ok(text.includes('브라우저: Browser Injected header value'));assert.ok(!text.includes('\nInjected header'));});
test('report body is bounded and retains Korean lines',()=>{assert.ok(alphaReport('  첫째\n둘째  ',context).includes('첫째\n둘째'));assert.ok(!alphaReport('가'.repeat(1500)+'END_SECRET',context).includes('END_SECRET'));});
test('revision accepts only commit ids',()=>{assert.equal(alphaRevision('123456789abcdef'),'1234567');assert.equal(alphaRevision('api_key_please_hide'),'local');assert.equal(alphaRevision(''),'local');});
test('layout report includes only bounded geometry, with no arbitrary metadata',()=>{const text=alphaReport('리모콘 위치',{...context,environment:{...context.environment,layout:{screenHeight:852,layoutHeight:774,visualHeight:774,visualTop:0,frameBottom:852,dockBottom:818.333333,dockInset:34,token:'NEVER_INCLUDE'}}});assert.ok(text.includes('screen=852'));assert.ok(text.includes('dockBottom=818.33'));assert.ok(!text.includes('NEVER_INCLUDE'));});
test('invitation uses live domain and states test data policy',()=>{assert.ok(ALPHA_INVITATION.includes('https://www.ticgle.kr/'));assert.ok(ALPHA_INVITATION.includes('이메일 인증 없는'));assert.ok(ALPHA_INVITATION.includes('백업한 뒤'));assert.ok(ALPHA_INVITATION.includes('문제 알리기'));});
console.log(JSON.stringify({status:'passed',checks}));
