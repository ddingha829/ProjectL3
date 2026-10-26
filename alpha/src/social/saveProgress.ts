import {countDongLogs,loadDongBoundaries} from './adminDong';
import type {LabLog} from './model';

export type SaveReceipt={log:LabLog;audienceName:string|null;groupLogs:LabLog[]};
export type SavedDongProgress={code:string;name:string;before:number;after:number;beforeStrength:number;afterStrength:number};

// The caller creates a receipt only after durable local storage succeeds.
// This optional lookup must never block or roll back the saved log.
export async function savedDongProgress(receipt:SaveReceipt):Promise<SavedDongProgress|null>{
 const {log}=receipt;
 if(!log.circleId||!log.place)return null;
 const group=receipt.groupLogs.filter(entry=>entry.circleId===log.circleId);
 const boundaries=await loadDongBoundaries(group);
 const after=countDongLogs(group,boundaries).dongs.find(dong=>dong.logIds.includes(log.id));
 if(!after)return null;
 const before=countDongLogs(group.filter(entry=>entry.id!==log.id),boundaries).dongs.find(dong=>dong.feature.properties.code===after.feature.properties.code)?.count||0;
 return {code:after.feature.properties.code,name:after.feature.properties.label,before,after:after.count,beforeStrength:Math.min(4,before)*100,afterStrength:after.level*100};
}
