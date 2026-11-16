import assert from 'node:assert/strict';
import {build} from 'esbuild';import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir=path.resolve('.test-data');await fs.mkdir(dir,{recursive:true});
const shim=path.join(dir,'composer-hooks.mjs');
await fs.writeFile(shim,`let slots=[],cursor=0,effects=[],dirty=false;export function begin(){cursor=0;dirty=false;}export function useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],v=>{const next=typeof v==='function'?v(slots[i]):v;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];}export function useRef(value){const i=cursor++;return slots[i]||(slots[i]={current:value});}export function useId(){return 'id-'+cursor++;}export function useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,n)=>!Object.is(v,old.deps[n]))){effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}export const useLayoutEffect=useEffect;export function flush(){const jobs=effects;effects=[];jobs.forEach(f=>f());return dirty;}`);
const file=path.join(dir,'composer-late-youtube.mjs');
await build({entryPoints:['src/social/Composer.tsx'],bundle:true,platform:'node',format:'esm',outfile:file,loader:{'.css':'empty'},packages:'external',plugins:[{name:'composer-hooks',setup(b){b.onResolve({filter:/\.css$/},args=>({path:args.path,namespace:'empty-css'}));b.onLoad({filter:/.*/,namespace:'empty-css'},()=>({contents:'',loader:'js'}));b.onResolve({filter:/^react$/},args=>args.importer.endsWith('/Composer.tsx')||args.importer.endsWith('\\Composer.tsx')?{path:pathToFileURL(shim).href,external:true}:undefined);}}],logLevel:'silent'});
const hooks=await import(pathToFileURL(shim)),{default:Composer}=await import(pathToFileURL(file));
globalThis.requestAnimationFrame=fn=>{fn();return 1;};
const video={videoId:'oqs4WpYwFIM',title:'[따릉맨] 따릉이 안 타고, 난지캠핑장에서 오뎅탕에 캪틴큐ㅣ따릉맨 ep.14',channelTitle:'더면상'};
let saved;const props={actor:{id:'me',name:'준혁'},circles:[],audience:null,dark:false,open:false,onClose(){},onSave(log){saved=log;return true;}};
const render=()=>{let tree;for(let i=0;i<15;i++){hooks.begin();tree=Composer(props);if(!hooks.flush())return tree;}throw Error('Unstable composer');};
const find=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const match=find(child,predicate);if(match)return match;}return null;};
render(); // Real entry path: retained composer mounts before the external picker.
props.initialYouTube=video;props.initialImage='https://i.ytimg.com/vi/oqs4WpYwFIM/hqdefault.jpg';props.open=true;
let tree=render();const input=find(tree,n=>n.props?.['aria-label']==='티끌 내용');input.props.onChange({target:{value:'친구들과 보고 싶은 영상'}});tree=render();
const button=find(tree,n=>n.props?.['aria-label']==='티끌 저장');assert(button);button.props.onClick();await Promise.resolve();await Promise.resolve();
assert(saved,'Submit reaches onSave');assert.deepEqual(saved.youtube,video,'Late picker selection survives the actual composer save path');assert.equal(saved.title,video.title);assert.equal(saved.body,'친구들과 보고 싶은 영상');assert.equal(saved.work,undefined);
console.log('PASS retained Composer receives a YouTube selection after mount and saves the original title, metadata and user-written body');
