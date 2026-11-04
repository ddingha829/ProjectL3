import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles}=await build({entryPoints:['src/design-review/bento/bentoLayout.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {bentoLayout,BENTO_RATIOS}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
let checks=0;
for(const width of [284,339,357,724,760])for(const kinds of [[],['music'],['daily','music','book','movie','note','daily','dining'],['note','note','music','movie','book','daily'],Array.from({length:40},(_,i)=>['daily','music','movie','note','book'][i%5])]){
 const result=bentoLayout(kinds,width);
 assert.equal(result.tiles.length,kinds.length);
 result.tiles.forEach((tile,index)=>{
  assert.ok(tile.left>=0&&tile.left+tile.width<=width+.001,'Card stays inside viewport');
  assert.ok(Math.abs(tile.width/tile.height-BENTO_RATIOS[kinds[index]])<.0001,'Every topic retains its aspect ratio');
  assert.ok(tile.top+tile.height<=result.height+.001,'Feed reserves all card heights');
  if(index)assert.ok(tile.top>=result.tiles[index-1].top,'DOM chronology matches top-to-bottom visual order');
  if(kinds[index]==='note')assert.equal(tile.width,width,'Text spans both columns');
  result.tiles.slice(0,index).forEach(other=>assert.ok(tile.left>=other.left+other.width-.001||other.left>=tile.left+tile.width-.001||tile.top>=other.top+other.height-.001||other.top>=tile.top+tile.height-.001,'Cards do not overlap'));
 });
 checks++;
}
console.log(`Bento layout: ${checks} width/content scenarios passed`);
