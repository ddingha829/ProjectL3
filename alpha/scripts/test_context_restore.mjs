import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),cache=new Map(),JSZip=require('jszip');
function load(relative){
 const filename=path.resolve(relative);if(cache.has(filename))return cache.get(filename).exports;const module={exports:{}};cache.set(filename,module);
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const scoped=name=>{
  if(name==='server-only')return {};
  if(name==='jszip')return {__esModule:true,default:{loadAsync:async file=>JSZip.loadAsync(await file.arrayBuffer())}};
  if(name==='@/lib/imageUtils')return {compressUploadedImage:async file=>{if(await file.text()==='broken')throw new Error('bad image');return 'data:image/webp;base64,dGVzdA==';}};
  if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(filename),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'/index.ts');}
  return require(name);
 };new Function('require','module','exports',source)(scoped,module,module.exports);return module.exports;
}
const {normalizeLogInput}=load('src/lib/store/logInput.ts'),{parseExperienceInput,dateTimeInput,experienceDate}=load('src/lib/logDate.ts'),{logDay,calendarLogs}=load('src/lib/logCalendar.ts');
const {privateShareAppearance,privateShareItem}=load('src/lib/sharePrivacy.ts'),{createCardAppearance}=load('src/lib/cardAppearance.ts'),{PRESET_SLOTS,INITIAL_SKINS}=load('src/data/initialData.ts');
const {prepareBackupRestore}=load('src/lib/backupRestore.ts'),{LocalArchiveRepository}=load('src/lib/localArchiveRepository.ts');
const item=(title='원본')=>normalizeLogInput({id:crypto.randomUUID(),title,cat:'DINING',quote:'메모',timestamp:Date.parse('2026-10-21T10:00:00+09:00'),loc:'서울',author:'작성자',img:'',hasPhoto:false});
const original=item(),occurredAt=parseExperienceInput('2026-09-02T13:45');
const changed=normalizeLogInput({...original,occurredAt,date:'01.01.01',timestamp:1},original);
assert.equal(changed.timestamp,original.timestamp);assert.equal(changed.date,original.date);assert.equal(changed.occurredAt,occurredAt);
assert.equal(dateTimeInput(occurredAt),'2026-09-02T13:45');assert.equal(logDay(changed),'2026-09-02');assert.equal(experienceDate(changed),'26.09.02');
assert.equal(calendarLogs([original,changed])[0],changed);assert.equal(logDay({timestamp:0}),'');assert.equal(logDay({timestamp:1e30}),'');
assert.equal(parseExperienceInput(''),null);for(const invalid of ['2026-02-30T12:00','bad','2026-09-02T13:99'])assert.throws(()=>parseExperienceInput(invalid));
assert.throws(()=>normalizeLogInput({...original,occurredAt:Infinity}));assert.equal(normalizeLogInput({occurredAt:null},changed).occurredAt,null);
const appearance=createCardAppearance(original,PRESET_SLOTS[1],INITIAL_SKINS,'작성자'),frozen=JSON.stringify({original,appearance});
const options={location:false,signature:false,map:false},privateItem=privateShareItem(original,options),privateStyle=privateShareAppearance(appearance,options);
assert.equal(privateItem.loc,'');assert.equal(privateItem.sub,'DINING');assert.equal(privateItem.author,'');assert.equal(privateStyle.authorName,'');assert.equal(privateStyle.slot.showLocation,false);assert.equal(privateStyle.slot.showSignature,false);assert.equal(JSON.stringify({original,appearance}),frozen);
console.log('PASS actual event time is independent of creation time; invalid dates reject; calendar ordering and share privacy clones');
const group=normalizeLogInput({id:crypto.randomUUID(),cat:'GROUP',title:'그룹',memberIds:[original.id],timestamp:original.timestamp});
const file=rows=>new File([JSON.stringify(rows)],'backup.json',{type:'application/json'});
const plan=await prepareBackupRestore(file([group,original,original,{id:'bad',cat:'UNKNOWN',timestamp:1}]),[],'owner-a',()=>{});
assert.equal(plan.items.length,2);assert.equal(plan.duplicates,1);assert.equal(plan.invalid,1);assert.notEqual(plan.items[0].id,original.id);assert.deepEqual(plan.items[1].memberIds,[plan.items[0].id]);
assert.equal((await prepareBackupRestore(file([original]),[original],'owner-a',()=>{})).items.length,0);
assert.equal((await prepareBackupRestore(file([original,group]),plan.items,'owner-a',()=>{})).duplicates,2);
assert.notEqual((await prepareBackupRestore(file([original]),[],'owner-b',()=>{})).items[0].id,plan.items[0].id);
const invalidGroup=await prepareBackupRestore(file([{...group,memberIds:[crypto.randomUUID()]}]),[],'owner-a',()=>{});assert.equal(invalidGroup.items.length,0);assert.equal(invalidGroup.missingMembers,1);
const imageRecord={...original,img:'https://example.com/photo.jpg',hasPhoto:true},zip=new JSZip();zip.file('logs.json',JSON.stringify([imageRecord]));zip.file('manifest.json',JSON.stringify({images:{[original.id]:'images/photo.png'}}));zip.file('images/photo.png','photo');
const zipped=new File([await zip.generateAsync({type:'uint8array'})],'backup.zip');
const zippedPlan=await prepareBackupRestore(zipped,[],'owner-a',()=>{});assert.match(zippedPlan.items[0].img,/^data:image\/webp/);assert.equal(zippedPlan.missingImages,0);
zip.file('images/photo.png','broken');const brokenPlan=await prepareBackupRestore(new File([await zip.generateAsync({type:'uint8array'})],'broken.zip'),[],'owner-a',()=>{});assert.equal(brokenPlan.items.length,1);assert.equal(brokenPlan.missingImages,1);assert.equal(brokenPlan.items[0].img,imageRecord.img);
await assert.rejects(()=>prepareBackupRestore(new File(['{}'],'wrong.txt'),[],'owner-a',()=>{}));
await assert.rejects(()=>prepareBackupRestore(new File(['{'],'bad.json'),[],'owner-a',()=>{}));
console.log('PASS backup IDs are owner-scoped and repeatable; existing logs remain untouched; groups remap; corrupt images retain valid text');
class Storage{data=null;fail=false;async read(){return structuredClone(this.data);}async write(data){if(this.fail)throw new Error('disk full');this.data=structuredClone(data);}}
let offline=false;const rows=[],methods=[];
const transport=async(url,init={})=>{if(offline)throw new Error('offline');if(url==='/api/session')return Response.json({deviceId:'owner-a'});if(init.method==='POST'){const row=JSON.parse(init.body);assert.equal(row.appendOnly,true);rows.push(row);methods.push(row.cat);}return Response.json({archives:rows});};
const storage=new Storage(),repository=new LocalArchiveRepository(storage,transport);await repository.start();offline=true;
assert.deepEqual(await repository.restoreBatch(plan.items,'owner-a'),{added:2,skipped:0});assert.equal(repository.getView().pendingCount,2);
assert.deepEqual(await repository.restoreBatch(plan.items,'owner-a'),{added:0,skipped:2});assert.equal(repository.getView().archives.length,2);
await assert.rejects(()=>repository.restoreBatch([item('다른 계정')],'owner-b'),/계정/);storage.fail=true;
await assert.rejects(()=>repository.restoreBatch([item('실패')],'owner-a'),/disk full/);assert.equal(repository.getView().archives.length,2);storage.fail=false;
offline=false;await repository.retrySync();assert.deepEqual(methods,['DINING','GROUP']);assert.equal(repository.getView().pendingCount,0);
console.log('PASS restore is atomic, append-only, account-bound, durable offline and syncs normal logs before groups');
