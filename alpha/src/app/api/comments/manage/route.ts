import {notificationUser,notificationAdmin} from '@/server/notificationRuntime';
import {handleCommentManagement} from '@/server/commentManagement';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let caller:Awaited<ReturnType<typeof notificationUser>>=null;
 return handleCommentManagement(request,{
  user:async r=>{caller=await notificationUser(r);return caller;},
  read:async(id,logId)=>{if(!caller)return null;const result=await caller.client.from('l2u_comments').select('id,log_id,author_id,body').eq('id',id).eq('log_id',logId).maybeSingle();if(result.error)throw result.error;return result.data;},
  write:async(id,logId,userId,expected,body)=>{const table=notificationAdmin().from('l2u_comments'),query=body===null?table.delete():table.update({body});const result=await query.eq('id',id).eq('log_id',logId).eq('author_id',userId).eq('body',expected).select('id');if(result.error)throw result.error;return result.data?.length===1;},
 });
}
