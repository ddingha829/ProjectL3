import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles}=await build({entryPoints:['src/social/bentoLayout.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {bentoLayout,BENTO_RATIOS,bentoKind,cardCanvasHeight,hasBentoFront}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
assert.deepEqual(BENTO_RATIOS,{daily:4/5,dining:4/5,movie:2/3,book:3/4,music:1,note:2},'Agreed topic ratios remain explicit');
let checks=0;
const pairs=Object.keys(BENTO_RATIOS).filter(kind=>kind!=='note').flatMap(first=>Object.keys(BENTO_RATIOS).filter(kind=>kind!=='note').map(second=>[first,second]));
for(const width of [284,339,357,724,760])for(const kinds of [[],['music'],['daily','note'],['music','note','movie'],['daily','music','book','movie','note','daily','dining'],['note','note','music','movie','book','daily'],Array.from({length:40},(_,i)=>['daily','music','movie','note','book'][i%5]),...pairs]){
 const result=bentoLayout(kinds,width);
 assert.equal(result.tiles.length,kinds.length);
 result.tiles.forEach((tile,index)=>{
  assert.ok(tile.left>=0&&tile.left+tile.width<=width+.001,'Card stays inside viewport');
  assert.ok(Math.abs(tile.width/tile.height-BENTO_RATIOS[kinds[index]])<.00001,'Whole card keeps its topic ratio, including single cards');
  assert.ok(tile.top+tile.height<=result.height+.001,'Feed reserves all card heights');
  if(index)assert.ok(tile.top>=result.tiles[index-1].top,'DOM chronology matches top-to-bottom visual order');
  if(kinds[index]==='note')assert.equal(tile.width,width,'Text spans both columns');
  result.tiles.slice(0,index).forEach(other=>assert.ok(tile.left>=other.left+other.width-.001||other.left>=tile.left+tile.width-.001||tile.top>=other.top+other.height-.001||other.top>=tile.top+tile.height-.001,'Cards do not overlap'));
 });
 result.tiles.forEach((tile,index)=>{
  if(kinds[index]!=='note')assert.equal(tile.width,(width-8.4)/2,'Both columns have equal widths, including an orphan card');
 });
 for(let count=0;count<kinds.length;count++)assert.deepEqual(bentoLayout(kinds.slice(0,count),width).tiles,result.tiles.slice(0,count),'Pagination never moves or resizes existing cards');
 checks++;
}
console.log(`Bento layout: ${checks} width/content scenarios passed`);
const log={category:'daily',image:'photo.jpg'};
assert.equal(bentoKind(log),'daily');assert.equal(cardCanvasHeight(log),525);
assert.equal(bentoKind({...log,image:'',body:'긴 글'}),'note');assert.equal(cardCanvasHeight({...log,image:''}),672);
for(const [category,height] of [['movie',630],['book',560]]){const entry={...log,category,image:'',work:{image:'cover.jpg'}};assert.equal(bentoKind(entry),category);assert.equal(cardCanvasHeight(entry),height);assert.equal(hasBentoFront(entry),true);}
assert.equal(cardCanvasHeight({...log,card:{ratio:'1:1',front:'ticket'}}),525,'Legacy front/ratio cannot change the automatic topic proportions');
