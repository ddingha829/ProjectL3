'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArchiveItem, CardAppearance, CardLayoutType, GeoPoint, MapApiPlace, PlaceInboxItem, PresetSlot, SkinTheme } from '@/types/l2';
import { INITIAL_ARCHIVES, INITIAL_SKINS, PRESET_SLOTS } from '@/data/initialData';
import { createCardAppearance } from '@/lib/cardAppearance';
import { prepareCardExport, downloadCardFile } from '@/lib/cardExport';
import { getGroupMembers, isLogGroup } from '@/lib/logGroups';
import { haptic } from '@/lib/haptics';
import { useArchiveRepository } from '@/hooks/useArchiveRepository';
import { usePresetPreferences } from '@/hooks/usePresetPreferences';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import QuickLogComposer, { type LogDraft } from '@/components/QuickLogComposer';
import ArchiveBrowser from '@/components/ArchiveBrowser';
import StudioPanel from '@/components/StudioPanel';
import CardWorkspace from '@/components/CardWorkspace';
import SettingsDialog from '@/components/SettingsDialog';
import AccessibleDialog from '@/components/AccessibleDialog';
import GroupEditor from '@/components/GroupEditor';
import TestPwa from '@/components/TestPwa';
import { usePwaInstall, PwaInstallBanner, PwaInstallGuideDialog } from '@/components/PwaInstallControl';
import './test.css';
import './workflow.css';

type Tab='log'|'archive'|'card'|'studio';
type Toast={title:string;actionLabel?:string;action?:()=>void;tone:'info'|'success'|'error'};
const dateNow=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}).slice(2).replaceAll('-','.');
const TAB_ORDER: Record<Tab, number> = { log: 0, archive: 1, card: 1, studio: 2 };
const INBOX_STORAGE_KEY = 'l2_google_places_inbox_v1';
const LIST_DETAILS_KEY = 'l2_list_details_on';
const AUTO_PLACE_LINK_KEY = 'l2_auto_place_link_on';

export default function L2TestApp(){
  const repository=useArchiveRepository(),preferences=usePresetPreferences(repository.serverSnapshot),archives=repository.archives;
  const { motion, changeMotion } = useMotionPreference();
  const pwa = usePwaInstall();
  const [tab,setTab]=useState<Tab>('log'),[light,setLight]=useState(false),[settings,setSettings]=useState(false);
  const [listDetailsOn,setListDetailsOn]=useState(true),[autoPlaceLinkOn,setAutoPlaceLinkOn]=useState(true);
  const [slideDir,setSlideDir]=useState<'next'|'prev'|null>(null);
  const [activeId,setActiveId]=useState(''),[editingId,setEditingId]=useState<string|null>(null),[newId,setNewId]=useState<string|null>(null);
  const [toast,setToast]=useState<Toast|null>(null),[applying,setApplying]=useState(false);
  const [inboxPlaces,setInboxPlaces]=useState<PlaceInboxItem[]>([]);
  const [exportState,setExportState]=useState<'idle'|'preparing'|'ready'|'error'>('idle'),[exportError,setExportError]=useState(''),[exportRevision,setExportRevision]=useState(0);
  const exportFile=useRef<File|null>(null),captureRef=useRef<HTMLDivElement|null>(null),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),savedTimer=useRef<ReturnType<typeof setTimeout>|null>(null),migrating=useRef(new Set<string>());
  const swipeStart=useRef<{x:number;y:number;time:number;inSwipeRow:boolean}|null>(null);

  const notify=useCallback((title:string,actionLabel?:string,action?:()=>void,tone:Toast['tone']='info')=>{if(toastTimer.current)clearTimeout(toastTimer.current);setToast({title,actionLabel,action,tone});toastTimer.current=setTimeout(()=>setToast(null),action?8000:3000);},[]);
  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);if(savedTimer.current)clearTimeout(savedTimer.current);},[]);
  useEffect(()=>{
    try{setLight(localStorage.getItem('l2_test_theme')==='paper');}catch{}
    try{setListDetailsOn(localStorage.getItem(LIST_DETAILS_KEY)!=='off');}catch{}
    try{setAutoPlaceLinkOn(localStorage.getItem(AUTO_PLACE_LINK_KEY)!=='off');}catch{}
    try{const raw=localStorage.getItem(INBOX_STORAGE_KEY);if(raw)setInboxPlaces(JSON.parse(raw));}catch{}
  },[]);
  useEffect(()=>{document.documentElement.classList.toggle('light',light);},[light]);
  const changeTheme=(value:boolean)=>{setLight(value);try{localStorage.setItem('l2_test_theme',value?'paper':'dark');}catch{}};
  const changeListDetails=(value:boolean)=>{setListDetailsOn(value);try{localStorage.setItem(LIST_DETAILS_KEY,value?'on':'off');}catch{}};
  const changeAutoPlaceLink=(value:boolean)=>{setAutoPlaceLinkOn(value);try{localStorage.setItem(AUTO_PLACE_LINK_KEY,value?'on':'off');}catch{}};

  const updateInbox=(updater:(prev:PlaceInboxItem[])=>PlaceInboxItem[])=>{
    setInboxPlaces(prev=>{
      const next=updater(prev);
      try{localStorage.setItem(INBOX_STORAGE_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };

  const failedSyncIds=Object.entries(repository.itemStatus).filter(([,state])=>state==='failed').map(([id])=>id).sort().join(',');
  const notifiedFailure=useRef('');
  useEffect(()=>{if(!failedSyncIds){notifiedFailure.current='';return;}if(notifiedFailure.current===failedSyncIds)return;notifiedFailure.current=failedSyncIds;notify('기기에는 보관했지만 서버에 동기화하지 못했어요.','설정 보기',()=>setSettings(true),'error');},[failedSyncIds,notify]);

  const defaultSlot=preferences.presetSlots.find(slot=>slot.id===preferences.defaultPresetId)||preferences.presetSlots[0];
  const actualItem=archives.find(entry=>entry.id===activeId)||archives[0];
  const item=actualItem||INITIAL_ARCHIVES[0];
  const editingItem=archives.find(entry=>entry.id===editingId)||null;
  const members=useMemo(()=>getGroupMembers(item,archives),[item,archives]);

  // Immutable fallback appearance for existing records that somehow lack cardAppearance:
  // Always anchored to initial PRESET_SLOTS[0] so changing defaultPresetId in Studio never alters existing cards.
  const fallbackAppearance=useMemo<CardAppearance>(()=>({
    slot:PRESET_SLOTS[0],
    skin:INITIAL_SKINS[PRESET_SLOTS[0].skinId]||INITIAL_SKINS.paper,
    authorName:preferences.authorName
  }),[preferences.authorName]);

  const appearance=useMemo(()=>item.cardAppearance||createCardAppearance(item,PRESET_SLOTS[0],INITIAL_SKINS,item.author||preferences.authorName),[item,preferences.authorName]);

  useEffect(()=>{
    if(!repository.ready||!preferences.ready||!repository.serverSnapshot&&navigator.onLine)return;
    for(const entry of archives){
      if(entry.cardAppearance||migrating.current.has(entry.id))continue;
      migrating.current.add(entry.id);
      const snapshot=repository.serverSnapshot;
      const fixedSlot=PRESET_SLOTS[0];
      void repository.save({...entry,cardAppearance:createCardAppearance(entry,fixedSlot,snapshot?.skins||preferences.skins,entry.author||preferences.authorName)},true).catch(()=>{migrating.current.delete(entry.id);notify('카드 디자인을 보관하지 못했어요.',undefined,undefined,'error');});
    }
  },[archives,repository.ready,repository.serverSnapshot,repository.save,preferences.ready,preferences.skins,preferences.authorName,notify]);

  const go=useCallback((next:Tab,directionOverride?:'next'|'prev')=>{
    setTab(current=>{
      const dir=directionOverride||(TAB_ORDER[next]>=TAB_ORDER[current]?'next':'prev');
      setSlideDir(dir);
      return next;
    });
    setEditingId(null);
    window.scrollTo({top:0,behavior:'instant'});
  },[]);

  const open=(entry:ArchiveItem)=>{setToast(null);setActiveId(entry.id);go('card','next');};
  const arrived=(entry:ArchiveItem)=>{setActiveId(entry.id);setNewId(entry.id);setSlideDir('next');setTab('archive');window.scrollTo({top:0,behavior:'instant'});if(savedTimer.current)clearTimeout(savedTimer.current);savedTimer.current=setTimeout(()=>setNewId(null),7000);};

  const saveLog=async(draft:LogDraft)=>{
    const previous=editingItem;
    if(!draft.title.trim())throw new Error('제목을 입력해 주세요.');
    const photo={img:draft.img,hasPhoto:Boolean(draft.img)};
    const previousAppearance=previous?.cardAppearance;
    const cardAppearance=previousAppearance?createCardAppearance(photo,previousAppearance.slot,{[previousAppearance.skin.id]:previousAppearance.skin},previousAppearance.authorName):createCardAppearance(photo,defaultSlot,preferences.skins,preferences.authorName);
    const payload:ArchiveItem={id:previous?.id||crypto.randomUUID(),num:previous?.num||'',cat:draft.category,sub:draft.category,title:draft.title.trim(),quote:draft.body.trim(),loc:draft.place?.loc||'',addressShort:draft.place?.short||'',fullAddress:draft.place?.fullAddress||'',date:previous?.date||dateNow(),timestamp:previous?.timestamp||Date.now(),score:draft.score===null?'':draft.score.toFixed(1),...photo,cropX:draft.cropX,cropY:draft.cropY,good:draft.good.trim(),bad:draft.bad.trim(),note:draft.note.trim(),link:draft.place?.link||'',mapX:draft.place?.x??50,mapY:draft.place?.y??50,author:cardAppearance.authorName,cardAppearance,coordinates:draft.place?.coordinates||null};
    try{const result=await repository.save(payload,Boolean(previous));setEditingId(null);setActiveId(result.item.id);if(previous)setTab('card');else arrived(result.item);haptic.success();notify(previous?'수정했어요':'로그가 쌓였어요',previous?undefined:'카드 보기',previous?undefined:()=>open(result.item),'success');}
    catch(error){notify('저장하지 못했어요. 입력은 그대로 남아 있어요.',undefined,undefined,'error');throw error;}
  };

  const remove=async(entry:ArchiveItem)=>{try{await repository.remove(entry.id);if(activeId===entry.id){setEditingId(null);setTab('archive');setActiveId('');}notify('로그를 삭제했어요','실행 취소',()=>{void repository.save(entry,false).then(()=>notify('로그를 되돌렸어요')).catch(()=>notify('되돌리지 못했어요.',undefined,undefined,'error'));});}catch(error){notify('삭제하지 못했어요. 로그를 유지합니다.',undefined,undefined,'error');throw error;}};
  const createGroup=async(ids:string[],title:string)=>{
    const entries=ids.map(id=>archives.find(entry=>entry.id===id)).filter((entry):entry is ArchiveItem=>Boolean(entry)&&!isLogGroup(entry!));
    if(!entries.length)throw new Error('모을 로그를 선택해 주세요.');
    const firstPhoto=entries.find(entry=>entry.hasPhoto!==false&&entry.img);
    const group:ArchiveItem={id:crypto.randomUUID(),num:'',kind:'group',cat:'GROUP',memberIds:entries.map(entry=>entry.id),title,sub:'GROUP',date:dateNow(),timestamp:Date.now(),quote:'',loc:'',addressShort:'',fullAddress:'',score:'',img:firstPhoto?.img||'',hasPhoto:Boolean(firstPhoto?.img),cropX:50,cropY:50,mapX:50,mapY:50,good:'',bad:'',note:'',link:'',author:preferences.authorName};
    group.cardAppearance=createCardAppearance(group,{...defaultSlot,layout:'curation',ratio:entries.length>5?'9:16':'3:4'},preferences.skins,preferences.authorName);
    const result=await repository.save(group,false);arrived(result.item);haptic.success();notify('그룹을 저장했어요','카드 보기',()=>open(result.item),'success');
  };
  const saveGroup=async(title:string,ids:string[])=>{if(!editingItem)return;const result=await repository.save({...editingItem,title,memberIds:ids},true);setActiveId(result.item.id);setEditingId(null);haptic.success();notify('그룹을 수정했어요');};
  const saveCoordinates = async (id: string, coordinates: GeoPoint) => {
    const entry = archives.find(item => item.id === id);
    if (entry) await repository.save({ ...entry, coordinates }, true);
  };
  const autoLinkPlace = async (id: string, place: MapApiPlace) => {
    const entry = archives.find(item => item.id === id);
    if (!entry) return;
    await repository.save({
      ...entry,
      loc: place.loc || entry.loc,
      addressShort: place.short || entry.addressShort,
      fullAddress: place.fullAddress || place.short || entry.fullAddress,
      link: place.link || entry.link,
      mapX: place.x ?? entry.mapX,
      mapY: place.y ?? entry.mapY,
      coordinates: place.coordinates || entry.coordinates || null,
    }, true);
    notify(`‘${entry.title}’ 위치를 연결했어요`, undefined, undefined, 'success');
  };
  const applyPreset=async(preset:PresetSlot)=>{if(applying||!actualItem)return;setApplying(true);try{const cardAppearance=createCardAppearance(item,preset,preferences.skins,preferences.authorName);await repository.save({...item,author:cardAppearance.authorName,cardAppearance},true);haptic.snap();}catch{notify('프리셋을 적용하지 못했어요.',undefined,undefined,'error');}finally{setApplying(false);}};
  const applyLayout=async(layoutId:CardLayoutType)=>{if(applying||!actualItem)return;setApplying(true);try{const nextSlot={...appearance.slot,layout:layoutId};const cardAppearance:CardAppearance={...appearance,slot:nextSlot};await repository.save({...item,cardAppearance},true);haptic.snap();}catch{notify('도안을 변경하지 못했어요.',undefined,undefined,'error');}finally{setApplying(false);}};
  const savePreset=async(preset:PresetSlot,makeDefault:boolean)=>{
    preferences.update(previous=>{const exists=previous.presetSlots.some(entry=>entry.id===preset.id);if(!exists&&previous.presetSlots.length>=20)throw new Error('프리셋은 20개까지 저장할 수 있어요.');const slots=exists?previous.presetSlots.map(entry=>entry.id===preset.id?{...preset}:entry):[...previous.presetSlots,{...preset}];return {...previous,presetSlots:makeDefault?slots.sort((a,b)=>Number(b.id===preset.id)-Number(a.id===preset.id)):slots,defaultPresetId:makeDefault?preset.id:previous.defaultPresetId};});haptic.success();notify(makeDefault?'기본 프리셋으로 설정했어요':'프리셋을 저장했어요',undefined,undefined,'success');
  };
  const deletePreset=(id:string)=>{
    preferences.update(previous=>{
      if(previous.presetSlots.length<=1||previous.defaultPresetId===id)return previous;
      return {...previous,presetSlots:previous.presetSlots.filter(slot=>slot.id!==id)};
    });
    notify('프리셋을 삭제했어요');
  };
  const deleteSkin=(id:string)=>{
    preferences.update(previous=>{
      const nextSkins={...previous.skins};
      delete nextSkins[id];
      return {...previous,skins:nextSkins};
    });
    notify('팔레트를 삭제했어요');
  };
  const generateSkin=async(prompt:string)=>{const response=await fetch('/api/ai/skin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});if(!response.ok)throw new Error('팔레트를 만들지 못했어요.');const {skin}=await response.json() as {skin:SkinTheme};preferences.update(previous=>({...previous,skins:{...previous.skins,[skin.id]:skin}}));return skin;};
  const suggestSummary=async(draft:LogDraft)=>{const response=await fetch('/api/ai/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:draft.title,quote:draft.body,loc:draft.place?.loc||'',category:draft.category})});if(!response.ok)throw new Error('요약을 만들지 못했어요. 다시 시도해 주세요.');const data=await response.json();return {good:String(data.good||''),bad:String(data.bad||''),note:String(data.note||'')};};

  useEffect(()=>{
    exportFile.current = null;
    if (tab !== 'card' || !actualItem) { setExportState('idle'); return; }
    let canceled = false;
    setExportState('preparing'); setExportError('');
    const timer = setTimeout(async () => {
      try {
        let node: HTMLDivElement | null = null;
        for (let attempt = 0; attempt < 100 && !canceled; attempt++) {
          if (captureRef.current?.isConnected) { node = captureRef.current; break; }
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        if (canceled) return;
        if (!node) throw new Error('카드가 아직 준비되지 않았어요.');
        const prepared = await prepareCardExport(node, { filename: `L2_${item.title.replace(/[<>:"/\\|?*]/g, '_')}.png`, pixelRatio: 3 });
        if (!canceled) { exportFile.current = prepared.file; setExportState('ready'); }
      } catch (error) {
        if (!canceled) { setExportState('error'); setExportError(error instanceof Error ? error.message : '이미지를 준비하지 못했어요.'); }
      }
    }, 180);
    return () => { canceled = true; clearTimeout(timer); };
  },[tab,actualItem,item,appearance,members,exportRevision]);

  const ensureExportFile=async():Promise<File|null>=>{
    if(exportFile.current)return exportFile.current;
    if(!captureRef.current)return null;
    try{
      setExportState('preparing');
      const prepared=await prepareCardExport(captureRef.current,{filename:`L2_${item.title.replace(/[<>:"/\\|?*]/g,'_')}.png`,pixelRatio:3});
      exportFile.current=prepared.file;
      setExportState('ready');
      return prepared.file;
    }catch(error){
      setExportState('error');
      setExportError(error instanceof Error?error.message:'이미지를 준비하지 못했어요.');
      return null;
    }
  };

  const download=async()=>{
    const file=await ensureExportFile();
    if(!file)return;
    downloadCardFile(file);
    notify('카드 다운로드를 시작했어요');
  };
  const share=async()=>{
    const file=await ensureExportFile();
    if(!file)return;
    try{if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:item.title,text:item.quote});else downloadCardFile(file);}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))notify('공유하지 못했어요. 카드 저장으로 다시 시도해 주세요.',undefined,undefined,'error');}
  };
  const restore=async(code:string)=>{const response=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recoveryCode:code})});const data=await response.json();if(!response.ok)throw new Error(data.error||'복원 코드를 확인해 주세요.');window.location.reload();};

  // Horizontal swipe navigation across + 로그 (log) <-> 로그북 (archive) <-> 스튜디오 (studio) <-> 설정 (settings)
  const onPointerDownShell=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(editingItem)return;
    const target=e.target as HTMLElement|null;
    if(!target)return;
    if(target.closest('input[type="range"], .leaflet-container, [data-crop-interactive], .logbook-spotlight-backdrop'))return;
    const hScroll=target.closest<HTMLElement>('.preset-rail, .record-preset-picker > div[role="group"]');
    if(hScroll&&hScroll.scrollWidth>hScroll.clientWidth+4)return;
    const inDialog=target.closest('[role="dialog"]');
    if(inDialog&&!settings)return;
    swipeStart.current={
      x:e.clientX,
      y:e.clientY,
      time:Date.now(),
      inSwipeRow:Boolean(target.closest('.swipe-log'))
    };
  };

  const onPointerUpShell=(e:React.PointerEvent<HTMLDivElement>)=>{
    const start=swipeStart.current;
    swipeStart.current=null;
    if(!start||editingItem)return;
    const dx=e.clientX-start.x;
    const dy=e.clientY-start.y;
    const elapsed=Date.now()-start.time;
    if(elapsed>750)return;
    if(Math.abs(dx)<68||Math.abs(dx)<Math.abs(dy)*1.4)return;

    if(settings){
      if(dx>68){
        haptic.tick();
        setSettings(false);
        setSlideDir('prev');
      }
      return;
    }

    if(start.inSwipeRow&&dx<0)return;

    const currentEffective:Tab=tab==='card'?'archive':tab;
    if(dx<0){
      haptic.tick();
      if(currentEffective==='log')go('archive','next');
      else if(currentEffective==='archive')go('studio','next');
      else if(currentEffective==='studio')setSettings(true);
    }else if(dx>0){
      haptic.tick();
      if(tab==='card')go('archive','prev');
      else if(currentEffective==='studio')go('archive','prev');
      else if(currentEffective==='archive')go('log','prev');
    }
  };

  const storageStatus=!repository.ready?'불러오는 중':failedSyncIds?'동기화 확인 필요':repository.pendingCount?`기기 보관 완료 · ${repository.pendingCount}건 동기화 대기`:preferences.pending?'스타일 동기화 대기':repository.status==='failed'?'서버 연결 대기':'동기화 완료';
  return <div className={`test-shell view-${tab} ${tab==='log'?'is-composing':''}`} onPointerDown={onPointerDownShell} onPointerUp={onPointerUpShell}><TestPwa/>
    <header className="test-header"><button className="test-brand" onClick={()=>go('log','prev')} aria-label="L2 로그 작성으로">L2<span>.</span></button><nav aria-label="주요 화면">{([{id:'log',label:'+ 로그'},{id:'archive',label:'로그북'},{id:'studio',label:'스튜디오'}] as const).map(entry=><button key={entry.id} className={tab===entry.id||tab==='card'&&entry.id==='archive'?'active':''} aria-current={tab===entry.id||tab==='card'&&entry.id==='archive'?'page':undefined} onClick={()=>go(entry.id)}>{entry.label}</button>)}</nav><button className="test-settings-button" onClick={()=>setSettings(true)} aria-label="설정 열기">⚙</button></header>
    <PwaInstallBanner pwa={pwa}/>
    <main key={tab} className={`test-main ${slideDir?`slide-${slideDir}`:''}`}>
      {tab==='log'&&<QuickLogComposer editingItem={null} onSave={saveLog} onCancelEdit={()=>{}} onSuggest={suggestSummary} isReady={repository.ready&&preferences.ready} recordCount={archives.length} inboxPlaces={inboxPlaces} onRemoveInboxPlace={(id:string)=>updateInbox(prev=>prev.filter(p=>p.id!==id))} autoPlaceLinkOn={autoPlaceLinkOn}/>}
      {tab==='archive'&&<ArchiveBrowser archives={archives} newId={newId} onOpen={open} onEdit={entry=>{setToast(null);setActiveId(entry.id);setEditingId(entry.id);}} onWrite={()=>go('log','prev')} onBrowseDesign={()=>go('studio','next')} onCreateGroup={createGroup} onDelete={remove} onCoordinates={saveCoordinates} onAutoLinkPlace={autoLinkPlace} fallbackAppearance={fallbackAppearance} listDetailsOn={listDetailsOn} onToggleListDetails={changeListDetails} autoPlaceLinkOn={autoPlaceLinkOn} onToggleAutoPlaceLink={changeAutoPlaceLink}/>}
      {tab==='card'&&actualItem&&<CardWorkspace item={item} slot={appearance.slot} skin={appearance.skin} authorName={appearance.authorName} members={members} presets={preferences.presetSlots} captureRef={captureRef} exportState={exportState} exportError={exportError} applying={applying} onApplyPreset={preset=>void applyPreset(preset)} onApplyLayout={layout=>void applyLayout(layout)} onEdit={()=>{setToast(null);setEditingId(item.id);}} onDownload={()=>void download()} onShare={()=>void share()} onRetryExport={()=>setExportRevision(v=>v+1)} onOpenMember={open}/>}
      {tab==='studio'&&preferences.ready&&<StudioPanel presets={preferences.presetSlots} skins={preferences.skins} defaultPresetId={preferences.defaultPresetId} authorName={preferences.authorName} onSavePreset={savePreset} onDeletePreset={deletePreset} onGenerate={generateSkin} onDeleteSkin={deleteSkin}/>}
    </main>
    <AccessibleDialog open={Boolean(editingItem)} onClose={()=>setEditingId(null)} title={editingItem&&isLogGroup(editingItem)?'그룹 수정':'내용 수정'}>{editingItem&&<div className="record-editor">{isLogGroup(editingItem)?<GroupEditor key={editingItem.id} item={editingItem} archives={archives} onSave={saveGroup}/>:<QuickLogComposer key={editingItem.id} editingItem={editingItem} onSave={saveLog} onCancelEdit={()=>setEditingId(null)} onSuggest={suggestSummary} isReady={repository.ready} recordCount={archives.length} inboxPlaces={inboxPlaces} onRemoveInboxPlace={(id:string)=>updateInbox(prev=>prev.filter(p=>p.id!==id))} autoPlaceLinkOn={autoPlaceLinkOn}/>}<button type="button" className="test-text-button danger" onClick={()=>void remove(editingItem).catch(()=>{})}>로그 삭제</button></div>}</AccessibleDialog>
    {settings&&<SettingsDialog open onClose={()=>setSettings(false)} light={light} onTheme={changeTheme} motion={motion} onMotion={changeMotion} authorName={preferences.authorName} onAuthor={name=>{try{preferences.update({authorName:name});}catch{}}} listDetailsOn={listDetailsOn} onListDetailsChange={changeListDetails} autoPlaceLinkOn={autoPlaceLinkOn} onAutoPlaceLinkChange={changeAutoPlaceLink} recoveryCode={repository.serverSnapshot?.recoveryCode||''} aiUsage={repository.serverSnapshot?.aiUsage||{used:0,limit:30}} onRestore={restore} storageStatus={storageStatus} storageError={repository.error||preferences.error} onRetrySync={()=>{void repository.retrySync();void preferences.retrySync();}} archives={archives} inboxCount={inboxPlaces.length} onImportPlaces={places=>updateInbox(prev=>[...places,...prev].slice(0,200))} pwa={pwa}/>}
    <PwaInstallGuideDialog pwa={pwa}/>
    {toast&&<div className={`test-toast ${toast.tone}`} role={toast.tone==='error'?'alert':'status'}><span className="test-toast-check" aria-hidden="true">{toast.tone==='error'?'!':toast.tone==='success'?'✓':'·'}</span><span>{toast.title}</span>{toast.action&&<button onClick={()=>{toast.action?.();setToast(null);}}>{toast.actionLabel}</button>}<button className="test-toast-close" aria-label="알림 닫기" onClick={()=>setToast(null)}>×</button></div>}
  </div>;
}
