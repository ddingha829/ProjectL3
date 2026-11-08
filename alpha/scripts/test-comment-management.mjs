import assert from 'node:assert/strict';import{build}from'esbuild';import fs from'node:fs/promises';import path from'node:path';import{pathToFileURL}from'node:url';
const bundle=await build({entryPoints:['src/server/commentManagement.ts'],bundle:true,platform:'node',format:'esm',write:false});const file=path.resolve('.test-data/comment-manage-test.mjs');await fs.writeFile(file,bundle.outputFiles[0].text);const{handleCommentManagement:handle}=await import(pathToFileURL(file));
const id='11111111-1111-4111-8111-111111111111',logId='22222222-2222-4222-8222-222222222222',owner='33333333-3333-4333-8333-333333333333',row={id,log_id:logId,author_id:owner,body:'원래 댓글'};let writes=[];
const runtime=(extra={})=>({user:async()=>({id:owner}),read:async()=>row,write:async(...args)=>{writes.push(args);return true},...extra});
const req=(body={})=>new Request('https://www.ticgle.kr/api/comments/manage/',{method:'POST',body:JSON.stringify({action:'edit',id,logId,expected:row.body,body:'수정한 댓글',...body})});
assert.equal((await handle(req(),runtime())).status,200);assert.deepEqual(writes.pop(),[id,logId,owner,row.body,'수정한 댓글']);
assert.equal((await handle(req({action:'delete',body:undefined}),runtime())).status,200);assert.deepEqual(writes.pop(),[id,logId,owner,row.body,null]);
for(const extra of [{user:async()=>null},{read:async()=>null},{read:async()=>({...row,author_id:'someone-else'})}]){const result=await handle(req(),runtime(extra));assert.ok([401,403].includes(result.status));assert.equal(writes.length,0)}
assert.equal((await handle(req({expected:'stale'}),runtime())).status,409);assert.equal(writes.length,0);assert.equal((await handle(req(),runtime({write:async()=>false}))).status,409);
for(const body of [{id:'bad'},{logId:'bad'},{action:'other'},{body:''},{body:' '},{body:'a'.repeat(201)},{expected:null}])assert.equal((await handle(req(body),runtime())).status,400);
const error=await handle(req(),runtime({write:async()=>{throw Error('secret')}}));assert.equal(error.status,503);assert.ok(!(await error.text()).includes('secret'));
assert.equal((await handle(new Request('https://www.ticgle.kr',{method:'POST',body:'x'.repeat(4001)}),runtime())).status,413);
console.log('PASS comment edits/deletes: ownership, missing scope, validation, stale text, atomic write conflict, bounded body and safe errors');
