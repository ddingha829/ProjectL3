import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/lib/kakaoCardShare';export * from './src/lib/sharedCardImage';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {kakaoUploadedImage,allowedSharedImage,prepareKakaoCard}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
for(const host of ['k.kakaocdn.net','kage.kakao.com','mud-kage.kakao.com'])assert.equal(kakaoUploadedImage(`http://${host}/dn/example.png`),`https://${host}/dn/example.png`);
for(const value of ['http://evil.test/image.png','http://kakaocdn.net.evil.test/image','https://user:pass@k.kakaocdn.net/a','http://accounts.kakao.com/login','ftp://k.kakaocdn.net/x',null])assert.throws(()=>kakaoUploadedImage(value));
assert.equal(allowedSharedImage('http://k.kakaocdn.net/a.png'),null,'public viewer still refuses insecure URLs');
const originals=Object.fromEntries(['window','fetch','DataTransfer','createImageBitmap'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
let uploaded=0,sent,closed=0;
try{
 Object.defineProperty(globalThis,'window',{configurable:true,value:{Kakao:{isInitialized:()=>true,Share:{uploadImage:async({file})=>{assert.equal(file.length,1);uploaded++;return {infos:{original:{url:'http://k.kakaocdn.net/dn/test.png'}}};},sendDefault:payload=>{sent=payload;}}}}});
 globalThis.fetch=async()=>new Response(JSON.stringify({enabled:true,key:'public-test-key'}));
 Object.defineProperty(globalThis,'DataTransfer',{configurable:true,value:class{files=[];items={add:file=>this.files.push(file)};}});
 globalThis.createImageBitmap=async()=>({width:420,height:672,close:()=>closed++});
 const open=await prepareKakaoCard(new File(['image'],'card.png',{type:'image/png'}),'카드 제목');
 assert.equal(uploaded,1);assert.equal(sent,undefined,'preparation cannot send a message');open();
 assert.equal(sent.content.imageUrl,'https://k.kakaocdn.net/dn/test.png');assert.ok(sent.content.link.webUrl.startsWith('https://www.ticgle.kr/share/image/'));assert.equal(sent.content.imageHeight,672);assert.equal(closed,1);
 assert.equal(new URL(sent.content.link.webUrl).searchParams.get('image'),sent.content.imageUrl);
 console.log(JSON.stringify({status:'passed',checks:17,verified:['HTTP Kakao CDN normalization','untrusted hosts rejected','HTTPS-only public viewer','upload-to-template pipeline','explicit share action']}));
}finally{for(const[key,descriptor]of Object.entries(originals))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
