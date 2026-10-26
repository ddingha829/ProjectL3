import type {Circle,LabState} from './model';

export const MEMBER_LIMIT=8;
// Browser-only workflow rules. These do not authenticate a real user.
// Legacy demo circles used their first member as the creator.
export const circleOwner=(circle:Circle)=>circle.ownerId||circle.members[0];
export const isCircleOwner=(circle:Circle,actorId:string)=>circle.members.includes(actorId)&&circleOwner(circle)===actorId;

export function requestDemoJoin(state:LabState,circleId:string,ownerId:string):LabState{
 const circle=state.circles.find(c=>c.id===circleId);
 if(!circle||!isCircleOwner(circle,ownerId))throw new Error('모임장만 초대 테스트를 진행할 수 있어요.');
 if(circle.members.includes('guest')||circle.pending?.includes('guest'))return state;
 if(circle.members.length>=MEMBER_LIMIT)throw new Error('모임은 최대 8명까지 함께할 수 있어요.');
 return {...state,people:state.people.some(p=>p.id==='guest')?state.people:[...state.people,{id:'guest',name:'다온',initial:'D',color:'#a18a51',note:'오늘부터 함께 기록해요'}],circles:state.circles.map(c=>c.id===circleId?{...c,pending:[...(c.pending||[]),'guest']}:c)};
}

export function decideDemoJoin(state:LabState,circleId:string,actorId:string,personId:string,approve:boolean,now=Date.now()):LabState{
 const circle=state.circles.find(c=>c.id===circleId);
 if(!circle||!isCircleOwner(circle,actorId))throw new Error('참여 요청은 모임장만 처리할 수 있어요.');
 if(!circle.pending?.includes(personId))return state;
 if(!state.people.some(p=>p.id===personId))throw new Error('요청한 사용자를 찾지 못했어요.');
 if(approve&&circle.members.length>=MEMBER_LIMIT)throw new Error('모임 정원이 가득 찼어요.');
 return {...state,circles:state.circles.map(c=>c.id===circleId?{...c,pending:(c.pending||[]).filter(id=>id!==personId),members:approve?[...new Set([...c.members,personId])]:c.members,joinedAt:approve?{...c.joinedAt,[personId]:now}:c.joinedAt}:c)};
}
