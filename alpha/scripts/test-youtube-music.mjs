import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:"export * from './src/lib/youtubeMusic';export * from './src/server/youtubeMusic';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false});
const {youtubeVideoId,youtubeThumbnail,youtubeSearchResults,lookupYouTubeMusic,searchYouTubeMusic,handleYouTubeMusic,youtubeQuotaDay,createYouTubeMusicCache}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const id='gdZLi9oWNZg',canonical=`https://www.youtube.com/watch?v=${id}`;
const item={videoId:id,title:'Dynamite',channelTitle:'HYBE LABELS',thumbnailUrl:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,thumbnailWidth:480,thumbnailHeight:360,url:canonical};
const metadata={title:item.title,author_name:item.channelTitle,thumbnail_url:item.thumbnailUrl,html:'<script>never render me</script>'};
const request=(query,headers={})=>new Request(`https://www.ticgle.kr/api/music/search/?${query}`,{headers});
const linkQuery=new URLSearchParams({url:`https://music.youtube.com/watch?v=${id}&si=tracking`});
const sha=value=>Promise.resolve(createHash('sha256').update(value).digest('hex'));
const runtime=(overrides={})=>({key:'fixture-secret',now:()=>Date.parse('2026-11-04T01:00:00Z'),digest:sha,browserContext:async()=>({id:'browser',cookie:'fixture-cookie'}),cached:async()=>null,cache:async()=>{},reserve:async()=>1,fetcher:async()=>Response.json(metadata),...overrides});
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}

await test('YouTube, Music, short, mobile, shorts and live links canonicalize',()=>{
 for(const url of [canonical,`https://music.youtube.com/watch?v=${id}&list=RDAMVM${id}`,`https://youtu.be/${id}?si=tracking&t=10`,`https://m.youtube.com/watch?v=${id}`,`https://www.youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`,`https://www.youtube.com/embed/${id}`])assert.equal(youtubeVideoId(url),id);
});
await test('host spoofing, credentials, non-HTTPS, playlists and malformed IDs rejected',()=>{
 for(const url of [`http://youtu.be/${id}`,`https://youtube.com.evil.test/watch?v=${id}`,`https://www.youtube.com@evil.test/watch?v=${id}`,`https://user@www.youtube.com/watch?v=${id}`,`https://www.youtube.com:444/watch?v=${id}`,`https://www.youtube.com/playlist?list=anything`,`https://youtu.be/${id}/extra`,'https://www.youtube.com/watch?v=abc','https://www.youtube.com/watch?v=../secret','javascript:alert(1)','https://127.0.0.1/watch?v='+id,'x'.repeat(2049)])assert.equal(youtubeVideoId(url),null,url);
});
await test('thumbnail URLs cannot point to third-party tracking hosts or another video',()=>{
 for(const url of ['http://i.ytimg.com/vi/'+id+'/hqdefault.jpg','https://evil.test/a.jpg','https://i.ytimg.com/vi/other/hqdefault.jpg','https://u@i.ytimg.com/vi/'+id+'/hqdefault.jpg'])assert.equal(youtubeThumbnail(url,id),item.thumbnailUrl);
});
await test('provider search maps videos, decodes text and drops invalid/duplicate items',()=>{
 const raw={id:{videoId:id},snippet:{title:'A &amp; B &#39;live&#39;',channelTitle:'Artist',thumbnails:{high:{url:item.thumbnailUrl}}}};
 const data=youtubeSearchResults({items:[raw,raw,{id:{channelId:'bad'},snippet:raw.snippet},{id:{videoId:'abcdefghijk'},snippet:{title:'No channel'}}]});
 assert.equal(data.length,1);assert.equal(data[0].title,"A & B 'live'");assert.equal(data[0].url,canonical);
 assert.deepEqual(youtubeSearchResults(null),[]);
});
await test('oEmbed uses only a canonical trusted URL; returned HTML is discarded',async()=>{
 const found=await lookupYouTubeMusic(id,async(url,init)=>{assert.equal(url.origin,'https://www.youtube.com');assert.equal(url.pathname,'/oembed');assert.equal(url.searchParams.get('url'),canonical);assert.equal(init.redirect,'error');assert.ok(init.signal);return Response.json(metadata);});
 assert.deepEqual(found,[item]);
});
await test('invalid video IDs never fetch',async()=>{await assert.rejects(lookupYouTubeMusic('../private',async()=>{throw Error('must not fetch');}),/링크/);});
await test('missing, private or deleted videos explain failure',async()=>{
 await assert.rejects(lookupYouTubeMusic(id,async()=>Response.json({}, {status:404})),/공개/);
 await assert.rejects(lookupYouTubeMusic(id,async()=>Response.json({html:'<script>oops</script>'})),/정보/);
});
await test('official search restricts results to music videos and six entries',async()=>{
 await searchYouTubeMusic('아이유 밤편지','fixture-key',async(url)=>{assert.equal(url.origin,'https://www.googleapis.com');assert.equal(url.searchParams.get('type'),'video');assert.equal(url.searchParams.get('videoCategoryId'),'10');assert.equal(url.searchParams.get('maxResults'),'6');assert.equal(url.searchParams.get('q'),'아이유 밤편지');assert.equal(url.searchParams.get('key'),'fixture-key');return Response.json({items:[]});});
});
await test('search configuration errors and upstream quota exhaustion have different guidance',async()=>{
 await assert.rejects(searchYouTubeMusic('아이유','bad-key',async()=>Response.json({error:{errors:[{reason:'ipRefererBlocked'}]}},{status:403})),/연결/);
 await assert.rejects(searchYouTubeMusic('아이유','key',async()=>Response.json({error:{errors:[{reason:'quotaExceeded'}]}},{status:403})),/한도/);
});
await test('status reveals only capability booleans without cookies or DB writes',async()=>{
 const response=await handleYouTubeMusic(request('status=1'),runtime({browserContext:async()=>{throw Error('must not run');}}));
 assert.deepEqual(await response.json(),{searchAvailable:true,linkAvailable:true});assert.equal(response.headers.get('set-cookie'),null);
});
await test('cross-site requests rejected before any integration call',async()=>{
 for(const headers of [{origin:'https://evil.test'},{'sec-fetch-site':'cross-site'}])assert.equal((await handleYouTubeMusic(request(linkQuery,headers),runtime())).status,403);
});
await test('invalid inputs never fetch or allocate quota',async()=>{
 for(const query of ['','q=a',new URLSearchParams({q:'a'.repeat(101)}),'url=https://evil.test/a','q=hello&url='+encodeURIComponent(canonical)]){
  assert.equal((await handleYouTubeMusic(request(query),runtime({reserve:async()=>{throw Error('must not run');},fetcher:async()=>{throw Error('must not fetch');}}))).status,400);
 }
});
await test('title search unavailable without key, but valid links work',async()=>{
 assert.equal((await handleYouTubeMusic(request('q=아이유'),runtime({key:undefined}))).status,503);
 const response=await handleYouTubeMusic(request(linkQuery),runtime({key:undefined}));assert.equal(response.status,200);assert.deepEqual((await response.json()).results,[item]);
});
await test('cache hit makes no provider or quota call, including empty results',async()=>{
 for(const hit of [[item],[]]){
  const response=await handleYouTubeMusic(request(linkQuery),runtime({cached:async()=>hit,reserve:async()=>{throw Error('quota must not run');},fetcher:async()=>{throw Error('must not fetch');}}));
  assert.equal(response.status,200);assert.deepEqual((await response.json()).results,hit);
 }
});
await test('ephemeral metadata cache has an entry bound and rejects expired data',async()=>{
 let now=0;const cache=createYouTubeMusicCache(2,()=>now);
 await cache.cache('a',[item],86400000);await cache.cache('b',[],86400000);assert.deepEqual(await cache.cached('a'),[item]);
 await cache.cache('c',[item],86400000);assert.equal(await cache.cached('a'),null);assert.deepEqual(await cache.cached('b'),[]);
 now=86400001;assert.equal(await cache.cached('b'),null);assert.equal(await cache.cached('c'),null);
});
await test('lookup caches metadata for 24 hours and never stores image data',async()=>{
 let stored=false;
 const response=await handleYouTubeMusic(request(linkQuery),runtime({cache:async(key,value,ttl)=>{stored=true;assert.equal(key,`youtube:v2:video:${id}`);assert.equal(ttl,86400000);assert.deepEqual(value,[item]);}}));
 assert.equal(response.status,200);assert.ok(stored);assert.equal(response.headers.get('set-cookie'),'fixture-cookie');assert.match(response.headers.get('cache-control'),/no-store/);
});
await test('rate limit stops upstream requests',async()=>{
 const response=await handleYouTubeMusic(request(linkQuery),runtime({reserve:async()=>null,fetcher:async()=>{throw Error('must not fetch');}}));assert.equal(response.status,429);
});
await test('global daily search budget is shared, hashed, and stops upstream requests',async()=>{
 let count=0;
 const response=await handleYouTubeMusic(request('q=아이유'),runtime({reserve:async(bucket,limit,ttl)=>{count++;if(count===1){assert.equal(limit,12);return 1;}assert.match(bucket,/youtube:search:[0-9a-f]{16}:2026-11-03$/);assert.ok(!bucket.includes('fixture-secret'));assert.equal(limit,95);assert.equal(ttl,172800000);return null;},fetcher:async()=>{throw Error('must not fetch');}}));
 assert.equal(response.status,429);assert.match((await response.json()).error,/링크/);
});
await test('Pacific quota dates respect standard and daylight saving time',()=>{
 assert.equal(youtubeQuotaDay(Date.parse('2026-11-04T07:59:59Z')),'2026-11-03');assert.equal(youtubeQuotaDay(Date.parse('2026-11-04T08:00:00Z')),'2026-11-04');
 assert.equal(youtubeQuotaDay(Date.parse('2026-07-01T06:59:59Z')),'2026-06-30');assert.equal(youtubeQuotaDay(Date.parse('2026-07-01T07:00:00Z')),'2026-07-01');
});
await test('provider errors, timeouts and DB failure never expose secrets or raw HTML',async()=>{
 for(const fetcher of [async()=>Response.json({error:'fixture-secret'},{status:429}),async()=>{throw new DOMException('secret internal URL','TimeoutError');}]){
  const response=await handleYouTubeMusic(request(linkQuery),runtime({fetcher}));assert.ok(response.status>=500);assert.ok(!(await response.text()).includes('secret'));
 }
 const response=await handleYouTubeMusic(request(linkQuery),runtime({cached:async()=>{throw Error('service_role_secret');}}));assert.equal(response.status,502);assert.ok(!(await response.text()).includes('secret'));
});
console.log(JSON.stringify({passed}));
