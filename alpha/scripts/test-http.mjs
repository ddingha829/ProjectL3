import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.L2_TEST_BASE_URL||'http://127.0.0.1:3014';
const statusResponse=await fetch(base+'/api/integrations/status'),cookie=statusResponse.headers.get('set-cookie')?.split(';')[0];
assert.equal(statusResponse.status,200);const status=await statusResponse.json();assert.equal(status.limit,20);assert.ok(status.tmdb&&status.books&&status.gemini);
const headers={'Origin':base,'X-L2-Request':'1',...(cookie?{Cookie:cookie}:{})};
async function get(path){const r=await fetch(base+path,{headers});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
const [config,movie,books,address,places,weatherResponse]=await Promise.all([
 get('/api/backend/config'),get('/api/media/search?q='+encodeURIComponent('인터스텔라')),get('/api/books/search?q='+encodeURIComponent('데미안')),
 get('/api/places/nearby?mode=address&lat=37.5665&lng=126.978'),get('/api/places/nearby?lat=37.5665&lng=126.978'),
 fetch(base+'/api/weather',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({lat:37.5665,lng:126.978})}),
]);
assert.equal(config.enabled,true);assert.equal(JSON.parse(Buffer.from(config.key.split('.')[1],'base64url')).role,'anon');
assert.ok(movie.results.length);assert.ok(books.results.length);assert.equal(address.address.lat,37.5665);assert.ok(places.places.length);
assert.equal(weatherResponse.status,200);const weather=await weatherResponse.json();assert.equal(typeof weather.weather.temperature,'number');
const images=[];for(const work of [movie.results[0],books.results[0]]){assert.ok(work.poster.startsWith('/api/media/image?'));const r=await fetch(base+work.poster);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^image\//);images.push({bytes:(await r.arrayBuffer()).byteLength});}
const aiResponse=await fetch(base+'/api/media/summary',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({title:'인터스텔라',type:'movie',overview:'지구의 환경이 악화되자 우주 탐사대가 인류가 살 수 있는 새로운 행성을 찾으러 떠난다. 탐사에 나선 아버지는 지구에 남은 딸과 멀어진 시간 속에서도 연결을 이어가려 한다.'})});
assert.equal(aiResponse.status,200);const summary=await aiResponse.json();assert.ok(summary.summary);assert.ok(['ai','ai-cache'].includes(summary.source),'AI provider did not return an AI summary: '+summary.source+' / '+summary.reason);
const rejected=await fetch(base+'/api/weather',{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json','X-L2-Request':'1'},body:'{}'});assert.equal(rejected.status,403);
const result={status:'passed',base,checks:['provider status and daily limit','public config exposes anon role only','TMDB search','Kakao book search','Google reverse address','Google nearby places','WeatherAPI current weather','TMDB image proxy','book cover proxy','Gemini synopsis summary','cross-site weather request rejected'],aiSource:summary.source,imageBytes:images.map(image=>image.bytes),finishedAt:new Date().toISOString()};
await fs.mkdir('work',{recursive:true});await fs.writeFile('work/http-integration-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
