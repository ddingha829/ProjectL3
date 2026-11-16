/** Use the persisted server timestamp; never invent dates for legacy demo rows. */
export function commentTime(createdAt:number|undefined,now=Date.now()){
 if(typeof createdAt!=='number'||!Number.isFinite(createdAt)||createdAt<=0||!Number.isFinite(new Date(createdAt).getTime()))return null;
 const date=new Date(createdAt),zone='Asia/Seoul',year=(value:number)=>new Intl.DateTimeFormat('en',{timeZone:zone,year:'numeric'}).format(value);
 const base:Intl.DateTimeFormatOptions={timeZone:zone,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'};
 return {dateTime:date.toISOString(),label:new Intl.DateTimeFormat('ko-KR',{...base,...(year(createdAt)!==year(now)?{year:'numeric'}:{})}).format(date),full:new Intl.DateTimeFormat('ko-KR',{...base,year:'numeric'}).format(date)};
}
