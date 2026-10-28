'use client';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import type { ArchiveItem } from '@/types/l2';
import { calendarLogs, logDay, logTime, monthCells, shiftMonth, todayKey, validDay, type CalendarView } from '@/lib/logCalendar';
import { getArchiveCategory } from '@/lib/archiveCategories';
import { isGeoPoint } from '@/lib/mapLocations';
import { allowsMotion } from '@/lib/motion';
import AccessibleDialog from './AccessibleDialog';
import './LogCalendar.css';
import MapEntrance from './MapEntrance';
const LogbookMap=dynamic(()=>import('./LogbookMap'),{ssr:false,loading:()=> <div className="logbook-map" data-map-revealed={false} aria-busy="true" aria-label="지도 불러오는 중"><MapEntrance revealed={false}/></div>});
const shortDay=(key:string)=>`${Number(key.slice(5,7))}월 ${Number(key.slice(8))}일`;
const dayLabel=(key:string)=>`${key.slice(0,4)}년 ${shortDay(key)}`;

export default function LogCalendar({items,view,onView,onOpen,allowPageSwipe=false}:{items:ArchiveItem[];view:CalendarView;onView:(view:CalendarView)=>void;onOpen:(item:ArchiveItem)=>void;allowPageSwipe?:boolean}) {
  const logs=useMemo(()=>calendarLogs(items),[items]);
  const byDay=useMemo(()=>{const result=new Map<string,ArchiveItem[]>();for(const log of logs){const day=logDay(log),entries=result.get(day);if(entries)entries.push(log);else result.set(day,[log]);}return result;},[logs]);
  const monthLogs=useMemo(()=>logs.filter(item=>logDay(item).startsWith(view.month)),[logs,view.month]);
  const selected=useMemo(()=>view.start?logs.filter(item=>{const day=logDay(item);return day>=view.start&&day<=(view.end||view.start);}):monthLogs,[logs,view.start,view.end,monthLogs]);
  const [rangeOpen,setRangeOpen]=useState(false),[monthOpen,setMonthOpen]=useState(false),[from,setFrom]=useState(''),[to,setTo]=useState(''),[monthInput,setMonthInput]=useState(view.month),[error,setError]=useState('');
  const [closing,setClosing]=useState(false),[limit,setLimit]=useState(80);
  const closeRef=useRef<HTMLButtonElement>(null),closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),lastDayFocus=useRef('');
  const onViewRef=useRef(onView),viewRef=useRef(view);onViewRef.current=onView;viewRef.current=view;
  const title=view.start?(view.start===view.end?shortDay(view.start):`${shortDay(view.start)} — ${shortDay(view.end)}`):`${Number(view.month.slice(5))}월의 티끌`;
  const dismiss=()=>{if(closeTimer.current)clearTimeout(closeTimer.current);if(!allowsMotion()){onView({...viewRef.current,timelineOpen:false});return;}setClosing(true);closeTimer.current=setTimeout(()=>{setClosing(false);onViewRef.current({...viewRef.current,timelineOpen:false});},200);};
  const dismissRef=useRef(dismiss);dismissRef.current=dismiss;
  useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current);},[]);
  useEffect(()=>{
    if(!view.timelineOpen)return;
    setClosing(false);setLimit(80);
    const frame=requestAnimationFrame(()=>closeRef.current?.focus({preventScroll:true}));
    const escape=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('[data-dialog-overlay]')){event.preventDefault();dismissRef.current();}};
    document.addEventListener('keydown',escape);return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',escape);};
  },[view.timelineOpen,view.start,view.end]);
  useEffect(()=>{if(!view.timelineOpen&&lastDayFocus.current)document.querySelector<HTMLButtonElement>(`.calendar-day[data-day="${lastDayFocus.current}"]`)?.focus({preventScroll:true});},[view.timelineOpen]);
  const selectDay=(day:string)=>{lastDayFocus.current=day;onView({...view,start:day,end:day,timelineOpen:true});};
  const changeMonth=(month:string)=>{onView({month,start:'',end:'',timelineOpen:false});};
  const openRange=()=>{setFrom(view.start||`${view.month}-01`);setTo(view.end||`${view.month}-${String(new Date(Number(view.month.slice(0,4)),Number(view.month.slice(5)),0).getDate()).padStart(2,'0')}`);setError('');setRangeOpen(true);};
  const applyRange=()=>{if(!validDay(from)||!validDay(to)){setError('시작일과 종료일을 확인해 주세요.');return;}const [start,end]=[from,to].sort();setRangeOpen(false);onView({month:start.slice(0,7),start,end,timelineOpen:true});};
  const keyboard=(event:KeyboardEvent<HTMLDivElement>)=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-day]');if(!button)return;
    const delta=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7} as Record<string,number>)[event.key];if(!delta)return;
    const date=new Date(button.dataset.day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+delta);const day=date.toISOString().slice(0,10);if(!validDay(day))return;
    event.preventDefault();if(!day.startsWith(view.month))changeMonth(day.slice(0,7));requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`.calendar-day[data-day="${day}"]`)?.focus());
  };
  return <section className="log-calendar" aria-label="티끌캘린더" data-no-swipe={!allowPageSwipe||view.timelineOpen||undefined}>
    <div className="calendar-panel">
      <div className="calendar-board" inert={view.timelineOpen}>
        <div className="calendar-heading"><button type="button" className="calendar-month" aria-label="연월 선택" onClick={()=>{setMonthInput(view.month);setMonthOpen(true);}}><strong>{view.month.replace('-','. ')}</strong><ChevronDown size={15}/></button><div className="calendar-month-arrows"><button type="button" aria-label="이전 달" disabled={view.month==='1900-01'} onClick={()=>changeMonth(shiftMonth(view.month,-1))}><ChevronLeft size={20}/></button><button type="button" className="calendar-range-button" aria-label="기간 선택" title="기간 선택" onClick={openRange}><CalendarRange size={18}/></button><button type="button" aria-label="다음 달" disabled={view.month==='9999-12'} onClick={()=>changeMonth(shiftMonth(view.month,1))}><ChevronRight size={20}/></button></div></div>
        <div className="calendar-weekdays" aria-hidden="true">{['일','월','화','수','목','금','토'].map(day=><span key={day}>{day}</span>)}</div>
        <div className="calendar-days" role="group" aria-label={`${view.month} 날짜 선택`} onKeyDown={keyboard}>{monthCells(view.month).map((day,index)=>{
          if(!day)return <span key={`blank-${index}`} aria-hidden="true"/>;
          const entries=byDay.get(day)||[],photo=[...entries].reverse().find(item=>item.img&&item.hasPhoto!==false),chosen=Boolean(view.start&&day>=view.start&&day<=view.end);
          return <button type="button" key={day} data-day={day} className={`calendar-day ${photo?'has-photo':''} ${entries.length?'has-logs':''} ${day===todayKey()?'is-today':''}`} aria-label={`${dayLabel(day)} · 티끌 ${entries.length}개`} aria-pressed={chosen} onClick={()=>selectDay(day)}><span className="calendar-day-art" aria-hidden="true">{photo?<img src={photo.img} alt="" loading="lazy" onError={event=>{event.currentTarget.style.visibility='hidden';event.currentTarget.closest('.calendar-day')?.classList.remove('has-photo');}}/>:entries.length?<i/>:null}<b>{Number(day.slice(8))}</b></span>{entries.length>1&&<small aria-hidden="true">{entries.length}</small>}</button>;
        })}</div>
      </div>
      {view.timelineOpen&&<section className={`calendar-timeline ${closing?'is-closing':''}`} role="dialog" aria-modal="false" aria-label={`${title} 시간순 티끌`}>
        <header><div><small>{view.start.slice(0,4)}</small><h2>{title}</h2><p>{selected.length}개의 티끌 · {selected.filter(item=>isGeoPoint(item.coordinates)).length}개의 장소</p></div><button type="button" ref={closeRef} aria-label="캘린더로 돌아가기" onClick={dismiss}><X size={21}/></button></header>
        <div className="calendar-timeline-scroll">{selected.length?<ol>{selected.slice(0,limit).map((item,index)=>{
          const day=logDay(item),newDay=index===0||logDay(selected[index-1])!==day;
          return <li key={item.id} style={{'--entry-index':Math.min(index,10)} as React.CSSProperties}>{newDay&&<h3>{shortDay(day)}</h3>}<button type="button" className="calendar-timeline-log" onClick={()=>onOpen(item)} aria-label={`${logTime(item)} ${item.title} 티끌 열기`}><time>{logTime(item)}</time><span className="calendar-timeline-photo" aria-hidden="true">{item.img&&item.hasPhoto!==false?<img src={item.img} alt="" loading="lazy" onError={event=>event.currentTarget.style.visibility='hidden'}/>:<CalendarDays size={20}/>}</span><span className="calendar-timeline-copy"><small>{getArchiveCategory(item.cat).label}</small><strong>{item.title}</strong>{(item.addressShort||item.loc)&&<span><MapPin size={11}/>{item.addressShort||item.loc}</span>}</span><ArrowUpRight size={16}/></button></li>;
        })}</ol>:<div className="calendar-no-logs"><CalendarDays size={28}/><strong>아직 남긴 티끌이 없어요</strong><p>다른 날짜나 기간을 골라보세요.</p></div>}{selected.length>limit&&<button type="button" className="calendar-load-more" onClick={()=>setLimit(value=>value+80)}>티끌 더 보기 · {selected.length-limit}개</button>}</div>
        <footer><button type="button" onClick={openRange}>기간 변경</button></footer>
      </section>}
    </div>
    <div className="calendar-map-panel"><LogbookMap items={selected} onOpen={onOpen} route/></div>
    <AccessibleDialog open={rangeOpen} onClose={()=>setRangeOpen(false)} title="기간으로 티끌 보기"><form className="calendar-range-form" onSubmit={event=>{event.preventDefault();applyRange();}}><label>시작일<input type="date" min="1900-01-01" max="9999-12-31" value={from} onChange={event=>setFrom(event.target.value)} required/></label><label>종료일<input type="date" min="1900-01-01" max="9999-12-31" value={to} onChange={event=>setTo(event.target.value)} required/></label>{error&&<p role="alert">{error}</p>}<button type="submit" className="test-button primary">이 기간 펼쳐보기</button></form></AccessibleDialog>
    <AccessibleDialog open={monthOpen} onClose={()=>setMonthOpen(false)} title="보고 싶은 달"><form className="calendar-range-form" onSubmit={event=>{event.preventDefault();if(validDay(monthInput+'-01')){changeMonth(monthInput);setMonthOpen(false);}}}><label>연월<input type="month" min="1900-01" max="9999-12" value={monthInput} onChange={event=>setMonthInput(event.target.value)} required/></label><button type="submit" className="test-button primary">이 달 보기</button><div className="calendar-month-shortcuts"><button type="button" onClick={()=>{const today=todayKey();setMonthOpen(false);onView({month:today.slice(0,7),start:today,end:today,timelineOpen:true});}}>오늘</button><button type="button" aria-label="이번 달 전체 티끌 보기" onClick={()=>{if(!validDay(monthInput+'-01'))return;setMonthOpen(false);onView({month:monthInput,start:`${monthInput}-01`,end:`${monthInput}-${String(new Date(Number(monthInput.slice(0,4)),Number(monthInput.slice(5)),0).getDate()).padStart(2,'0')}`,timelineOpen:true});}}>월 전체 <ArrowUpRight size={13}/></button></div></form></AccessibleDialog>
  </section>;
}
