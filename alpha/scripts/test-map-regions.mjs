import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/map-regions.mjs');
await build({entryPoints:['src/social/mapRegions.ts'],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {mapTierForZoom,mapRevealStyle,mapRegionMask,regionStrength,regionalCoverage,logsInViewport,regionsInBounds,loadMapRegions}=await import(pathToFileURL(outfile));
const read=async tier=>JSON.parse(await fs.readFile(`public/maps/admin-regions/20261001/${tier}-display.json`,'utf8'));
const [district,dong]=await Promise.all([read('district'),fs.readFile('public/maps/admin-dong/20261001/11710.json','utf8').then(JSON.parse)]);
const log=(id,lat,lng)=>({id,place:{lat,lng},createdAt:1});
const jamsil=log('jamsil',37.5133,127.1025),seongsu=log('seongsu',37.5445,127.0557),busan=log('busan',35.1588,129.1603),tokyo=log('tokyo',35.68,139.76);
const requireSource=await fs.readFile('public/maps/admin-regions/20261001/district.json','utf8');
const checks=[];
const test=(name,run)=>{run();checks.push(name);};
test('neighborhoods remain until zoom 11 and switch only after further zoom-out',()=>assert.deepEqual([15,12,11.75,11.5,11.25,11,10.75,10.5,8,2].map(mapTierForZoom),['dong','dong','dong','dong','dong','dong','district','district','district','district']));
test('display regions retain all identities and source bounds with fewer vertices',()=>{const source=JSON.parse(requireSource),byCode=new Map(source.features.map(f=>[f.properties.code,f]));assert.equal(district.features.length,byCode.size);const vertices=j=>j.features.reduce((n,f)=>n+JSON.stringify(f.geometry.coordinates).split('[').length,0);assert.ok(vertices(district)<vertices(source)*.6);for(const f of district.features){const old=byCode.get(f.properties.code);assert.deepEqual(f.properties,old.properties);assert.deepEqual(f.bbox,old.bbox);const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();for(const ring of rings){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));}}});

test('Jamsil resolves to its dong and Songpa',()=>{assert.match(regionalCoverage([jamsil],dong,'dong').dongs[0].feature.properties.name,/잠실/);assert.match(regionalCoverage([jamsil],district,'district').dongs[0].feature.properties.name,/송파구/);});
test('nearby and distant districts never merge into a province or country',()=>assert.equal(regionalCoverage([jamsil,seongsu,busan],district,'district').dongs.length,3));
test('overseas logs do not paint an entire country',()=>assert.equal(regionalCoverage([tokyo],district,'district').dongs.length,0));
test('aggregation preserves original log ids without duplication',()=>{const r=regionalCoverage([jamsil,jamsil],district,'district');assert.equal(r.dongs[0].count,1);assert.deepEqual(r.dongs[0].logIds,['jamsil']);});
test('precise dong membership survives simplified district geometry',()=>{const precise=regionalCoverage([jamsil],dong,'dong').dongs;const displaced={...jamsil,place:{lat:0,lng:0}};const r=regionalCoverage([displaced],district,'district',precise);assert.equal(r.unmatched,0);assert.equal(r.dongs[0].count,1);assert.equal(r.dongs[0].feature.properties.code,'11710');});
test('district strength still scales with record count',()=>{assert.equal(regionStrength(4,'dong'),4);assert.equal(regionStrength(4,'district'),2);assert.equal(regionStrength(20,'district'),4);});
test('dark mode softens every level while light mode keeps its previous treatment',()=>{for(let level=1;level<=4;level++){const dark=mapRevealStyle(level,true),light=mapRevealStyle(level,false);assert.equal(light.opacity,1);assert.equal(dark.opacity,.72);assert.match(dark.filter,/brightness\(\.85\)/);assert.equal(light.filter,level===1?'none':'saturate('+level+')');if(level>1)assert.ok(1+(level-1)*.5<level);}});
test('feather mask preserves the pan offset and blurs alpha rather than map labels',()=>{const svg=decodeURIComponent(mapRegionMask('M 5 5 L 30 5 L 30 30 Z',-20,12,400,800).split('data:image/svg+xml,')[1].slice(0,-2));assert.match(svg,/viewBox="-20 12 400 800"/);assert.match(svg,/<feGaussianBlur stdDeviation="1.4"/);assert.match(svg,/fill="white"/);assert.match(svg,/filterUnits="userSpaceOnUse"/);});
test('viewport excludes offscreen and unlocated logs',()=>assert.deepEqual(logsInViewport([jamsil,seongsu,busan,{id:'text'}],{zoom:15,bounds:[127.09,37.50,127.12,37.53],center:[37.513,127.10]}).map(l=>l.id),['jamsil']));
test('viewport handles wrapping near date line',()=>assert.equal(logsInViewport([log('wrapped',0,-179)],{zoom:10,bounds:[179,-2,183,2],center:[0,181]}).length,1));
test('all bundled regions have finite polygon geometry and bbox',()=>{for(const f of district.features){assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));assert.equal(f.bbox.length,4);assert.ok(f.bbox.every(Number.isFinite));}});
console.log(JSON.stringify({status:'passed',checks}));

test('viewport culls distant regions without changing membership/count data',()=>{const all=regionalCoverage([jamsil,seongsu,busan],district,'district').dongs;const visible=regionsInBounds(all,[126.9,37.4,127.2,37.65]);assert.equal(visible.length,2);assert.equal(all.length,3);assert.ok(visible.every(row=>all.includes(row)));});
test('culling includes crossing polygons even when the log itself is outside view',()=>{const region={feature:{bbox:[0,0,10,10]}};assert.equal(regionsInBounds([region],[4,4,5,5]).length,1);assert.equal(regionsInBounds([region],[11,4,12,5]).length,0);assert.equal(regionsInBounds([region],[10,4,12,5]).length,1);});
test('region culling supports wrapped and whole-world views',()=>{const region={feature:{bbox:[-180,-2,-178,2]}};assert.equal(regionsInBounds([region],[179,-3,183,3]).length,1);assert.equal(regionsInBounds([region],[539,-3,543,3]).length,1);assert.equal(regionsInBounds([region],[-540,-90,540,90]).length,1);assert.equal(regionsInBounds([region],[179,4,183,8]).length,0);});
const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>district};};
try{const prefetch=loadMapRegions('district'),demand=loadMapRegions('district');assert.equal(prefetch,demand);assert.equal(await prefetch,district);assert.equal(await loadMapRegions('district'),district);assert.equal(calls,1);checks.push('idle prefetch and foreground demand reuse one request and parsed result');}finally{globalThis.fetch=oldFetch;}
console.log(JSON.stringify({status:'passed',checks:checks.length,viewportCulling:true,prefetchRequests:calls}));
