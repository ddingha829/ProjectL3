'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import dynamic from 'next/dynamic';
import {Sun,Moon,Users,ChevronDown,Plus,BookOpen,Map as MapIcon,Heart,Bookmark,MessageCircle,MapPin,ArrowUpRight,Search,Check,Lock,Settings2,ArrowRight,LogOut,Copy,RotateCcw,Sparkles,Grid2X2,List,Clapperboard,Leaf,X,Pencil,Undo2,HelpCircle,CloudUpload} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import EditorialCard,{styleOf,cardTitle} from './EditorialCard';
import CardDesignEditor from './CardDesignEditor';
import TasteShelf,{WorkDetail,CardImageActions} from './TasteShelf';
import {toggleIntent,type Work} from './taste';
import type {EditorialStyle} from './editorialStyle';
import Composer from './Composer';
import CameraComposer from './CameraComposer';
import {useComposeSwipe} from './useComposeSwipe';
import FirstUseGuide from './FirstUseGuide';
import {useLabRepository} from './useLabRepository';
import {useShareQueue} from './useShareQueue';
import {enqueuePublication,isPublished,isOutstanding,retryPublication} from './publication';
import PublicationStatus from './PublicationStatus';
import OutboxPanel from './OutboxPanel';
import './PublicationStatus.css';
import GlassNavigation from './GlassNavigation';
import MembersPanel from './MembersPanel';
import PendingMembership from './PendingMembership';
import {isCircleOwner,requestDemoJoin,decideDemoJoin} from './membership';
import LogPoster from './LogPoster';
import {editOwnLog,withdrawOwnLog} from './logEditing';
import {useBrowseMemory,type Screen} from './useBrowseMemory';
import SaveNotice from './SaveNotice';
import SlidingSegments from './SlidingSegments';
import BookmarkToggle from './BookmarkToggle';
import {savedDongProgress,type SaveReceipt,type SavedDongProgress} from './saveProgress';
import {cardView} from './cardView';
import type {DongCount} from './adminDong';
import {seedState,canRead,timeAgo,archive,CATEGORY_LABEL,type LabLog,type Person} from './model';
import './SocialLab.css';
import './SocialMaterial.css';
import './CollectionFocus.css';
import './MapPolish.css';
import './CameraComposer.css';
import './StoryWriting.css';
const ScratchMap=dynamic(()=>import('./ScratchMap'),{ssr:false,loading:()=><div className="lab-map-placeholder">지도를 펼치고 있어요</div>});
const personStyle=(person:Person)=>({'--person':person.color} as CSSProperties);
function Avatar({person,small=false}:{person:Person;small?:boolean}){return <span className={`lab-avatar ${small?'small':''}`} style={personStyle(person)} aria-hidden="true">{person.initial}</span>;}
const displayTitle=(log:LabLog)=>log.title||log.body.slice(0,30)||'사진으로 남긴 순간';
export default function SocialLab(){
 const [actorId,setActorId]=useState('me'),[circleId,setCircleId]=useState('daily'),[dark,setDark]=useState(false),[dialog,setDialog]=useState<'groups'|'members'|'profile'|'invite'|'compose'|'detail'|'concept'|'reset'|'district'|'outbox'|null>(null),[selectedId,setSelectedId]=useState(''),[selectedDong,setSelectedDong]=useState<{code:string;name:string;logIds:string[]}|null>(null),[toast,setToast]=useState(''),[composeAudience,setComposeAudience]=useState<string|null>('daily'),[comment,setComment]=useState(''),[groupName,setGroupName]=useState(''),[inviteStage,setInviteStage]=useState(0);
 const [composeWork,setComposeWork]=useState<Work>(),[workDetail,setWorkDetail]=useState<Work>(),[cardDraft,setCardDraft]=useState<EditorialStyle|null>(null);
 const cardRoot=useRef<HTMLDivElement>(null);
 const [receipt,setReceipt]=useState<SaveReceipt|null>(null),[saveProgress,setSaveProgress]=useState<SavedDongProgress|null>(null);
 const [guideActive,setGuideActive]=useState(false),[guideReplay,setGuideReplay]=useState(0);
 const {state,repository,commit,getCurrent,loadError}=useLabRepository(setToast);
 const transport=useShareQueue(repository,actorId,setToast);
 const [editing,setEditing]=useState<LabLog|null>(null),[withdrawTarget,setWithdrawTarget]=useState<LabLog|null>(null),[withdrawError,setWithdrawError]=useState('');
 const withdrawLock=useRef(false),detailOrigin=useRef<{district:boolean;scroll:number}>({district:false,scroll:0});
 const actor=state?.people.find(p=>p.id===actorId)||state?.people[0];
 const myCircles=state?.circles.filter(c=>actor&&c.members.includes(actor.id))||[];
 const circle=myCircles.find(c=>c.id===circleId)||myCircles[0];
 const owner=Boolean(circle&&actor&&isCircleOwner(circle,actor.id)),pendingCount=owner?(circle?.pending?.length||0):0;
 const browse=useBrowseMemory(actor?.id||'',circle?.id||'',Boolean(dialog||editing||withdrawTarget||workDetail||guideActive));
 const {screen,query,library,grid,mapMine,setQuery,setLibrary,setGrid,setMapMine}=browse;
 const syncDongs=useCallback((dongs:DongCount[])=>setSelectedDong(previous=>{if(!previous)return previous;const found=dongs.find(d=>d.feature.properties.code===previous.code),ids=found?.logIds||[];return previous.logIds.join('|')===ids.join('|')?previous:{...previous,logIds:ids};}),[]);
 useEffect(()=>{withdrawLock.current=false;},[withdrawTarget]);
 useEffect(()=>{document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#08080A':'#F3F1EC');},[dark]);
 useEffect(()=>{const viewport=window.visualViewport;const update=()=>{document.documentElement.style.setProperty('--lab-vvh',`${viewport?.height||innerHeight}px`);document.documentElement.style.setProperty('--lab-vvtop',`${viewport?.offsetTop||0}px`);document.documentElement.dataset.labKeyboard=(viewport?.height||innerHeight)<innerHeight-120?'open':'closed';};update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);};},[]);
 useEffect(()=>{const params=new URLSearchParams(location.search);if(params.get('compose')==='1')setDialog('compose');const tone=params.get('theme');if(tone==='light'||tone==='dark'){setDark(tone==='dark');document.documentElement.classList.toggle('light',tone==='light');}},[]);
 useEffect(()=>{try{const actor=sessionStorage.getItem('l2_social_lab_actor');if(actor)setActorId(actor);const circle=sessionStorage.getItem('l2_social_lab_circle');if(circle)setCircleId(circle);}catch{}setDark(!document.documentElement.classList.contains('light'));},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4300);return()=>clearTimeout(timer);},[toast]);

 useEffect(()=>{
  setSaveProgress(null);if(!receipt)return;
  const log=state?.logs.find(row=>row.id===receipt.log.id);if(!log||!isPublished(log))return;
  let gone=false;void savedDongProgress({...receipt,log,groupLogs:state!.logs.filter(isPublished)}).then(progress=>{if(!gone)setSaveProgress(progress);}).catch(()=>{});
  return()=>{gone=true;};
 },[receipt,state]);
 useEffect(()=>{
  if(!receipt||screen==='map')return;
  const timer=setTimeout(()=>setReceipt(null),9000);return()=>clearTimeout(timer);
 },[receipt,screen]);
 useEffect(()=>{if(receipt&&(receipt.log.authorId!==actorId||!state?.logs.some(log=>log.id===receipt.log.id)))setReceipt(null);},[actorId,state,receipt]);
 useEffect(()=>{if(!actor)return;try{sessionStorage.setItem('l2_social_lab_actor',actor.id);if(circle)sessionStorage.setItem('l2_social_lab_circle',circle.id);else sessionStorage.removeItem('l2_social_lab_circle');}catch{}},[actor?.id,circle?.id]);
 const go=(next:Screen)=>{if(next!=='map')setReceipt(null);setDialog(null);browse.open(next);};
 const changeCircle=(id:string)=>{setReceipt(null);setCircleId(id);setSelectedDong(null);setDialog(null);browse.open(screen,{circleId:id,mapMine:false});};
 const openInvite=()=>{setInviteStage(0);setDialog('invite');};
 const decideJoin=(personId:string,approve:boolean)=>{try{if(commit(current=>decideDemoJoin(current,circle!.id,actor!.id,personId,approve)))setToast(approve?'참여를 승인했어요. 이제 새 로그부터 볼 수 있어요.':'참여 요청을 거절했어요.');}catch(error){setToast(error instanceof Error?error.message:'요청을 처리하지 못했어요.');}};
 const requestJoin=()=>{try{if(commit(current=>requestDemoJoin(current,circle!.id,actor!.id)))setInviteStage(2);}catch(error){setToast(error instanceof Error?error.message:'요청을 저장하지 못했어요.');}};
 const showDong=(dong:DongCount)=>{browse.capture();setSelectedDong({code:dong.feature.properties.code,name:dong.feature.properties.name,logIds:dong.logIds});setDialog('district');};
 const showLog=(log:LabLog)=>{if(dialog==='detail'&&selectedId===log.id)return;setWorkDetail(undefined);setCardDraft(null);browse.capture();detailOrigin.current={district:dialog==='district',scroll:document.querySelector('.lab-dong-dialog')?.scrollTop||0};setSelectedId(log.id);setComment('');setDialog('detail');};
 const closeDetail=()=>{if(detailOrigin.current.district){const top=detailOrigin.current.scroll;setDialog('district');requestAnimationFrame(()=>requestAnimationFrame(()=>{const panel=document.querySelector('.lab-dong-dialog');if(panel)panel.scrollTop=top;}));}else{setDialog(null);browse.restore();}};
 const closeDistrict=()=>{setDialog(null);browse.restore();};
 const write=(audience?:string|null)=>{setComposeWork(undefined);setWorkDetail(undefined);browse.capture();setReceipt(null);setToast('');setComposeAudience(audience===undefined?(screen==='library'&&library==='mine'?null:circle?.id||null):audience);setDialog('compose');};
 useComposeSwipe(Boolean(state&&circle&&!dialog&&!editing&&!withdrawTarget&&!workDetail&&!guideActive),()=>write());
 const toggle=(id:string,key:'likes'|'bookmarks')=>{if(!actor)return;const success=commit(current=>({...current,logs:current.logs.map(log=>log.id===id&&canRead(log,actor.id,current)?{...log,[key]:log[key].includes(actor.id)?log[key].filter(v=>v!==actor.id):[...log[key],actor.id]}:log)}));if(success)setToast('');};
 if(!state||!actor)return <div className="lab-boot"><span className="lab-brand">L2<span>.</span></span><p role={loadError?'alert':undefined}>{loadError||'로그 불러오는 중'}</p>{loadError&&<button className="lab-storage-retry" onClick={()=>location.reload()}>다시 열기</button>}</div>;
 if(!circle)return <PendingMembership state={state} actor={actor} onActor={id=>{setActorId(id);setCircleId(state.circles.find(c=>c.members.includes(id))?.id||'');setDialog(null);}}/>;
 const shared=state.logs.filter(l=>l.circleId===circle.id&&canRead(l,actor.id,state)).sort((a,b)=>b.createdAt-a.createdAt);
 const readables=state.logs.filter(l=>canRead(l,actor.id,state));
 const own=readables.filter(l=>l.authorId===actor.id);
 const saved=readables.filter(l=>l.bookmarks.includes(actor.id));
 const base=screen==='library'?(library==='mine'?own:library==='saved'?saved:shared):shared;
 const logs=base.filter(l=>!query||`${l.title} ${l.body} ${l.place?.name||''}`.includes(query)).sort((a,b)=>b.createdAt-a.createdAt);
 const mapLogs=shared.filter(l=>isPublished(l)&&l.place&&(!mapMine||l.authorId===actor.id));
 const places=[...new Map(mapLogs.map(l=>[l.place!.id,l])).values()];
 const outstanding=state.logs.filter(log=>log.authorId===actor.id&&isOutstanding(log));
 const activeReceipt=receipt?{...receipt,log:state.logs.find(log=>log.id===receipt.log.id)||receipt.log}:null;
 const retryShare=(log:LabLog)=>{try{commit(current=>retryPublication(current,log.id,actor.id));}catch(e){setToast(e instanceof Error?e.message:'공유를 다시 시도하지 못했어요.');}};
 const selected=readables.find(l=>l.id===selectedId),selectedPerson=selected?state.people.find(p=>p.id===selected.authorId):undefined;
 const selectedCircle=selected?state.circles.find(c=>c.id===selected.circleId):undefined;
 const setTheme=()=>{const next=!dark;setDark(next);document.documentElement.classList.toggle('light',!next);try{localStorage.setItem('l2_social_lab_theme',next?'dark':'light');}catch{}};
 const onSave=(log:LabLog)=>{
  if(log.authorId!==actor.id||log.circleId&&!myCircles.some(c=>c.id===log.circleId))return false;
  log=enqueuePublication(log);
  const success=commit(current=>({...current,logs:current.logs.some(row=>row.id===log.id)?current.logs:[log,...current.logs],intents:log.work?(current.intents||[]).filter(intent=>!(intent.actorId===actor.id&&intent.work.id===log.work!.id)):current.intents}));
  if(success){
   if(log.circleId){setCircleId(log.circleId);browse.open('today',{circleId:log.circleId,reset:true});}else browse.open('library',{library:'mine',reset:true});
   setToast('');setSaveProgress(null);
   setReceipt({log,audienceName:myCircles.find(c=>c.id===log.circleId)?.name||null,groupLogs:log.circleId?(getCurrent()?.logs||[]).filter(entry=>entry.circleId===log.circleId&&isPublished(entry)):[]});
  }
  return success;
 };
 const recordWork=(work:Work)=>{write();setComposeWork(work);};
 const intend=(id:string)=>{try{if(commit(current=>toggleIntent(current,actor.id,id)))setToast('');}catch(e){setToast(e instanceof Error?e.message:'작품을 담지 못했어요.');}};
 const updateCard=()=>{if(!selected||!cardDraft)return;const design=cardDraft;if(commit(current=>({...current,logs:current.logs.map(log=>log.id===selected.id&&log.authorId===actor.id?enqueuePublication({...log,card:design,design:design.front,revision:(log.revision||0)+1,updatedAt:Date.now()}):log)}))){setCardDraft(null);setToast('앞·뒤 카드 디자인을 적용했어요.');}};
 const viewSavedMap=()=>{const target=activeReceipt?.log;if(!target?.circleId||!isPublished(target))return;setCircleId(target.circleId);setDialog(null);browse.open('map',{circleId:target.circleId,mapMine:false,reset:true});};

 const renderCard=(log:LabLog)=><LogPoster key={log.id} log={log} owner={state.people.find(p=>p.id===log.authorId)||actor} fresh={receipt?.log.id===log.id} showPublication={log.authorId===actor.id} onOpen={()=>showLog(log)}/>;
 return <div className="lab-app">
  <header className="lab-header"><button className="lab-header-add" aria-label="새 로그 남기기" onClick={()=>write()}><Plus size={25} strokeWidth={1.8}/></button><div className="lab-logo-lockup"><button className="lab-brand" aria-label="L2 오늘 화면" onClick={()=>go('today')}>L2<span>.</span></button><button className="lab-circle-switch" aria-label={`모임 선택 · ${circle.name}`} aria-haspopup="dialog" onClick={()=>setDialog('groups')}><span>{circle.name}</span><ChevronDown size={11}/></button></div><div className="lab-header-actions"><button className="lab-profile-button" aria-label="테스트 사용자와 설정" onClick={()=>setDialog('profile')}><Settings2 size={20}/>{(pendingCount>0||outstanding.length>0)&&<i className="lab-profile-pending" aria-hidden="true"/>}</button></div></header>
  <div className="lab-wide-navigation"><GlassNavigation desktop screen={screen} onNavigate={go} onCompose={()=>write()}/></div>
  <main className={`lab-main view-${screen}`}>
   {screen==='map'?<>
    <div className="lab-page-heading"><h1 className="sr-only">지도</h1><SlidingSegments label="지도 공개 로그 범위" value={mapMine?'mine':'circle'} options={[{id:'circle',label:'우리 모임'},{id:'mine',label:'나만'}]} onChange={value=>setMapMine(value==='mine')}/></div>
    <div className="lab-map-layout"><section className="lab-map-panel"><ScratchMap logs={mapLogs} people={state.people} dark={dark} scopeKey={circle.id} onSelect={showLog} onDistrictSelect={showDong} onCoverageChange={syncDongs} highlightedDong={receipt?.log.circleId===circle.id?saveProgress?.code:undefined} focusedLog={receipt?.log.circleId===circle.id?receipt.log.id:undefined}/>{receipt?.log.circleId===circle.id&&saveProgress&&(!mapMine||receipt.log.authorId===actor.id)&&<div className="lab-map-change" role="status"><MapPin size={16}/><span><strong>{saveProgress.name}</strong><small>로그 {saveProgress.before}개 → {saveProgress.after}개</small></span><b>{saveProgress.beforeStrength===saveProgress.afterStrength?`${saveProgress.afterStrength}%`:`${saveProgress.beforeStrength}% → ${saveProgress.afterStrength}%`}</b><button aria-label="지도 변화 안내 닫기" onClick={()=>setReceipt(null)}><X size={15}/></button></div>}</section><aside className="lab-map-list"><div className="lab-map-summary"><h2>기록한 장소</h2><div><strong>{places.length.toString().padStart(2,'0')}</strong><span>함께 발견한 장소<br/><small>공유된 기록만 지도에 담아요</small></span></div></div><div className="lab-discovered-list">{places.map(log=><button key={log.place!.id} onClick={()=>showLog(log)}><span className="lab-place-dot" style={personStyle(state.people.find(p=>p.id===log.authorId)||actor)}><MapPin size={18}/></span><span><strong>{log.place!.name}</strong><small>{state.people.find(p=>p.id===log.authorId)?.name} · {timeAgo(log.createdAt)} 기록</small></span><ArrowUpRight size={16}/></button>)}</div>{!places.length&&<div className="lab-empty"><MapPin/><h3>첫 발자국을 남겨볼까요?</h3><p>장소를 연결한 로그가 생기면 그 동네의 색이 돌아와요.</p><button onClick={()=>write(circle.id)}>장소와 함께 로그 남기기</button></div>}<p className="lab-local-note">컬러 영역은 방문 증명이 아닌 공유 로그가 있는 행정동의 시각화예요. 연속 위치 추적은 하지 않아요.</p></aside></div>
   </>:<>
    <div className="lab-feed-layout"><section className="lab-feed-column">
     {screen==='library'&&<div className="lab-library-controls"><SlidingSegments label="로그북 범위" value={library} options={[{id:'mine',label:'내 로그'},{id:'circle',label:'모임 로그'},{id:'saved',label:'담아둔 로그'},{id:'taste',label:'취향 선반'}]} onChange={setLibrary}/><button className="lab-icon-button" aria-label={grid?'카드 크게 보기':'2열 카드로 보기'} onClick={()=>setGrid(!grid)}>{grid?<List size={19}/>:<Grid2X2 size={18}/>}</button></div>}
     {screen==='library'&&library!=='taste'&&<div className="lab-feed-filters"><label className="lab-search"><Search size={17}/><input aria-label="로그 검색" maxLength={200} placeholder="로그 검색" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="검색 지우기" onClick={()=>setQuery('')}><X size={15}/></button>}</label></div>}
     {screen==='library'&&library==='taste'?<TasteShelf actor={actor} logs={readables.filter(log=>log.authorId===actor.id||log.circleId===circle.id)} people={state.people} intents={state.intents||[]} onWork={setWorkDetail} onRecord={recordWork} onToggleIntent={intend} onRemoveIntent={workId=>commit(current=>({...current,intents:(current.intents||[]).filter(i=>!(i.actorId===actor.id&&i.work.id===workId))}))}/>:<div className={`lab-feed lab-poster-grid ${screen==='library'&&!grid?'is-single':''}`}>{logs.map(log=>renderCard(log))}</div>}
     {!(screen==='library'&&library==='taste')&&!logs.length&&<div className="lab-empty"><BookOpen/><h3>{query?'아직 찾지 못한 순간이에요':'작은 순간부터 채워볼까요?'}</h3><p>{library==='saved'&&screen==='library'?'친구 로그의 북마크를 누르면 여기에 모여요.':'사진 한 장이나 한 줄이면 충분해요.'}</p><button onClick={()=>write()}>로그 남기기</button></div>}
    </section></div>
   </>}
  </main>
  <GlassNavigation screen={screen} onNavigate={go} onCompose={()=>write()}/>
  <AccessibleDialog open={dialog==='district'} onClose={closeDistrict} title={selectedDong?.name||'행정동 로그'} panelClassName="lab-dialog lab-dong-dialog">{selectedDong&&<><p className="lab-dong-summary">로그 {mapLogs.filter(log=>selectedDong.logIds.includes(log.id)).length}개 · 4개부터 컬러 400%</p><div className="lab-feed lab-poster-grid">{mapLogs.filter(log=>selectedDong.logIds.includes(log.id)).sort((a,b)=>b.createdAt-a.createdAt).map(renderCard)}</div></>}</AccessibleDialog>
  <AccessibleDialog open={dialog==='groups'} onClose={()=>setDialog(null)} title="모임 선택" panelClassName="lab-dialog"><p className="lab-local-note">이름을 눌러 모임을 바꿔보세요. 현재 역할이 참여한 가상 모임만 보여요.</p><div className="lab-option-stack">{myCircles.map(c=><button key={c.id} onClick={()=>changeCircle(c.id)}><Users/><span><strong>{c.name}</strong><small>{c.members.length}명 · {c.description}</small></span>{c.id===circle.id&&<Check/>}</button>)}</div><button className="lab-settings-row" onClick={()=>setDialog('members')}><Settings2 size={17}/>현재 모임 관리{pendingCount>0&&<span className="lab-pending-dot">{pendingCount}</span>}<ArrowRight size={16}/></button><form className="lab-create-group" onSubmit={e=>{e.preventDefault();if(groupName.trim().length<2)return;const id=crypto.randomUUID();if(commit(s=>({...s,circles:[...s.circles,{id,name:groupName.trim(),description:'함께 채워갈 작은 일상',members:[actor.id],ownerId:actor.id}]}))){setGroupName('');changeCircle(id);setToast('새 가상 모임을 만들었어요.');}}}><label htmlFor="lab-new-group">새 모임 만들기</label><input id="lab-new-group" placeholder="모임 이름 (2글자 이상)" value={groupName} maxLength={30} onChange={e=>setGroupName(e.target.value)}/><button className="lab-primary" disabled={groupName.trim().length<2}><Plus size={17}/>만들기</button></form></AccessibleDialog>
  <AccessibleDialog open={dialog==='profile'} onClose={()=>setDialog(null)} title="로컬 테스트 설정" panelClassName="lab-dialog"><div className="lab-profile-intro"><Avatar person={actor}/><div><h3>{actor.name}</h3><p>{actor.note}</p></div></div><p className="lab-local-note">가상 사용자 역할을 바꿔 같은 브라우저에서 친구 화면을 확인하세요. 실제 로그인이나 접근 제어를 제공하는 버전은 아니에요.</p><div className="lab-person-choices">{state.people.map(p=><button key={p.id} aria-pressed={actor.id===p.id} onClick={()=>{browse.capture();setEditing(null);setWithdrawTarget(null);setActorId(p.id);setCircleId(state.circles.find(c=>c.members.includes(p.id))?.id||'daily');setSelectedId('');setDialog(null);}}><Avatar person={p} small/><span>{p.name}</span>{actor.id===p.id&&<Check size={16}/>}</button>)}</div><button className="lab-settings-row" aria-label={pendingCount?`모임 관리 · 참여 요청 ${pendingCount}개`:'모임 관리'} onClick={()=>setDialog('members')}><Users size={18}/>모임 관리{pendingCount>0&&<span className="lab-pending-dot">{pendingCount}</span>}<ArrowRight size={16}/></button><button className="lab-settings-row" onClick={()=>setDialog('outbox')}><CloudUpload size={18}/>공유 대기함{outstanding.length>0&&<span className="lab-pending-dot">{outstanding.length}</span>}<ArrowRight size={16}/></button><button className="lab-settings-row" onClick={setTheme}>{dark?<Sun size={18}/>:<Moon size={18}/>} {dark?'라이트':'다크'} 모드로 보기<ArrowRight size={16}/></button><button className="lab-settings-row" onClick={()=>{setDialog(null);browse.open('today');setGuideReplay(v=>v+1);}}><HelpCircle size={18}/>사용 안내 다시 보기<ArrowRight size={16}/></button><button className="lab-settings-row" onClick={()=>setDialog('concept')}><BookOpen size={18}/>기획 한눈에 보기<ArrowRight size={16}/></button><button className="lab-settings-row danger" onClick={()=>setDialog('reset')}><RotateCcw size={18}/>테스트 데이터 초기화</button></AccessibleDialog>
  <AccessibleDialog open={dialog==='outbox'} onClose={()=>setDialog(null)} title="공유 대기함" panelClassName="lab-dialog"><OutboxPanel logs={outstanding} mode={transport.mode} onMode={transport.changeMode} onRetry={retryShare} onKeep={log=>{setWithdrawError('');setWithdrawTarget(log);}}/></AccessibleDialog>
  <AccessibleDialog open={dialog==='members'} onClose={()=>setDialog(null)} title="모임 관리" panelClassName="lab-dialog"><MembersPanel circle={circle} people={state.people} actorId={actor.id} onDecide={decideJoin} onInvite={openInvite}/></AccessibleDialog>
  <AccessibleDialog open={dialog==='invite'} onClose={()=>setDialog(null)} title="친구 초대" panelClassName="lab-dialog"><div className="lab-invite-art"><Users size={38}/><h3>{circle.name}</h3><p>{circle.members.length}명이 로그를 나누고 있어요.</p></div><p className="lab-local-note">같은 브라우저에서 확인하는 초대 테스트예요. 실제 초대 링크는 발급하지 않아요.</p>{!owner?<p className="lab-local-note">초대는 모임장만 진행할 수 있어요.</p>:circle.members.includes('guest')?<div className="lab-invite-preview"><Check size={28}/><h3>다온이 함께하고 있어요</h3><button className="lab-primary" onClick={()=>setDialog('members')}>멤버 보기</button></div>:inviteStage===2||circle.pending?.includes('guest')?<div className="lab-invite-preview" role="status"><span className="lab-invite-status">승인 대기</span><h3>다온의 참여 요청이 도착했어요</h3><p>아직 로그와 지도는 볼 수 없어요.<br/>모임 관리에서 승인하거나 거절할 수 있어요.</p><button className="lab-primary" onClick={()=>setDialog('members')}>참여 요청 확인</button></div>:inviteStage===0?<button className="lab-primary" onClick={()=>setInviteStage(1)}>초대받은 화면 미리보기 <ArrowRight size={17}/></button>:<div className="lab-invite-preview"><span className="lab-eyebrow">다온으로 참여 요청 테스트</span><h3>{circle.name}</h3><p>모임장 승인 후 참여할 수 있어요.<br/>참여 이후에 올라온 로그부터 함께 봐요.</p><button className="lab-primary" onClick={requestJoin}>가상 참여 요청하기</button></div>}</AccessibleDialog>
  <AccessibleDialog open={dialog==='detail'} onClose={closeDetail} title={selected?displayTitle(selected):'로그를 찾을 수 없어요'} panelClassName="lab-dialog lab-detail-dialog">{selected&&selectedPerson&&<div className="lab-detail-layout"><div className="lab-detail-card"><div ref={cardRoot}><EditorialCard log={selected} author={selectedPerson.name} appearance={cardDraft||styleOf(selected)}/></div><CardImageActions key={selected.id+JSON.stringify(cardDraft||selected.card)} root={cardRoot} title={cardTitle(selected)} hasPhoto={Boolean(selected.image)}/></div><div className="lab-detail-info"><div className="lab-author"><Avatar person={selectedPerson} small/><span><strong>{selectedPerson.name}</strong><small>{selectedCircle?.name||'나만 보기'} · {timeAgo(selected.createdAt)}</small></span></div><h3>{displayTitle(selected)}</h3><p className="lab-detail-body">{selected.body}</p>{selected.place&&<div className="lab-detail-location"><MapPin size={16}/><span>{selected.place.name}<small>{selected.place.area} · 로그를 남긴 장소</small></span></div>}<div className="lab-post-actions"><button aria-pressed={selected.likes.includes(actor.id)} onClick={()=>toggle(selected.id,'likes')}><Heart size={18} fill={selected.likes.includes(actor.id)?'currentColor':'none'}/>공감 {selected.likes.length}</button><BookmarkToggle key={`${actor.id}:${selected.id}:bookmark`} active={selected.bookmarks.includes(actor.id)} onClick={()=>toggle(selected.id,'bookmarks')}>{selected.bookmarks.includes(actor.id)?'저장됨':'담아두기'}</BookmarkToggle></div>{selected.work&&<div className="lab-work-detail-actions"><BookmarkToggle key={`${actor.id}:${selected.work.id}:intent`} intent active={(state.intents||[]).some(intent=>intent.actorId===actor.id&&intent.work.id===selected.work!.id)} onClick={()=>intend(selected.id)}>나도 보기</BookmarkToggle><button onClick={()=>recordWork(selected.work!)}>나도 봤어요 · 감상 남기기</button><button onClick={()=>{setDialog(null);setWorkDetail(selected.work);}}>같은 작품의 감상 모아 보기</button></div>}{selected.authorId===actor.id?<div className="lab-own-controls">{selected.publication&&<PublicationStatus log={selected} onRetry={()=>retryShare(selected)} onKeep={()=>{setWithdrawError('');setWithdrawTarget(selected);}}/>}<button className="lab-edit-content" onClick={()=>setEditing(selected)}><Pencil size={17}/>내용 수정</button><CardDesignEditor value={cardDraft||styleOf(selected)} hasPhoto={Boolean(selected.image)} onChange={setCardDraft} dirty={Boolean(cardDraft)} onApply={updateCard}/>{isPublished(selected)&&<button className="lab-withdraw-action" onClick={()=>{setWithdrawError('');setWithdrawTarget(selected);}}><Undo2 size={16}/>모임 공유 회수</button>}<button className="lab-text-action" onClick={()=>{if(confirm('이 테스트 로그를 삭제할까요?')){if(commit(s=>({...s,logs:s.logs.filter(l=>l.id!==selected.id)})))setDialog(null);}}}>내 테스트 로그 삭제</button></div>:<button className="lab-primary" onClick={()=>selected.work?recordWork(selected.work):write(circle.id)}>나도 로그 남기기 <ArrowRight size={16}/></button>}<div className="lab-comments"><h4>작은 이야기 <span>{selected.comments.length}</span></h4>{selected.comments.map(c=><p key={c.id}><strong>{state.people.find(p=>p.id===c.authorId)?.name}</strong>{c.body}</p>)}<form onSubmit={e=>{e.preventDefault();if(!comment.trim())return;if(commit(s=>({...s,logs:s.logs.map(l=>l.id===selected.id?{...l,comments:[...l.comments,{id:crypto.randomUUID(),authorId:actor.id,body:comment.trim()}]}:l)})))setComment('');}}><input aria-label="댓글 내용" placeholder="가벼운 한마디 남기기" maxLength={200} value={comment} onChange={e=>setComment(e.target.value)}/><button aria-label="댓글 남기기" disabled={!comment.trim()}><ArrowRight size={18}/></button></form></div></div></div>}</AccessibleDialog>
  <AccessibleDialog open={dialog==='concept'} onClose={()=>setDialog(null)} title="가까운 사이, 가벼운 기록" panelClassName="lab-dialog"><div className="lab-concept"><span className="lab-eyebrow">L2 · LIVE & LOG!</span><h3>친구의 오늘이<br/>나의 다음 순간으로.</h3><p>초대한 사람들과 일상·맛집·영화·책을 가볍게 나누는 작은 로그 공간입니다. 각자의 기록은 카드로 남고, 공유한 장소는 흑백 지도에 색을 채웁니다.</p><ul><li>가상 사용자·모임 전환으로 2열 로그 카드 보기</li><li>사진·한 줄 작성, 비공개·모임 대상 선택</li><li>공감·북마크·댓글과 카드 디자인 비교</li><li>행정동별 로그 수에 따라 채워지는 컬러 지도</li></ul><p className="lab-local-note">프론트엔드 로컬 실험판입니다. 데이터는 이 브라우저에 저장되며, 실제 계정·초대·다른 기기 공유·서버 권한 검사는 미연결입니다. 기본 장소와 작품은 예시이고, 지도 타일만 OpenStreetMap을 사용합니다.</p></div></AccessibleDialog>
  <AccessibleDialog open={dialog==='reset'} onClose={()=>setDialog(null)} title="테스트 데이터를 초기화할까요?" panelClassName="lab-dialog"><p>이 브라우저에서 추가한 로그·반응·댓글·가상 모임이 사라지고 예시로 돌아가요. 원본 L2와 운영 데이터에는 영향이 없어요.</p><button className="lab-primary" onClick={()=>{const seed=seedState();if(commit(()=>seed)){browse.reset();setActorId('me');setCircleId('daily');setEditing(null);setWithdrawTarget(null);browse.open('today',{circleId:'daily',library:'mine',mapMine:false,reset:true});setDialog(null);setToast('가상 데이터를 처음 상태로 돌렸어요.');}}}>테스트 데이터 초기화</button></AccessibleDialog>
  {editing&&<Composer key={`edit-${editing.id}`} actor={actor} circles={myCircles} audience={editing.circleId} dark={dark} editing={editing} onSave={draft=>{const ok=commit(current=>editOwnLog(current,editing.id,actor.id,editing.revision||0,draft));if(ok){setReceipt(null);setSaveProgress(null);setToast(editing.circleId?'이 기기에 수정했어요. 모임 로그는 다시 모의 전송해요.':'내 로그북의 내용을 수정했어요.');}return ok;}} onClose={()=>setEditing(null)}/>}
  <AccessibleDialog open={Boolean(withdrawTarget)} onClose={()=>setWithdrawTarget(null)} title="모임 공유를 회수할까요?" panelClassName="lab-dialog lab-withdraw-dialog"><p>{withdrawTarget&&isOutstanding(withdrawTarget)?'아직 공유가 끝나지 않았어요. 전송 대기를 취소하고 글·사진·장소를 내 로그북에만 남깁니다.':'이 로그가 모임의 피드와 지도에서 빠져요. 글·사진·장소는 내 로그북에 그대로 남습니다.'}</p>{withdrawError&&<p className="lab-error" role="alert">{withdrawError}</p>}<div className="lab-confirm-actions"><button onClick={()=>setWithdrawTarget(null)}>취소</button><button className="lab-primary" onClick={()=>{if(!withdrawTarget||withdrawLock.current)return;withdrawLock.current=true;try{if(commit(current=>withdrawOwnLog(current,withdrawTarget.id,actor.id,withdrawTarget.revision||0))){setWithdrawTarget(null);setReceipt(null);setSaveProgress(null);setToast('모임 공유를 회수했어요. 내 로그북에는 남아 있어요.');}else{withdrawLock.current=false;setWithdrawError('기기에 저장하지 못했어요. 공유 상태는 그대로예요. 다시 시도해주세요.');}}catch(error){withdrawLock.current=false;setWithdrawError(error instanceof Error?error.message:'공유를 회수하지 못했어요.');}}}>공유 회수</button></div></AccessibleDialog>
  {dialog==='compose'&&<CameraComposer initialWork={composeWork} nearbyLogs={shared.filter(isPublished)} actor={actor} circles={myCircles} audience={composeAudience} dark={dark} onSave={onSave} onClose={()=>setDialog(null)}/>}
  {workDetail&&<WorkDetail work={workDetail} logs={readables.filter(log=>log.authorId===actor.id||log.circleId===circle.id)} actor={actor} people={state.people} intents={state.intents||[]} onClose={()=>setWorkDetail(undefined)} onLog={showLog} onRecord={()=>recordWork(workDetail)} onToggleIntent={intend}/>}
  {receipt&&screen!=='map'&&!dialog&&<SaveNotice receipt={activeReceipt!} progress={saveProgress} onMap={viewSavedMap} onClose={()=>setReceipt(null)} onRetry={()=>{if(activeReceipt)retryShare(activeReceipt.log);}}/>}
  <FirstUseGuide context={editing||withdrawTarget||workDetail?null:dialog==='compose'?'compose':dialog==='detail'&&selected?(selected.authorId===actor.id?'own-detail':'detail'):dialog||receipt?null:screen} replay={guideReplay} owned={selected?.authorId===actor.id} shared={Boolean(selected&&isPublished(selected))} pending={Boolean(selected&&isOutstanding(selected))} onActiveChange={setGuideActive}/>
  {toast&&<div className="lab-toast" role="status"><Check size={17}/>{toast}</div>}
 </div>;
}
