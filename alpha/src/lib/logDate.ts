import type { ArchiveItem } from '@/types/l2';
export const validExperienceTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= -2208988800000 && value <= 253402268399999;
export const experienceTime = (item: Pick<ArchiveItem,'timestamp'|'occurredAt'>) => validExperienceTime(item.occurredAt) ? item.occurredAt : item.timestamp;
export const experienceDate = (item: Pick<ArchiveItem,'timestamp'|'occurredAt'|'date'>) => validExperienceTime(item.occurredAt) ? new Date(item.occurredAt).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}).slice(2).replaceAll('-','.') : item.date;
export const dateTimeInput = (time: number | null | undefined) => validExperienceTime(time) ? new Date(time+9*3600000).toISOString().slice(0,16) : '';
export function parseExperienceInput(value:string): number | null {
  if(!value)return null;
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('날짜와 시간을 확인해 주세요.');
  const time=Date.parse(value+'+09:00');
  if(!validExperienceTime(time)||dateTimeInput(time)!==value)throw new Error('날짜와 시간을 확인해 주세요.');
  return time;
}
