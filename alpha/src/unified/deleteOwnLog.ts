import type {UnifiedState} from './store';
/** Remove only the owner's original and its local collection/board references. */
export function deleteOwnLog(state:UnifiedState,id:string,actorId:string):UnifiedState{
 if(!state.logs.some(log=>log.id===id&&log.authorId===actorId))return state;
 return {...state,logs:state.logs.filter(log=>log.id!==id),collections:state.collections.map(c=>({...c,logIds:c.logIds.filter(value=>value!==id)})),mosaic:{
  personalBoard:Object.fromEntries(Object.entries(state.mosaic.personalBoard).filter(([,value])=>value!==id)),
  groupBoards:Object.fromEntries(Object.entries(state.mosaic.groupBoards).map(([group,board])=>[group,Object.fromEntries(Object.entries(board).filter(([,value])=>value.logId!==id))])),
 }};
}
