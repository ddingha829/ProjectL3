type User={id:string};
type Row={id:string;log_id:string;author_id:string;body:string};
export type CommentManagementRuntime={user:(r:Request)=>Promise<User|null>;read:(id:string,logId:string,user:User)=>Promise<Row|null>;write:(id:string,logId:string,userId:string,expected:string,body:string|null)=>Promise<boolean>};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
/** Read through the caller's RLS, then condition the write on owner and prior text. */
export async function handleCommentManagement(request:Request,runtime:CommentManagementRuntime){
 try{
  const user=await runtime.user(request);if(!user)return reply({error:'로그인한 뒤 다시 시도해주세요.'},401);
  const reader=request.body?.getReader();if(!reader)return reply({error:'댓글을 확인해주세요.'},400);
  const chunks:Uint8Array[]=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4000){await reader.cancel();return reply({error:'댓글이 너무 길어요.'},413);}chunks.push(part.value);}
  const body=JSON.parse(await new Blob(chunks as BlobPart[]).text());
  if(!uuid(body.id)||!uuid(body.logId)||!['edit','delete'].includes(body.action)||typeof body.expected!=='string'||body.expected.length>200||body.action==='edit'&&(typeof body.body!=='string'||!body.body.trim()||Array.from(body.body.trim()).length>200))return reply({error:'댓글은 1~200자로 입력해주세요.'},400);
  const row=await runtime.read(body.id,body.logId,user);
  if(!row||row.author_id!==user.id)return reply({error:'본인이 작성한 댓글만 수정하거나 삭제할 수 있어요.'},403);
  if(row.body!==body.expected)return reply({error:'댓글이 변경됐어요. 최신 내용을 확인한 뒤 다시 시도해주세요.'},409);
  if(!await runtime.write(body.id,body.logId,user.id,row.body,body.action==='delete'?null:body.body.trim()))return reply({error:'댓글이 변경됐어요. 다시 불러와주세요.'},409);
  return reply({ok:true});
 }catch(error){return error instanceof SyntaxError?reply({error:'댓글 내용을 확인해주세요.'},400):reply({error:'댓글을 저장하지 못했어요. 잠시 후 다시 시도해주세요.'},503);}
}
