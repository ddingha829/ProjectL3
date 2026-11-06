import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await fs.mkdir('.test-data',{recursive:true});
const output=path.resolve('.test-data/bento-migration.mjs');
await build({stdin:{contents:"export {default as BentoFront} from './src/social/BentoFront';export {default as BentoFeed} from './src/unified/BentoFeed';export {default as EditorialCard,EditorialFace} from './src/social/EditorialCard';export {applyBackPreset,DEFAULT_EDITORIAL,validEditorial} from './src/social/editorialStyle';export {initialUnified,parseUnified} from './src/unified/store';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:output,loader:{'.css':'empty'},external:['react','react-dom','react/jsx-runtime','lucide-react','motion/react'],logLevel:'silent'});
const {BentoFront,BentoFeed,EditorialCard,EditorialFace,applyBackPreset,DEFAULT_EDITORIAL,validEditorial,initialUnified,parseUnified}=await import(pathToFileURL(output));
const base={id:'fixture',authorId:'me',circleId:null,title:'남겨둔 하루',body:'긴 본문도 지워지지 않아요. '.repeat(40),good:'좋았던 점',bad:'아쉬웠던 점',note:'다음에 기억할 점',image:'/images/studio-cafe.png',category:'daily',createdAt:1793770000000,design:'ticket',rating:'4.5',likes:['friend'],bookmarks:['me'],comments:[{id:'c',authorId:'friend',body:'댓글 유지'}],photo:{fit:'contain',x:37,y:42,zoom:1.2,saturation:85,brightness:110,contrast:105}};
const html=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
check('legacy front/ratio choices render the same automatic topic front',()=>{
 for(const front of ['cover','ticket','polaroid'])for(const ratio of ['10:16','1:1','9:16']){
  const markup=html(EditorialCard,{log:{...base,card:{...DEFAULT_EDITORIAL,front,ratio}},author:'나',compactPreview:true});
  assert.match(markup,/data-ec-layout="bento"/);assert.match(markup,/data-topic-ratio="4:5"/);assert.ok(!markup.includes('ec-ticket')&&!markup.includes('ec-polaroid'));
 }
});
check('feed previews keep author, rating, media flag, image settings and native ratios',()=>{
 const markup=html(BentoFront,{log:{...base,video:{path:'fixture.mp4'}},author:'준혁',native:true});
 for(const text of ['준혁','4.5','data-ec-video-poster','남겨둔 하루','object-fit:contain','37% 42%','scale(1.2)','loading="lazy"','aspect-ratio:0.8'])assert.ok(markup.includes(text),text);
 assert.ok(!markup.includes('<video')&&!markup.includes('ec-back-scroll'),'Feed never mounts a video player or hidden review');
});
check('work covers and missing images keep the original work topic',()=>{
 for(const [category,ratio] of [['movie','2:3'],['book','3:4']]){
  const markup=html(BentoFront,{log:{...base,category,image:'',work:{title:'작품 제목',image:'/cover.jpg',creator:'작가'}},author:'친구',native:true});
  assert.ok(markup.includes('src="/cover.jpg"'));assert.ok(markup.includes(`data-topic-ratio="${ratio}"`));assert.ok(markup.includes('작품 제목'));assert.ok(markup.includes('작가'));
 }
});
check('stored addresses remain visible independently of title and custom location names',()=>{
 const address='강원특별자치도 고성군 토성면';
 for(const title of ['설악산 이쁘노',address])for(const locationLabel of ['',title,'직접 적은 장소']){
  const markup=html(BentoFront,{log:{...base,title,locationLabel,place:{id:'place',name:'장소 이름',area:address,lat:38.2,lng:128.5}},author:'나',native:true});
  assert.ok(markup.includes('<p class="ec-bento-meta"><span>고성군 토성면</span></p>'));
 }
 const legacy=html(BentoFront,{log:{...base,title:address,place:{id:'old',name:address,area:'',lat:38.2,lng:128.5}},author:'나'});
 assert.ok(legacy.includes('<p class="ec-bento-meta"><span>'+address+'</span></p>'));
});
check('address titles shorten without changing custom titles or the full address line',()=>{
 for(const [address,title] of [['경기도 안양시 만안구 안양7동 137-32','안양시 안양7동'],['서울특별시 종로구 인의동 48-24','서울시 인의동'],['강원특별자치도 고성군 토성면 모모리 12','고성군 토성면'],['경기도 성남시 분당구 판교로 10','성남시 분당구 판교로']]){
  const place={id:'p',name:address,area:address,lat:37,lng:127};
  const markup=html(BentoFront,{log:{...base,title:address,place},author:'나'});
  assert.ok(markup.includes('<h2>'+title+'</h2>'));assert.ok(markup.includes('<span>'+address+'</span>'));
  const custom=html(BentoFront,{log:{...base,title:'설악산 이쁘노',place},author:'나'});assert.ok(custom.includes('<h2>설악산 이쁘노</h2>'));
 }
});
check('plain text is escaped and gets a full-width note front',()=>{
 const markup=html(BentoFront,{log:{...base,image:'',title:'',body:'<script>danger</script> 기록'},author:'나',native:true});
 assert.ok(markup.includes('data-topic-ratio="2:1"'));assert.ok(markup.includes('&lt;script&gt;'));assert.ok(!markup.includes('<script>'));
});
check('text notes show a distinct trimmed body without repeating a title or body-only note',()=>{
 const note={...base,image:'',title:'  짧은 제목  ',body:'  별개의 본문 <script>내용</script>  '};
 const markup=html(BentoFront,{log:note,author:'나',native:true});
 assert.ok(markup.includes('<p class="ec-bento-excerpt">별개의 본문 &lt;script&gt;내용&lt;/script&gt;</p>'));
 for(const [title,body] of [['반복',' 반복 '],['','본문만'],['제목만','  ']]){
  assert.ok(!html(BentoFront,{log:{...note,title,body},author:'나',native:true}).includes('ec-bento-excerpt'));
 }
 assert.ok(!html(BentoFront,{log:base,author:'친구',native:true}).includes('ec-bento-excerpt'),'Photo cards do not duplicate the body');
});
check('own cards hide a redundant author while keeping the date and optional reactions',()=>{
 const own=html(BentoFront,{log:base,author:'나',native:true,showReactions:true,viewerId:'friend'});
 assert.ok(!own.includes('ec-bento-author-name'));assert.ok(own.includes('<time'));assert.ok(own.includes('좋아요 1개'));assert.ok(own.includes('댓글 1개'));assert.ok(own.includes('data-liked="true"'));
 const quiet=html(BentoFront,{log:{...base,likes:[],comments:[]},author:'실제닉네임',hideAuthor:true,native:true,showReactions:true});
 assert.ok(!quiet.includes('ec-bento-author'));assert.ok(quiet.includes('<time'));
});
check('shared cards keep the author alongside passive counts and distinguish my own like',()=>{
 const friend=html(BentoFront,{log:base,author:'윤슬',native:true,showReactions:true,viewerId:'me'});
 assert.ok(friend.includes('ec-bento-author-name">윤슬'));assert.ok(friend.indexOf('ec-bento-reactions')<friend.indexOf('ec-bento-author-name'));assert.ok(friend.includes('좋아요 1개'));assert.ok(!friend.includes('data-liked="true"'));
 const preview=html(BentoFront,{log:base,author:'윤슬'});assert.ok(!preview.includes('ec-bento-reactions'),'Detail, studio and export fronts do not opt into feed reactions');
});
check('feed forwards personal scope and viewer identity, including liked cards and orphan rows',()=>{
 const props={logs:[{...base,likes:['me']}],people:[{id:'me',name:'실제닉네임'}],viewerId:'me',onOpen:()=>{}};
 const own=html(BentoFeed,{...props,scope:'mine'});assert.ok(!own.includes('ec-bento-author-name'));assert.ok(own.includes('data-liked="true"'));assert.ok(own.includes('class="un-bento-card '));
 const group=html(BentoFeed,{...props,scope:'group'});assert.ok(group.includes('ec-bento-author-name">실제닉네임'));assert.ok(group.includes('좋아요 1개'));
});
check('detail front and back use topic geometry, and every review block survives',()=>{
 const appearance={...DEFAULT_EDITORIAL,front:'polaroid',ratio:'1:1',back:'review'};
 const front=html(EditorialFace,{log:base,author:'나',side:'front',appearance});assert.ok(front.includes('data-card-height="525"'));
 const back=html(EditorialFace,{log:base,author:'나',side:'back',appearance});
 assert.ok(back.includes('--ec-height:525px'));for(const text of [base.body,base.good,base.bad,base.note])assert.ok(back.includes(text));
});
check('back presets preserve archived per-card front and ratio fields',()=>{
 const current={...DEFAULT_EDITORIAL,front:'ticket',ratio:'1:1'},preset={...DEFAULT_EDITORIAL,front:'polaroid',ratio:'10:16',back:'library',bg:'#123456',finish:'acrylic',fontMood:'serif'};
 const applied=applyBackPreset(current,preset);assert.equal(applied.front,'ticket');assert.equal(applied.ratio,'1:1');assert.equal(applied.back,'library');assert.equal(applied.bg,'#123456');assert.ok(validEditorial(applied));assert.equal(current.front,'ticket');
});
check('existing storage round-trips without a destructive migration',()=>{
 const state=initialUnified(),snapshot=JSON.stringify(state),parsed=parseUnified(snapshot);assert.ok(parsed);assert.deepEqual(parsed.logs,state.logs);assert.deepEqual(parsed.presets,state.presets);assert.deepEqual(parsed.mosaic,state.mosaic);assert.equal(JSON.stringify(state),snapshot);
});
console.log(JSON.stringify({passed:checks}));
