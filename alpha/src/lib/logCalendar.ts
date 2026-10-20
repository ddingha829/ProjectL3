import type { ArchiveItem } from '@/types/l2';
export const LOG_TIME_ZONE = 'Asia/Seoul';
const dayFormat = new Intl.DateTimeFormat('sv-SE', {timeZone:LOG_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
const timeFormat = new Intl.DateTimeFormat('ko-KR', {timeZone:LOG_TIME_ZONE,hour:'2-digit',minute:'2-digit',hour12:false});
const validTimestamp=(value:number)=>Number.isFinite(value)&&value>0&&value<=253402268399999;
export const logDay = (item:Pick<ArchiveItem,'timestamp'>) => validTimestamp(item.timestamp) ? dayFormat.format(new Date(item.timestamp)) : '';
export const logTime = (item:Pick<ArchiveItem,'timestamp'>) => validTimestamp(item.timestamp) ? timeFormat.format(new Date(item.timestamp)) : '시간 미상';
export const todayKey = () => dayFormat.format(new Date());
export function validDay(value:string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && value <= '9999-12-31' && !Number.isNaN(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value; }
export function shiftMonth(month:string,delta:number) { const [year,m]=month.split('-').map(Number),date=new Date(Date.UTC(year,m-1+delta,1));return date.toISOString().slice(0,7); }
export function monthCells(month:string) {
  const [year,m]=month.split('-').map(Number),offset=new Date(Date.UTC(year,m-1,1)).getUTCDay(),last=new Date(Date.UTC(year,m,0)).getUTCDate();
  return Array.from({length:Math.ceil((offset+last)/7)*7},(_,index)=>index<offset||index>=offset+last?'':`${month}-${String(index-offset+1).padStart(2,'0')}`);
}
export function calendarLogs(items:ArchiveItem[]) { return items.filter(item=>item.cat!=='GROUP'&&item.kind!=='group'&&Boolean(logDay(item))).sort((a,b)=>a.timestamp-b.timestamp||a.id.localeCompare(b.id)); }
export interface CalendarView { month:string; start:string; end:string; timelineOpen:boolean }
export const initialCalendarView = ():CalendarView => ({month:todayKey().slice(0,7),start:'',end:'',timelineOpen:false});
