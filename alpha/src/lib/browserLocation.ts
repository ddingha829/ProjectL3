export type LocationIssue={kind:'permission'|'timeout'|'unavailable'|'unsupported'|'insecure'|'policy';message:string};
export const locationIssue=(code:number):LocationIssue=>code===1
 ?{kind:'permission',message:'위치 접근이 차단돼 있어요. 휴대폰과 브라우저의 위치 권한을 확인해주세요.'}
 :code===3?{kind:'timeout',message:'위치 응답이 늦어지고 있어요. 위치 요청 버튼을 눌러 다시 시도해주세요.'}
 :{kind:'unavailable',message:'현재 위치를 확인하지 못했어요. 휴대폰의 위치 기능을 켠 뒤 다시 시도해주세요.'};

/** Call synchronously from a click when retrying. Never await a permissions query
 * before the native request. A watchdog also covers a browser that never answers. */
export function requestBrowserLocation(onPosition:(position:GeolocationPosition)=>void,onError:(issue:LocationIssue)=>void){
 let active=true,timer:ReturnType<typeof setTimeout>|undefined;
 const finish=()=>{active=false;clearTimeout(timer);};
 const fail=(issue:LocationIssue)=>{if(active){finish();onError(issue);}};
 const cancel=()=>finish();
 if(typeof window!=='undefined'&&window.isSecureContext===false){fail({kind:'insecure',message:'현재 위치는 HTTPS에서 사용할 수 있어요. https://www.ticgle.kr 로 접속해주세요.'});return cancel;}
 if(typeof navigator==='undefined'||!navigator.geolocation){fail({kind:'unsupported',message:'이 브라우저에서는 현재 위치를 지원하지 않아요. 위치 이름만 직접 입력할 수도 있어요.'});return cancel;}
 if(typeof document!=='undefined'){
  type Policy={allowsFeature:(name:string)=>boolean};
  const d=document as Document&{permissionsPolicy?:Policy;featurePolicy?:Policy};
  const policy=d.permissionsPolicy||d.featurePolicy;
  try{if(policy&&!policy.allowsFeature('geolocation')){fail({kind:'policy',message:'이 화면에서는 위치 요청이 제한돼 있어요. https://www.ticgle.kr 를 브라우저에서 직접 열어주세요.'});return cancel;}}catch{/* Older browsers may not expose this policy query. */}
 }
 timer=setTimeout(()=>fail(locationIssue(3)),15000);
 try{navigator.geolocation.getCurrentPosition(position=>{
  if(!active)return;
  if(!position?.coords||!Number.isFinite(position.coords.latitude)||!Number.isFinite(position.coords.longitude)||Math.abs(position.coords.latitude)>90||Math.abs(position.coords.longitude)>180){fail(locationIssue(2));return;}
  finish();return onPosition(position);
 },error=>fail(locationIssue(error.code)),{enableHighAccuracy:true,timeout:10000,maximumAge:60000});}catch{fail(locationIssue(2));}
 return cancel;
}
