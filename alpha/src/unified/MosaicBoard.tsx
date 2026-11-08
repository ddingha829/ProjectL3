'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,ChevronLeft,ChevronRight,Download,Film,History,Info,Music,Plus,ArrowRight,Sparkles,Layers,BarChart3,Calendar,Castle,X} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import type {Circle,Person} from '@/social/model';
import type {UnifiedLog,UnifiedState} from './store';
import {configureCloud} from './cloudRepository';
import {collectKingdom,KINGDOM_KINDS,KINGDOM_NAMES,kingdomContributions,kingdomLevel,kingdomMonth,type KingdomArea,type KingdomMonth} from './kingdom';
import KingdomScene from './KingdomScene';
import CollectionTaste from './CollectionTaste';
import './Kingdom.css';

type Props={onCompose?:()=>void;state:UnifiedState;logs:UnifiedLog[];scope:string;actor:Person;circle?:Circle;focusLogId?:string;commit:(update:(state:UnifiedState)=>UnifiedState)=>boolean;onOpen:(log:UnifiedLog)=>void;cloud?:boolean};
export default function MosaicBoard({state,logs,scope,actor,circle,onCompose,onOpen,cloud=false}:Props){
 const [now,setNow]=useState(Date.now),[selectedMonth,setSelectedMonth]=useState(''),[area,setArea]=useState<KingdomArea|null>(null),[rules,setRules]=useState(false),[history,setHistory]=useState(false),[page,setPage]=useState(0),[archives,setArchives]=useState<KingdomMonth[]>([]),[archiveError,setArchiveError]=useState(false),[retry,setRetry]=useState(0),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[growing,setGrowing]=useState<KingdomArea[]>([]);
 const [guide,setGuide]=useState(false);const dismissGuide=()=>{setGuide(false);try{localStorage.setItem('ticgle:kingdom-guide-v2-seen','1');}catch{}};useEffect(()=>{try{setGuide(!localStorage.getItem('ticgle:kingdom-guide-v2-seen'));}catch{}},[]);
 const scene=useRef<HTMLDivElement>(null),previous=useRef<{key:string;levels:number[]}|null>(null);
 const month=kingdomMonth(now),members=scope==='mine'?1:Math.max(1,circle?.members.length||1);
 const people=state.people.filter(p=>scope==='mine'?p.id===actor.id:circle?.members.includes(p.id));
 const live=useMemo(()=>collectKingdom(logs,month,members,people,now),[logs,month,members,JSON.stringify(people),now]);
 const archived=selectedMonth&&selectedMonth!==month?archives.find(a=>a.month===selectedMonth):undefined,data=archived||live;
 const current=data.month===month;
 const contributions=kingdomContributions(data,area||'castle'),records=data.records.filter(r=>!area||area==='castle'||r.kind===area),pages=Math.max(1,Math.ceil(records.length/9));
 const areaStats=kingdomLevel(data.counts[area||'castle'],data.members,area||'castle');
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);const visible=()=>{if(!document.hidden)setNow(Date.now());};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',visible);};},[]);
 useEffect(()=>{setPage(0);},[area,data.month]);
 useEffect(()=>{setPage(p=>Math.min(p,pages-1));},[pages]);
 useEffect(()=>{
  if(!cloud)return;let active=true;setArchiveError(false);
  void configureCloud().then(async client=>{if(!client)throw Error();const {data:result,error}=await client.rpc('l2u_kingdom_archive',{p_group:scope==='mine'?null:scope});if(error)throw error;if(active)setArchives(result?.months||[]);}).catch(()=>{if(active)setArchiveError(true);});return()=>{active=false;};
 },[cloud,scope,month,retry]);
 useEffect(()=>{
  const key=`${actor.id}:${scope}:${month}`,areas:KingdomArea[]=['castle',...KINGDOM_KINDS],levels=areas.map(k=>kingdomLevel(live.counts[k],members,k).level);
  let old=previous.current?.key===key?previous.current.levels:undefined;
  if(!old)try{const stored=JSON.parse(sessionStorage.getItem('ticgle:kingdom:'+key)||'null');if(Array.isArray(stored)&&stored.length===4)old=stored;}catch{}
  previous.current={key,levels};try{sessionStorage.setItem('ticgle:kingdom:'+key,JSON.stringify(levels));}catch{}
  const changes=old?areas.filter((_,i)=>levels[i]>old![i]):[];
  if(changes.length){setGrowing(changes);const timer=setTimeout(()=>setGrowing([]),2600);return()=>clearTimeout(timer);}
 },[actor.id,scope,month,members,live.counts.castle,live.counts.movie,live.counts.book,live.counts.music]);
 const saveSnapshot=async()=>{if(!scene.current||saving)return;setSaving(true);setMessage('');try{const {toBlob}=await import('html-to-image');const blob=await toBlob(scene.current,{pixelRatio:2,backgroundColor:'#e9e4d5',skipFonts:true,filter:node=>!(node instanceof HTMLElement&&node.dataset.snapshotExclude==='true')});if(!blob)throw Error();const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`ticgle-${data.month}-kingdom.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setMessage('기념 이미지를 저장했어요.');}catch{setMessage('이미지를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');}finally{setSaving(false);}};
 const openArea=(value:KingdomArea)=>{setArea(value);setPage(0);};
 return <section className="kg-shell">
  <header className="kg-header"><div><h1>{scope==='mine'?'나의':circle?.name||'우리'} 취향 왕국</h1></div><div><button type="button" aria-label="지난달 왕국 보기" onClick={()=>setHistory(true)}><History size={19}/></button><button type="button" aria-label="왕국 성장 안내" onClick={()=>setRules(true)}><Info size={19}/></button></div></header>
  <div className="kg-canvas" ref={scene}>
   <div className="kg-season"><span>{data.month.replace('-','.')}{!current&&<b>월말 기념 기록</b>}</span><span>{data.members}명</span></div>
   <KingdomScene data={data} onArea={openArea} growing={current?growing:[]}/>
  </div>
  {(growing.length>0||message)&&<p className="kg-celebration" role="status">{growing.length&&current?growing.map(k=>KINGDOM_NAMES[k]).join(' · ')+'이 자랐어요!':message}</p>}
  <div className="kg-bottom"><button type="button" className="kg-save" onClick={()=>void saveSnapshot()} disabled={saving}><Download size={17}/>{saving?'저장 중':'기념 사진 저장'}</button></div>

  <AccessibleDialog open={!!area} title={area?KINGDOM_NAMES[area]:''} onClose={()=>setArea(null)} panelClassName="kg-dialog" scrollBody>
   <div className="kg-detail-preview"><img src={`/images/kingdom/${area||'castle'}-lv${areaStats.level}.png`} alt=""/><p>{areaStats.level===7?'최고 레벨에 도달했어요':`다음 레벨까지 ${areaStats.step-areaStats.xp} XP`}</p></div><div className="kg-detail-head"><span>{data.month} · Lv.{areaStats.level}</span><b>{data.counts[area||'castle']} XP</b></div>
   <h3>{area==='castle'?'종합 구성원 기여도 (마을별 누적 비중)':KINGDOM_NAMES[area||'castle']+' 기여도'}</h3>{area==='castle'&&<div className="kg-legend">{KINGDOM_KINDS.map(k=><span key={k}><i style={{background:({movie:'#c9563c',book:'#4f6f56',music:'#6d597a'})[k]}}/>{KINGDOM_NAMES[k]}</span>)}</div>}<ol className="kg-contributors">{contributions.map(p=><li key={p.id}><span>{p.name==='나'?'나':p.name}</span><div className="kg-contribution-track">{area==='castle'?KINGDOM_KINDS.map(k=><i key={k} aria-label={`${KINGDOM_NAMES[k]} ${p.byKind[k]} XP`} style={{width:`${data.counts.castle?p.byKind[k]/data.counts.castle*100:0}%`,background:({movie:'#c9563c',book:'#4f6f56',music:'#6d597a'})[k]}}/>):<i style={{width:`${data.counts[area||'castle']?p.count/data.counts[area||'castle']*100:0}%`,background:({movie:'#c9563c',book:'#4f6f56',music:'#6d597a',castle:'#3d526b'})[area||'castle']}}/>}</div><b>{p.count}<small> XP{area!=='castle'?` (${data.counts[area||'castle']?Math.round(p.count/data.counts[area||'castle']*100):0}%)`:''}</small></b></li>)}</ol>
   <div className="kg-record-heading"><h3>{area==='castle'?'모인 작품 보드':KINGDOM_NAMES[area||'castle'].replace(' 마을','')+' 작품 보드'} <span>{records.length}</span></h3><span>날짜순 (최신순)</span></div>
   {records.length?<div className="kg-record-grid">{records.slice(page*9,page*9+9).map(r=>{const log=logs.find(l=>l.id===r.id),Icon=r.kind==='book'?BookOpen:r.kind==='music'?Music:Film;return <button key={r.id} type="button" onClick={()=>{if(log){setArea(null);onOpen(log);}}} disabled={!log} aria-label={`${r.title} · ${data.people.find(p=>p.id===r.authorId)?.name||'이전 모임원'}${!log?' · 보관된 기록':''}`}><span className="kg-record-art">{r.image?<img src={r.image.startsWith('/api/music/cover?')?r.image+'&v=2':r.image} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/>:null}<Icon size={24} aria-hidden="true"/><span className="kg-record-genre"><Icon size={12}/></span><time className="kg-record-date">{new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit'}).format(r.createdAt).replace('/','.')}</time></span><strong>{r.title}</strong></button>;})}</div>:<div className="kg-empty"><p>첫 작품을 기다리는 마을이에요.</p><button type="button" onClick={()=>{setArea(null);onCompose?.();}}>작품 남기기</button></div>}
   {pages>1&&<nav className="kg-pagination" aria-label="작품 페이지"><button type="button" aria-label="이전 작품" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/></button><span>{page+1} / {pages}</span><button type="button" aria-label="다음 작품" disabled={page===pages-1} onClick={()=>setPage(p=>p+1)}><ChevronRight size={18}/></button></nav>}
  </AccessibleDialog>
  <AccessibleDialog open={rules} title="작품으로 자라나는 취향 왕국" onClose={()=>setRules(false)} panelClassName="kg-dialog" scrollBody><div className="kg-evolution">{[1,4,7].map((n,i)=><div key={n}><img src={`/images/kingdom/castle-lv${n}.png`} alt=""/><b>Lv.{n} {['시작','확장','MAX'][i]}</b>{i<2&&<ArrowRight size={15}/>}</div>)}</div><div className="kg-rule-cards">{[{Icon:Sparkles,title:'따로 넣지 않아도 자동으로 모여요',text:'영화·책·음악 티끌을 남기면 마을과 중앙 왕성에 1 XP가 자동 적립돼요.'},{Icon:Layers,title:'모임 인원수에 맞춰 건물이 늘어나요',text:`현재 ${members}명 기준, 마을은 ${members}개마다(최대 ${members*6} XP), 왕성은 합산 ${members*2}개마다(최대 ${members*12} XP) 성장해요. 같은 사람·같은 작품은 월 1회, 다른 멤버는 각자 1 XP를 인정해요.`},{Icon:BarChart3,title:'성·마을을 탭해 기여도와 작품 확인',text:'구성원별 기여도 그래프와 이번 달 모인 작품을 날짜순 보드로 볼 수 있어요.'},{Icon:Calendar,title:'매월 1일 새 출발 · 월말 기록 보관',text:'한국 시간 0시에 새 왕국이 열려요. 지난달 모습은 연대기와 기념 사진으로 간직해요. 원본 티끌도 남아요.'}].map(({Icon,title,text})=><div key={title}><Icon size={21} strokeWidth={1.7}/><section><h3>{title}</h3><p>{text}</p></section></div>)}</div><button className="kg-guide-done" onClick={()=>{setRules(false);dismissGuide();}}>확인했어요</button><small>Artwork · Kenney (www.kenney.nl) · CC0</small></AccessibleDialog>
  <AccessibleDialog open={history} title="우리 왕국의 연대기" onClose={()=>setHistory(false)} panelClassName="kg-dialog" scrollBody><div className="kg-history"><button type="button" onClick={()=>{setSelectedMonth('');setHistory(false);}}><strong>{month} 왕국</strong><span>현재 · {live.counts.castle} XP</span></button>{archives.map(a=><button type="button" key={a.month} onClick={()=>{setSelectedMonth(a.month);setHistory(false);}}><strong>{a.month} 왕국</strong><span>Lv.{kingdomLevel(a.counts.castle,a.members,'castle').level} · {a.counts.castle} XP</span></button>)}{!archives.length&&!archiveError&&<p>첫 월말의 왕국이 이곳에 남을 거예요.</p>}{archiveError&&<p role="status">지난 기록을 불러오지 못했어요. <button type="button" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</button></p>}</div></AccessibleDialog>
 </section>;
}
