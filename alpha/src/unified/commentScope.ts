import type {LabLog} from '@/social/model';
export function commentGroup(log:LabLog,comment:LabLog['comments'][number]):string|null{
 if(comment.groupId!==undefined)return comment.groupId;
 // Match the conservative legacy migration: only a single share is unambiguous.
 const groups=log.circleIds??(log.circleId?[log.circleId]:[]);return groups.length===1?groups[0]:null;
}
export function commentsInScope<T extends LabLog>(log:T,scope:string):T{
 const group=scope==='mine'?null:scope;
 return {...log,comments:log.comments.filter(comment=>commentGroup(log,comment)===group)};
}
