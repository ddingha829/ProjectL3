import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/card-date-fixture.mjs');
await build({entryPoints:['scripts/card-date-fixture.tsx'],outfile,bundle:true,platform:'node',format:'esm',external:['react','react-dom/server','lucide-react'],loader:{'.css':'empty'},logLevel:'silent'});
const {renderCard}=await import(pathToFileURL(outfile));
const backs=['postcard','review','day','doodle','broadside','passport','vinyl','library','paint'];
let checks=0;
for(const back of backs)for(const ratio of ['9:16','1:1'])for(const rating of ['','4.5']){
 const html=renderCard(back,ratio,rating),dates=html.match(/2026\.10\.26/g)||[];
 assert.equal(dates.length,back==='day'?0:1,`${back}/${ratio}/${rating}: date must appear once`);
 if(back==='day')assert.match(html,/ec-calendar-date/);
 if(back==='postcard'){assert.doesNotMatch(html.match(/class="ec-stamp">(.*?)<\/header>/s)?.[1]||'',/2026/);assert.match(html,rating?/ec-rating/:/ec-stamp-symbol/);}
 checks++;
}
console.log(JSON.stringify({status:'passed',checks,layouts:backs}));
