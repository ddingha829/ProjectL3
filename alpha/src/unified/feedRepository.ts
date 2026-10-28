import type {SupabaseClient} from '@supabase/supabase-js';
import {hydrateSnapshot,type Snapshot} from './cloudRepository';
import type {UnifiedLog} from './store';
export const FEED_PAGE_SIZE=4;
export type FeedCursor={date:string;id:string};
export type FeedQuery={scope:string;category:string;query:string;sort:'recent'|'old';photosOnly:boolean;saved:boolean};
type LogRow={id:string;author_id:string;revision:number;created_at:string;payload:UnifiedLog};
const columns='id,author_id,revision,created_at,payload';
const checked=<T>(result:{data:T|null;error:unknown}):T=>{if(result.error)throw result.error;return result.data as T;};
const literal=(value:string)=>`"*${value.replace(/[\\"]/g,'\\$&')}*"`;
export function applyFeedQuery(client:SupabaseClient,actorId:string,query:FeedQuery,cursor?:FeedCursor){
 const join=(query.scope==='mine'?'':',scopeShares:l2u_shares!inner(group_id)')+(query.saved?',saved:l2u_reactions!inner(user_id,kind)':'');
 let request=client.from('l2u_logs').select(columns+join);
 request=query.scope==='mine'?request.eq('author_id',actorId):request.eq('scopeShares.group_id',query.scope);
 if(query.saved)request=request.eq('saved.user_id',actorId).eq('saved.kind','bookmark');
 if(query.category!=='all')request=request.eq('payload->>category',query.category);
 if(query.photosOnly)request=request.or('payload->>image.neq.,payload->>imagePath.neq.');
 const search=query.query.trim();if(search){const term=literal(search);request=request.or(['title','body','locationLabel'].map(key=>`payload->>${key}.ilike.${term}`).concat(`payload->place->>name.ilike.${term}`).join(','));}
 const ascending=query.sort==='old';
 if(cursor){const op=ascending?'gt':'lt';request=request.or(`created_at.${op}.${cursor.date},and(created_at.eq.${cursor.date},id.${op}.${cursor.id})`);}
 return request.order('created_at',{ascending}).order('id',{ascending}).limit(FEED_PAGE_SIZE);
}
async function expandRows(client:SupabaseClient,rows:LogRow[]):Promise<UnifiedLog[]>{
 if(!rows.length)return [];
 const ids=rows.map(row=>row.id),[shares,reactions,comments]=await Promise.all([
  client.from('l2u_shares').select('log_id,group_id').in('log_id',ids),
  client.from('l2u_reactions').select('log_id,user_id,kind').in('log_id',ids),
  client.from('l2u_comments').select('id,log_id,author_id,body,created_at').in('log_id',ids).order('created_at'),
 ]);
 const s=checked(shares),r=checked(reactions),c=checked(comments);
 return rows.map(row=>({...row.payload,id:row.id,authorId:row.author_id,serverRevision:row.revision,circleIds:s.filter(s=>s.log_id===row.id).map(s=>s.group_id),likes:r.filter(r=>r.log_id===row.id&&r.kind==='like').map(r=>r.user_id),bookmarks:r.filter(r=>r.log_id===row.id&&r.kind==='bookmark').map(r=>r.user_id),comments:c.filter(c=>c.log_id===row.id).map(c=>({id:c.id,authorId:c.author_id,body:c.body}))}));
}
export async function fetchFeedPage(client:SupabaseClient,actorId:string,query:FeedQuery,cursor?:FeedCursor){
 const rows=checked(await applyFeedQuery(client,actorId,query,cursor)) as unknown as LogRow[];
 const logs=await expandRows(client,rows),last=rows.at(-1);
 const snapshot:Snapshot={actorId,people:[],circles:[],logs,preferences:null,placements:[]};
 return {logs:(await hydrateSnapshot(client,snapshot)).logs,cursor:last?{date:last.created_at,id:last.id}:undefined,hasMore:rows.length===FEED_PAGE_SIZE};
}
/** RLS-protected context plus only previously opened rows (four on first load).
 * Full snapshots are reserved for maps, calendars, collections and exports. */
export async function fetchFeedState(client:SupabaseClient,actorId:string,loadedIds:string[]=[]){
 let people=checked(await client.from('l2u_profiles').select('id,name,color'));
 if(!people.some(p=>p.id===actorId)){checked(await client.rpc('l2u_apply',{p_operations:[],p_operation_id:crypto.randomUUID()}));people=checked(await client.from('l2u_profiles').select('id,name,color'));}
 const [groups,members,prefs,placements,latest,loaded]=await Promise.all([
  client.from('l2u_groups').select('id,name,capacity,owner_id,revision'),client.from('l2u_members').select('group_id,user_id,active'),
  client.from('l2u_preferences').select('payload,revision').eq('user_id',actorId).maybeSingle(),
  client.from('l2u_mosaic').select('log_id,group_id,slot_index,placed_by,placed_at'),
  client.from('l2u_logs').select(columns).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(FEED_PAGE_SIZE),
  loadedIds.length?client.from('l2u_logs').select(columns).in('id',loadedIds):Promise.resolve({data:[],error:null}),
 ]);
 const records=[...new Map([...checked(loaded),...checked(latest)].map(row=>[row.id,row])).values()] as LogRow[];
 const rows=checked(members),snapshot:Snapshot={actorId,people,circles:checked(groups).map(g=>({id:g.id,name:g.name,description:'',capacity:g.capacity,ownerId:g.owner_id,revision:g.revision,members:rows.filter(m=>m.group_id===g.id&&m.active).map(m=>m.user_id)})),preferences:checked(prefs),logs:await expandRows(client,records),placements:checked(placements).map(p=>({logId:p.log_id,scope:p.group_id,slotIndex:p.slot_index,placedBy:p.placed_by,placedAt:Date.parse(p.placed_at)}))};
 return {...await hydrateSnapshot(client,snapshot),recordsComplete:false};
}
