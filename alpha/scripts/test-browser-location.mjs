import assert from 'node:assert/strict';
import {build} from 'esbuild';
import vm from 'node:vm';
const {outputFiles}=await build({entryPoints:['src/lib/browserLocation.ts'],bundle:true,write:false,platform:'node',format:'cjs',logLevel:'silent'});
const code=outputFiles[0].text,checks=[];
function run(name,options,check){
 let request;const timers=new Map(),errors=[],positions=[];
 const context={module:{exports:{}},window:{isSecureContext:options.secure!==false},document:{},navigator:options.unsupported?{}:{geolocation:{getCurrentPosition(success,failure,settings){if(options.throw)throw Error('Native API unavailable');request={success,failure,settings};}}},setTimeout(fn,ms){timers.set(fn,ms);return fn;},clearTimeout(key){timers.delete(key);}};
 if(options.policy===false)context.document.permissionsPolicy={allowsFeature:()=>false};
 vm.runInNewContext(code,context);const cancel=context.module.exports.requestBrowserLocation(p=>positions.push(p),e=>errors.push(e));
 check({request,timers,errors,positions,cancel});assert.equal(timers.size,0,'finished requests release their watchdog');checks.push(name);
}
run('native request happens synchronously',{},({request,cancel})=>{assert.ok(request);assert.equal(request.settings.timeout,10000);cancel();});
run('insecure context is explained',{secure:false},({request,errors})=>{assert.equal(request,undefined);assert.equal(errors[0].kind,'insecure');});
run('permissions policy failure is explained',{policy:false},({errors})=>assert.equal(errors[0].kind,'policy'));
run('missing API is explained',{unsupported:true},({errors})=>assert.equal(errors[0].kind,'unsupported'));
run('synchronous native failure ends loading',{throw:true},({errors})=>assert.equal(errors[0].kind,'unavailable'));
run('permission denial is actionable',{},({request,errors})=>{request.failure({code:1});assert.equal(errors[0].kind,'permission');});
run('no callback cannot leave loading stuck forever',{},({timers,errors,request,positions})=>{const [[expire,delay]]=timers;assert.equal(delay,15000);expire();request.success({coords:{latitude:37.5,longitude:127}});assert.equal(errors[0].kind,'timeout');assert.equal(positions.length,0);});
run('cancellation ignores late permission errors',{},({cancel,request,errors})=>{cancel();request.failure({code:1});assert.equal(errors.length,0);});
run('invalid coordinates cannot be recorded',{},({request,errors})=>{request.success({coords:{latitude:NaN,longitude:127}});assert.equal(errors[0].kind,'unavailable');});
run('valid coordinates finish once',{},({request,positions,errors})=>{request.success({coords:{latitude:37.5,longitude:127}});request.failure({code:3});assert.equal(positions.length,1);assert.equal(errors.length,0);});
console.log(JSON.stringify({status:'passed',checks}));
