import type {LabLog} from '@/social/model';
export type LogComment=LabLog['comments'][number];
/** Flatten descendants to one visual indent while preserving their reply target. */
export function commentThreads(comments:readonly LogComment[]){
 const unique=[...new Map(comments.map(comment=>[comment.id,comment])).values()],byId=new Map(unique.map(comment=>[comment.id,comment]));
 const rootOf=(comment:LogComment)=>{let row=comment;const seen=new Set([row.id]);while(row.parentId&&byId.has(row.parentId)){if(seen.has(row.parentId))return comment.id;seen.add(row.parentId);row=byId.get(row.parentId)!;}return row.id;};
 const groups=new Map<string,{root:LogComment;replies:LogComment[]}>();
 for(const comment of unique){const id=rootOf(comment);if(!groups.has(id))groups.set(id,{root:byId.get(id)!,replies:[]});if(comment.id!==id)groups.get(id)!.replies.push(comment);}
 return [...groups.values()];
}
