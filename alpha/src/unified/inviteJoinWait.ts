/** Bound UI waiting even when session retrieval or the request never settles.
 * A timeout is an unknown outcome, not proof that membership was rejected. */
export async function waitForInviteJoin<T>(request:()=>Promise<T>,timeoutMs=15000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve().then(request),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('참여 결과를 확인하는 데 시간이 오래 걸려요. 모임 목록을 확인하거나 다시 시도해주세요. 중복으로 가입되지는 않아요.')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
