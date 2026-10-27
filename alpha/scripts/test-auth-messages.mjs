import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:"export * from './src/unified/authMessages';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {authMessage,RECOVERY_REDIRECT}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const checks=[];function test(name,run){run();checks.push(name);}
test('duplicate email points to the existing password and recovery',()=>assert.match(authMessage({code:'user_already_exists'}),/기존 비밀번호.*재설정/));
test('older duplicate-email responses are explained',()=>assert.match(authMessage({message:'User already registered'}),/이미 가입/));
test('invalid credentials offer recovery',()=>assert.match(authMessage({code:'invalid_credentials'}),/비밀번호 찾기/));
test('unconfirmed email is separate from bad credentials',()=>assert.match(authMessage({code:'email_not_confirmed'}),/이메일 확인/));
test('mail throttling does not ask for a different password',()=>assert.match(authMessage({code:'over_email_send_rate_limit'}),/조금 뒤/));
test('weak passwords have a specific instruction',()=>assert.match(authMessage({code:'weak_password'}),/6자/));
test('reusing the old password is explained',()=>assert.match(authMessage({code:'same_password'}),/다른 비밀번호/));
test('network trouble does not claim a local record backup',()=>assert.match(authMessage({message:'Failed to fetch'}),/연결이 원활하지/));
test('unknown provider details are not leaked',()=>assert.doesNotMatch(authMessage({message:'INTERNAL_TOKEN=secret'}),/secret|보관/));
test('recovery is pinned to this application over HTTPS',()=>assert.equal(RECOVERY_REDIRECT,'https://project-l3-nine.vercel.app/auth/reset'));
console.log(JSON.stringify({status:'passed',checks}));
