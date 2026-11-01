import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/collection-offer-test.mjs');
await build({stdin:{contents:"export {default as useOffer} from './src/unified/useCollectionPlacementOffer';export {default as Offer,collectionIntroKey} from './src/unified/CollectionPlacementOffer';export {default as Board} from './src/unified/MosaicBoard';",resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',external:['lucide-react'],plugins:[{name:'harness',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'qa'}));b.onResolve({filter:/^react\/jsx-runtime$/},()=>({path:'jsx',namespace:'qa'}));b.onResolve({filter:/^react-dom$/},()=>({path:'portal',namespace:'qa'}));
 b.onResolve({filter:/EditorialCard$/},()=>({path:'card',namespace:'qa'}));b.onResolve({filter:/MosaicExhibition$/},()=>({path:'exhibition',namespace:'qa'}));
 b.onLoad({filter:/.*/,namespace:'qa'},({path:p})=>({contents:{hooks:'export const useState=(...a)=>globalThis.__offerHooks.state(...a);export const useEffect=(...a)=>globalThis.__offerHooks.effect(...a);export const useRef=(...a)=>globalThis.__offerHooks.ref(...a);export const useCallback=f=>f;export const useId=()=>"id";',jsx:'export const Fragment="fragment";export const jsx=(type,props)=>({type,props});export const jsxs=jsx;',portal:'export const createPortal=node=>node;',card:'export default function Card(){return null}export const cardTitle=l=>l.work?.title||l.title;export const styleOf=()=>({bg:"#fff",text:"#111"});',exhibition:'export default function Exhibition(){return null}'}[p]}));
}}]});
const {useOffer,Offer,Board,collectionIntroKey}=await import(pathToFileURL(outfile));
const checks=[],keys=['__offerHooks','document','localStorage','setTimeout','clearTimeout','Date','requestAnimationFrame','cancelAnimationFrame'],original=Object.fromEntries(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
let clock=0,timers=new Map(),writes=new Map();
function harness(Component,initial){
 const slots=[];let cursor=0,pending=[],dirty=false,props=initial,value;
 globalThis.__offerHooks={state(initial){const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},ref(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},effect(effect,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((x,n)=>!Object.is(x,previous.deps[n]))){slots[i]={effect,deps,cleanup:previous?.cleanup};pending.push(slots[i]);}}};
 const render=(update={})=>{props={...props,...update};for(let n=0;n<15;n++){dirty=false;cursor=0;pending=[];value=Component(props);for(const effect of pending){effect.cleanup?.();effect.cleanup=effect.effect();}if(!dirty)return value;}throw Error('Render loop');};
 return {render,read:()=>value,unmount(){slots.filter(s=>s?.effect).forEach(s=>s.cleanup?.());}};
}
const work=(id='new',kind='movie',authorId='me')=>({id,authorId,title:id,body:'',createdAt:1,image:'',category:kind,work:{id:'work:'+id,kind,title:'작품 '+id,image:'',...(kind==='movie'?{mediaType:'tv'}:{})},likes:[],bookmarks:[],comments:[]});
const defaults={owner:'account:a',logs:[work()],personalBoard:{},sync:'idle'};
function hook(name,check,initial={}){const h=harness(useOffer,{...defaults,...initial});try{h.render();check({...h,request(id='new'){h.read().request(id);return h.render();}});checks.push(name);}finally{h.unmount();}}
function walk(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=walk(child,predicate);if(found)return found;}}
try{
 const doc=new EventTarget();doc.visibilityState='visible';doc.body={};doc.querySelector=()=>doc.body;globalThis.document=doc;
 globalThis.localStorage={getItem:key=>writes.get(key)||null,setItem:(key,value)=>writes.set(key,value)};
 globalThis.Date=class extends Date{static now(){return clock;}};
 globalThis.setTimeout=(fn,ms)=>{const token={};timers.set(token,{fn,at:clock+ms});return token;};globalThis.clearTimeout=token=>timers.delete(token);
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 const advance=ms=>{clock+=ms;for(const [id,timer] of timers)if(timer.at<=clock){timers.delete(id);timer.fn();}};
 hook('opening the feed does not invite placement of old works',h=>assert.equal(h.read().log,undefined));
 hook('waits for a successful save and retry',h=>{h.request();assert.equal(h.read().log,undefined);h.render({sync:'failed'});assert.equal(h.read().log,undefined);h.render({sync:'idle'});assert.equal(h.read().log.id,'new');},{sync:'saving'});
 hook('film/TV and book records are eligible',h=>{h.request();assert.equal(h.read().log.work.mediaType,'tv');h.render({logs:[work('book','book')]});h.request('book');assert.equal(h.read().log.work.kind,'book');});
 hook('a category alone cannot create a collection tile',h=>{h.request();assert.equal(h.read().log,undefined);},{logs:[{...work(),work:undefined}]});
 hook('only the author receives the offer',h=>{h.request();assert.equal(h.read().log,undefined);},{logs:[work('new','movie','other')]});
 hook('already placed works are not offered',h=>{h.request();assert.equal(h.read().log,undefined);},{personalBoard:{2:'new'}});
 hook('placing or deleting a record removes its offer',h=>{h.request();h.render({personalBoard:{0:'new'}});assert.equal(h.read().log,undefined);h.render({logs:[]});assert.equal(h.read().log,undefined);});
 hook('dismissal preserves the log and its board',h=>{h.request();h.read().dismiss();h.render();assert.equal(h.read().log,undefined);assert.equal(defaults.logs.length,1);assert.deepEqual(defaults.personalBoard,{});});
 hook('navigating away cancels a queued failed save offer',h=>{h.request();h.read().dismiss();h.render({sync:'idle'});assert.equal(h.read().log,undefined);},{sync:'failed'});
 hook('an account switch cannot display the previous account offer',h=>{h.request();h.render({owner:'account:b'});assert.equal(h.read().log,undefined);h.render({owner:'account:a'});assert.equal(h.read().log,undefined);});
 let dismisses=0;const p=harness(Offer,{log:work(),owner:'intro:a',onPlace:()=>{},onDismiss:()=>dismisses++});
 p.render();assert.ok(walk(p.read(),n=>n.props?.className==='un-collection-offer-intro'));assert.equal(writes.get(collectionIntroKey('intro:a')),'1');
 advance(5000);p.read().props.onFocusCapture();p.render();advance(20000);assert.equal(dismisses,0);
 p.read().props.onPointerEnter({pointerType:'mouse'});p.render();p.read().props.onPointerLeave({pointerType:'mouse'});p.render();advance(20000);assert.equal(dismisses,0,'keyboard focus continues to pause after hover leaves');
 p.read().props.onBlurCapture({currentTarget:{contains:()=>false},relatedTarget:null});p.render();advance(6999);assert.equal(dismisses,0);advance(1);assert.equal(dismisses,1);p.unmount();checks.push('first guide shows once and pauses its 12-second lifetime while focused');
 const repeat=harness(Offer,{log:work('second'),owner:'intro:a',onPlace:()=>{},onDismiss:()=>dismisses++});repeat.render();assert.equal(walk(repeat.read(),n=>n.props?.className==='un-collection-offer-intro'),undefined);advance(3000);doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));repeat.render();advance(20000);assert.equal(dismisses,1);doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));repeat.render();advance(5000);assert.equal(dismisses,2);repeat.unmount();checks.push('later offers are compact and pause their 8-second lifetime in the background');
 const actor={id:'me',name:'테스터',initial:'테',color:'#c04c29'},placed=Array.from({length:16},(_,n)=>work('placed'+n)),other=work('other');
 const state={people:[actor],circles:[],logs:[...placed,work(),other],mosaic:{personalBoard:Object.fromEntries(placed.map((log,n)=>[n,log.id])),groupBoards:{}}};
 const board=harness(Board,{state,logs:state.logs,scope:'mine',actor,focusLogId:'new',commit:()=>true,onOpen:()=>{}});board.render();assert.ok(walk(board.read(),n=>n.props?.['aria-label']==='2번째 16칸 보드'));assert.ok(walk(board.read(),n=>n.props?.['data-tray-log']==='new'&&n.props['aria-pressed']===true));
 walk(board.read(),n=>n.props?.['data-tray-log']==='other').props.onClick();board.render();board.render({logs:[...state.logs,work('incoming')]});assert.ok(walk(board.read(),n=>n.props?.['data-tray-log']==='other'&&n.props['aria-pressed']===true));board.unmount();checks.push('full first boards open page two with the saved tile selected, without overriding later choices');
 assert.equal(timers.size,0,'unmounted components release timers');
}finally{for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
console.log(JSON.stringify({status:'passed',checks}));
