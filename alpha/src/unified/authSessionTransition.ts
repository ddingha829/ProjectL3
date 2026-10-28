/** Supabase can announce SIGNED_IN again when the same session is recovered
 * after a tab/PWA resume. That must not tear down an already displayed sheet. */
export function shouldLoadAuthSession(event:string,mode:'login'|'demo'|'cloud',currentId:string,incomingId?:string){
 if(mode==='demo'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')return false;
 if(event==='SIGNED_IN'&&mode==='cloud'&&currentId&&incomingId===currentId)return false;
 return true;
}
