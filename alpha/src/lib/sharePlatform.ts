type ShareEnvironment={userAgent:string;platform:string;touchPoints:number;standalone:boolean};

export function isInstalledIos(environment:ShareEnvironment){
 const ios=/iPad|iPhone|iPod/i.test(environment.userAgent)||(environment.platform==='MacIntel'&&environment.touchPoints>1);
 return ios&&environment.standalone;
}

export function isInstalledIosBrowser(){
 if(typeof window==='undefined'||typeof navigator==='undefined')return false;
 return isInstalledIos({userAgent:navigator.userAgent,platform:navigator.platform,touchPoints:navigator.maxTouchPoints||0,standalone:Boolean((navigator as Navigator&{standalone?:boolean}).standalone)||window.matchMedia('(display-mode: standalone)').matches});
}

export function canShareFiles(files:File[]){
 if(!files.length||typeof navigator==='undefined'||typeof navigator.share!=='function')return false;
 try{return navigator.canShare?.({files})===true;}catch{return false;}
}

/** Installed iOS web apps use the OS share sheet, avoiding Universal Link webviews. */
export const preferNativeKakaoShare=(files:File[])=>isInstalledIosBrowser()&&canShareFiles(files);
