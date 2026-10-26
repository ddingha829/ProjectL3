/** Next's internal URL can use localhost behind its public HTTP listener. */
export function requestOrigin(request:Request):string|null{
 const url=new URL(request.url),host=request.headers.get('host')||url.host;
 if(!/^[a-zA-Z0-9.:[\]-]+$/.test(host))return null;
 const forwarded=request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
 const protocol=forwarded==='http'||forwarded==='https'?forwarded+':':url.protocol;
 try{return new URL(protocol+'//'+host).origin;}catch{return null;}
}
export function sameOrigin(request:Request):boolean{
 const expected=requestOrigin(request),origin=request.headers.get('origin');
 return expected!==null&&(!origin||origin===expected)&&request.headers.get('sec-fetch-site')!=='cross-site';
}
