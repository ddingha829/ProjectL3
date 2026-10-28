import assert from 'node:assert/strict';import {build} from 'esbuild';
const compiled=await build({stdin:{contents:"export * from './src/lib/kakaoCardShare';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {prepareKakaoCard,prepareKakaoInvite,TICGLE_URL}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
let init=0,uploads=0,payload;const globals=['window','fetch','DataTransfer','createImageBitmap'],originals=new Map(globals.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
try{
 Object.defineProperty(globalThis,'window',{configurable:true,value:{Kakao:{isInitialized:()=>init>0,init:()=>init++,Share:{uploadImage:async({file})=>{uploads++;assert.equal(file[0].name,'card.png');return {infos:{original:{url:'https://k.kakaocdn.net/generated.png'}}}},sendDefault:value=>{payload=value}}}}});
 Object.defineProperty(globalThis,'fetch',{configurable:true,value:async url=>{assert.equal(url,'/api/share/config/');return {ok:true,json:async()=>({enabled:true,key:'a'.repeat(32)})}}});
 Object.defineProperty(globalThis,'DataTransfer',{configurable:true,value:class{files=[];items={add:file=>this.files.push(file)}}});
 Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>({width:1080,height:1728,close(){}})});
 const file=new File(['mock'],'card.png',{type:'image/png'});const open=await prepareKakaoCard(file,'내 카드');assert.equal(uploads,1);assert.equal(init,1);assert.equal(payload,undefined,'preparation must not send a message');open();assert.equal(payload.content.imageWidth/payload.content.imageHeight,10/16);assert.ok(payload.content.link.webUrl.startsWith(TICGLE_URL+'share/image/?image='));assert.ok(!payload.content.link.webUrl.includes('log='));assert.equal(payload.content.description,'티끌로 남긴 한 장');
 await prepareKakaoCard(file,'두 번째 카드');assert.equal(init,1);await assert.rejects(()=>prepareKakaoCard(new File([new Uint8Array(5*1024*1024+1)],'large.png'),'큰 카드'),/5MB/);
 const uploadCount=uploads;payload=undefined;const invite=await prepareKakaoInvite('영화 친구들','A7K3M9');assert.equal(payload,undefined);assert.equal(uploads,uploadCount);invite();assert.equal(payload.objectType,'text');assert.match(payload.text,/A7K3M9/);assert.equal(payload.link.webUrl,TICGLE_URL);console.log(JSON.stringify({status:'passed',checks:15,noActualUploadOrMessage:true}));
}finally{for(const [key,value]of originals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
