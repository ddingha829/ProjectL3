import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const outfile=path.resolve('.test-data/page-swipe.mjs');
await fs.mkdir('.test-data',{recursive:true});
await build({entryPoints:['src/unified/pageSwipe.ts'],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {swipeIntent,swipeDestination}=await import(pathToFileURL(outfile));
const cases=[
 ['left advances',()=>assert.equal(swipeIntent(-70,5,200),1)],
 ['right returns',()=>assert.equal(swipeIntent(70,5,200),-1)],
 ['vertical scroll is not navigation',()=>assert.equal(swipeIntent(10,100,200),null)],
 ['diagonal drag is not navigation',()=>assert.equal(swipeIntent(80,60,200),null)],
 ['tap is not navigation',()=>assert.equal(swipeIntent(4,2,150),null)],
 ['slow short drag is not navigation',()=>assert.equal(swipeIntent(-60,2,900),null)],
 ['slow deliberate drag advances',()=>assert.equal(swipeIntent(-90,2,900),1)],
 ['invalid coordinates ignored',()=>assert.equal(swipeIntent(NaN,0,200),null)],
 ['feed to map',()=>assert.equal(swipeDestination('logs',1),'map')],
 ['map to tiles',()=>assert.equal(swipeDestination('map',1),'mosaic')],
 ['tiles to studio',()=>assert.equal(swipeDestination('mosaic',1),'studio')],
 ['studio to tiles',()=>assert.equal(swipeDestination('studio',-1),'mosaic')],
 ['tiles to map',()=>assert.equal(swipeDestination('mosaic',-1),'map')],
 ['map to feed',()=>assert.equal(swipeDestination('map',-1),'logs')],
 ['feed right keeps compose shortcut',()=>assert.equal(swipeDestination('logs',-1),'compose')],
 ['studio edge never opens settings or wraps',()=>assert.equal(swipeDestination('studio',1),null)],
];
for(const [,test] of cases)test();
console.log(JSON.stringify({status:'passed',checks:cases.map(([name])=>name)}));
