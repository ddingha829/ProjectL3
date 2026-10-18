'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { ArchiveItem, CardAppearance, GeoPoint, MapApiPlace, PlaceInboxItem, PresetSlot, SkinTheme } from '@/types/l2';
import { INITIAL_ARCHIVES, INITIAL_SKINS, PRESET_SLOTS } from '@/data/initialData';
import {photoCrop,photoCropKey,type PhotoCrop} from '@/lib/photoCrop';
import { sameCardAppearance } from '@/lib/cardStyle';
import { createCardAppearance } from '@/lib/cardAppearance';
import { assignDefault, defaultPresetFor, reorderPresets, type PresetDefaultScope } from '@/lib/presetDefaults';
import { prepareCardExport, downloadCardFile } from '@/lib/cardExport';
import { cardShareData, googleMapShareUrl } from '@/lib/cardShare';
import { getGroupMembers, isLogGroup } from '@/lib/logGroups';
import { haptic } from '@/lib/haptics';
import { allowsMotion } from '@/lib/motion';
import { fallbackSkinId, visibleSkins } from '@/lib/skinLibrary';
import { useArchiveRepository } from '@/hooks/useArchiveRepository';
import { usePresetPreferences } from '@/hooks/usePresetPreferences';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useFirstVisitGuides, type GuideScreen } from '@/hooks/useFirstVisitGuides';
import FirstVisitGuide from '@/components/FirstVisitGuide';
import QuickLogComposer, { type LogDraft } from '@/components/QuickLogComposer';
import ArchiveBrowser from '@/components/ArchiveBrowser';
import StudioPanel from '@/components/StudioPanel';
import CardWorkspace from '@/components/CardWorkspace';
import SettingsDialog from '@/components/SettingsDialog';
import AccessibleDialog from '@/components/AccessibleDialog';
import GroupEditor from '@/components/GroupEditor';
import TestPwa from '@/components/TestPwa';
import { usePwaInstall, PwaInstallBanner, PwaInstallGuideDialog, PwaFirstLaunchLoginPopup } from '@/components/PwaInstallControl';
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
  const firstGuides=useFirstVisitGuides();
  const repository=useArchiveRepository(),preferences=usePresetPreferences(repository.serverSnapshot),archives=repository.archives;
  const { motion, changeMotion } = useMotionPreference();
  const pwa = usePwaInstall();
  const [tab,setTab]=useState<Tab>('log'),[light,setLight]=useState(false),[settings,setSettings]=useState(false);
  const [listDetailsOn,setListDetailsOn]=useState(true),[autoPlaceLinkOn,setAutoPlaceLinkOn]=useState(true);
  const [font,setFont]=useState<'sebang'|'pretendard'>('sebang');
  const [slideDir,setSlideDir]=useState<'next'|'prev'|null>(null);
  const [activeId,setActiveId]=useState(''),[editingId,setEditingId]=useState<string|null>(null),[newId,setNewId]=useState<string|null>(null);
  const [pendingAppearance,setPendingAppearance]=useState<CardAppearance|null>(null);
  const [pendingPhoto,setPendingPhoto]=useState<PhotoCrop|null>(null);
  const [toast,setToast]=useState<Toast|null>(null),[applying,setApplying]=useState(false),[isSavingLog,setIsSavingLog]=useState(false),[cardSaved,setCardSaved]=useState(false);
  const logSaveLock=useRef(false),cardSaveLock=useRef(false),cardSavedTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [inboxPlaces,setInboxPlaces]=useState<PlaceInboxItem[]>([]);
  const [exportState,setExportState]=useState<'idle'|'preparing'|'ready'|'error'>('idle'),[exportError,setExportError]=useState(''),[exportRevision,setExportRevision]=useState(0);
  const exportFile=useRef<File|null>(null),captureRef=useRef<HTMLDivElement|null>(null),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),savedTimer=useRef<ReturnType<typeof setTimeout>|null>(null),migrating=useRef(new Set<string>());
  const mainRef=useRef<HTMLElement|null>(null),outgoingRef=useRef<HTMLDivElement|null>(null);
  const pendingSwipeTransition=useRef<{dir:'next'|'prev';fromDx:number;width:number}|null>(null);
  const swipeStart=useRef<{x:number;y:number;dx:number;time:number;lockedAxis:'x'|'y'|null;inSwipeRow:boolean}|null>(null);
  const guideScreen:GuideScreen=settings?'settings':tab;
  const dismissGuide=useCallback(()=>firstGuides.dismiss(guideScreen),[firstGuides.dismiss,guideScreen]);

  const notify=useCallback((title:string,actionLabel?:string,action?:()=>void,tone:Toast['tone']='info')=>{if(toastTimer.current)clearTimeout(toastTimer.current);setToast({title,actionLabel,action,tone});toastTimer.current=setTimeout(()=>setToast(null),action?8000:3000);},[]);
  useEffect(()=>{if(repository.serverSnapshot?.requiresReconnect&&repository.error?.includes('보안 업데이트'))notify('보안 업데이트로 다시 연결이 필요해요. 기기 기록은 유지했습니다.','다시 연결',()=>setSettings(true));},[repository.serverSnapshot?.requiresReconnect,repository.error,notify]);
  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);if(savedTimer.current)clearTimeout(savedTimer.current);if(cardSavedTimer.current)clearTimeout(cardSavedTimer.current);},[]);
  useEffect(()=>{setCardSaved(false);},[activeId]);
  useEffect(()=>{
    const url=new URL(window.location.href),result=url.searchParams.get('auth');
    if(!result)return;
    url.searchParams.delete('auth');window.history.replaceState(null,'',url.pathname+url.search+url.hash);
    if(result==='connected')notify('구글 계정에 연결했어요. 비회원 로그도 함께 불러옵니다.',undefined,undefined,'success');
    else {setSettings(true);notify('구글 로그인을 완료하지 못했어요. 다시 시도해 주세요.',undefined,undefined,'error');}
  },[notify]);
  useEffect(()=>{
    try{setLight(localStorage.getItem('l2_test_theme')==='paper');setFont(localStorage.getItem('l2_font_family')==='pretendard'?'pretendard':'sebang');}catch{}
    try{setListDetailsOn(localStorage.getItem(LIST_DETAILS_KEY)!=='off');}catch{}
    try{setAutoPlaceLinkOn(localStorage.getItem(AUTO_PLACE_LINK_KEY)!=='off');}catch{}
    try{const raw=localStorage.getItem(INBOX_STORAGE_KEY);if(raw)setInboxPlaces(JSON.parse(raw));}catch{}
  },[]);
  useEffect(()=>{document.documentElement.classList.toggle('light',light);},[light]);
  const changeFont=(value:'sebang'|'pretendard')=>{setFont(value);document.documentElement.dataset.font=value;try{localStorage.setItem('l2_font_family',value);}catch{}};
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
  const item=useMemo(()=>{const base=actualItem||INITIAL_ARCHIVES[0];return pendingPhoto?{...base,...pendingPhoto}:base;},[actualItem,pendingPhoto]);
  const editingItem=editingId===item.id?item:archives.find(entry=>entry.id===editingId)||null;
  const members=useMemo(()=>getGroupMembers(item,archives),[item,archives]);

  // Immutable fallback appearance for existing records that somehow lack cardAppearance:
  // Always anchored to initial PRESET_SLOTS[0] so changing defaultPresetId in Studio never alters existing cards.
  const fallbackAppearance=useMemo<CardAppearance>(()=>({
    slot:PRESET_SLOTS[0],
    skin:INITIAL_SKINS[PRESET_SLOTS[0].skinId]||INITIAL_SKINS.paper,
    authorName:preferences.authorName
  }),[preferences.authorName]);

  const savedAppearance=useMemo(()=>item.cardAppearance||createCardAppearance(item,PRESET_SLOTS[0],INITIAL_SKINS,item.author||preferences.authorName),[item,preferences.authorName]);
  const appearance=pendingAppearance||savedAppearance;

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

  const go=useCallback((next:Tab,directionOverride?:'next'|'prev',fromDx=0)=>{
    if(logSaveLock.current)return;
    if(next!=='archive'){setNewId(null);if(savedTimer.current)clearTimeout(savedTimer.current);}
    setTab(current=>{
      if(current===next&&fromDx===0)return current;
      const dir=directionOverride||(TAB_ORDER[next]>=TAB_ORDER[current]?'next':'prev');
      if(mainRef.current&&outgoingRef.current&&allowsMotion()){
        const width=mainRef.current.clientWidth||window.innerWidth||360;
        const clone=mainRef.current.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
        clone.inert=true;
        clone.setAttribute('aria-hidden','true');
        clone.style.transform=`translate3d(${fromDx}px, 0, 0)`;
        outgoingRef.current.innerHTML='';
        outgoingRef.current.appendChild(clone);
        const endX=dir==='next'?-width:width;
        const anim=clone.animate(
          [{transform:`translate3d(${fromDx}px, 0, 0)`,opacity:1},{transform:`translate3d(${endX}px, 0, 0)`,opacity:0.35}],
          {duration:340,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'}
        );
        anim.onfinish=()=>{if(outgoingRef.current?.contains(clone))clone.remove();};
        pendingSwipeTransition.current={dir,fromDx,width};
      }
      if(mainRef.current)mainRef.current.style.transform='';
      setSlideDir(dir);
      return next;
    });
    setPendingAppearance(null);setPendingPhoto(null);
    setEditingId(null);
    window.scrollTo({top:0,behavior:'instant'});
  },[]);

  useLayoutEffect(()=>{
    const pending=pendingSwipeTransition.current;
    if(!pending||!mainRef.current||!allowsMotion())return;
    pendingSwipeTransition.current=null;
    const startX=(pending.dir==='next'?pending.width:-pending.width)+pending.fromDx;
    mainRef.current.animate(
      [{transform:`translate3d(${startX}px, 0, 0)`},{transform:'translate3d(0, 0, 0)'}],
      {duration:340,easing:'cubic-bezier(0.22, 1, 0.36, 1)'}
    );
  },[tab,activeId]);

  const open=(entry:ArchiveItem)=>{setToast(null);setPendingAppearance(null);setPendingPhoto(null);setActiveId(entry.id);go('card','next');};
  const arrived=(entry:ArchiveItem)=>{setPendingAppearance(null);setPendingPhoto(null);setActiveId(entry.id);setNewId(entry.id);go('archive','next');if(savedTimer.current)clearTimeout(savedTimer.current);savedTimer.current=setTimeout(()=>setNewId(null),1600);};

  const saveLog=async(draft:LogDraft,acknowledge?:()=>Promise<void>)=>{
    const previous=editingItem;
    if(!draft.title.trim())throw new Error('제목을 입력해 주세요.');
    if(logSaveLock.current)throw new Error('이미 저장 중이에요. 잠시만 기다려 주세요.');
    const photo={img:draft.img,hasPhoto:Boolean(draft.img)};
    const retainedStyle=previous&&pendingAppearance?createCardAppearance({...photo,cat:draft.category},pendingAppearance.slot,{[pendingAppearance.skin.id]:pendingAppearance.skin},pendingAppearance.authorName):null;
    const previousAppearance=previous?.cardAppearance;
    const categoryDefault=defaultPresetFor(draft.category,preferences.presetSlots,preferences.defaultPresetId);
    const cardAppearance=previousAppearance?createCardAppearance(photo,previousAppearance.slot,{[previousAppearance.skin.id]:previousAppearance.skin},previousAppearance.authorName):createCardAppearance(photo,categoryDefault,preferences.skins,preferences.authorName);
    const payload:ArchiveItem={id:previous?.id||crypto.randomUUID(),num:previous?.num||'',cat:draft.category,sub:draft.category,title:draft.title.trim(),quote:draft.body.trim(),loc:draft.place?.loc||'',addressShort:draft.place?.short||'',fullAddress:draft.place?.fullAddress||'',date:previous?.date||dateNow(),timestamp:previous?.timestamp||Date.now(),score:draft.score===null?'':draft.score.toFixed(1),...photo,cropX:draft.cropX,cropY:draft.cropY,cropZoom:draft.cropZoom??1,photoFit:draft.photoFit,good:draft.good.trim(),bad:draft.bad.trim(),note:draft.note.trim(),link:draft.place?.link||'',mapX:draft.place?.x??50,mapY:draft.place?.y??50,author:cardAppearance.authorName,cardAppearance,coordinates:draft.place?.coordinates||null};
    logSaveLock.current=true;setIsSavingLog(true);
    try{const result=await repository.save(payload,Boolean(previous));haptic.success();await acknowledge?.();logSaveLock.current=false;setPendingAppearance(retainedStyle);setPendingPhoto(null);setEditingId(null);setActiveId(result.item.id);if(previous)setTab('card');else arrived(result.item);notify(previous?'수정 내용을 저장했어요':navigator.onLine?'로그북에 저장했어요':'기기에 저장했어요',previous?undefined:'카드 보기',previous?undefined:()=>open(result.item),'success');}
    catch(error){notify('저장하지 못했어요. 입력은 그대로 남아 있어요.',undefined,undefined,'error');throw error;}
    finally{logSaveLock.current=false;setIsSavingLog(false);}
  };

  const remove=async(entry:ArchiveItem)=>{try{await repository.remove(entry.id);if(activeId===entry.id){setPendingAppearance(null);setPendingPhoto(null);setEditingId(null);setTab('archive');setActiveId('');}notify('로그를 삭제했어요','실행 취소',()=>{void repository.save(entry,false).then(()=>notify('로그를 되돌렸어요')).catch(()=>notify('되돌리지 못했어요.',undefined,undefined,'error'));});}catch(error){notify('삭제하지 못했어요. 로그를 유지합니다.',undefined,undefined,'error');throw error;}};
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
  const applyPreset=(preset:PresetSlot)=>{if(applying||!actualItem)return;setCardSaved(false);const cardAppearance=createCardAppearance(item,preset,preferences.skins,preferences.authorName);setPendingAppearance(sameCardAppearance(savedAppearance,cardAppearance)?null:cardAppearance);haptic.snap();};
  const changeCardStyle=(patch:Partial<PresetSlot>)=>{
    if(applying||!actualItem)return;
    const skins=patch.skinId?preferences.skins:{...preferences.skins,[appearance.skin.id]:appearance.skin};
    const next=createCardAppearance(item,{...appearance.slot,...patch},skins,appearance.authorName);
    setCardSaved(false);setPendingAppearance(sameCardAppearance(savedAppearance,next)?null:next);haptic.tick();
  };
  const saveCard=async()=>{if(cardSaveLock.current||!actualItem||!pendingAppearance&&!pendingPhoto)return;cardSaveLock.current=true;setApplying(true);setCardSaved(false);try{await repository.save({...item,author:appearance.authorName,cardAppearance:appearance},true);setPendingAppearance(null);setPendingPhoto(null);setCardSaved(true);if(cardSavedTimer.current)clearTimeout(cardSavedTimer.current);cardSavedTimer.current=setTimeout(()=>setCardSaved(false),1400);haptic.success();notify('로그북에 저장했어요',undefined,undefined,'success');}catch{notify('카드 모양을 저장하지 못했어요.',undefined,undefined,'error');}finally{cardSaveLock.current=false;setApplying(false);}};
  const savePreset=async(preset:PresetSlot,scope?:PresetDefaultScope,order?:string[])=>{
    preferences.update(previous=>{const exists=previous.presetSlots.some(entry=>entry.id===preset.id);if(!exists&&previous.presetSlots.length>=20)throw new Error('프리셋은 20개까지 저장할 수 있어요.');const original=previous.presetSlots.find(entry=>entry.id===preset.id);const committed={...preset,...(original?.defaultFor?{defaultFor:original.defaultFor}:{})};const slots=scope?assignDefault(previous.presetSlots,committed,scope):exists?previous.presetSlots.map(entry=>entry.id===preset.id?committed:entry):[...previous.presetSlots,committed];return {...previous,presetSlots:!scope&&order?reorderPresets(slots,order):slots,defaultPresetId:scope==='ALL'?preset.id:previous.defaultPresetId};});haptic.success();notify(scope?'기본 프리셋으로 설정했어요':'프리셋을 저장했어요',undefined,undefined,'success');
  };
  const reorderPresetList=(ids:string[])=>{preferences.update(previous=>({...previous,presetSlots:reorderPresets(previous.presetSlots,ids)}));};
  const clearCategoryDefault=(category:Exclude<ArchiveItem['cat'],'GROUP'>)=>{preferences.update(previous=>({...previous,presetSlots:previous.presetSlots.map(slot=>({...slot,defaultFor:slot.defaultFor?.filter(value=>value!==category)}))}));};
  const deletePreset=(id:string)=>{
    preferences.update(previous=>{
      if(previous.presetSlots.length<=1||previous.defaultPresetId===id)return previous;
      return {...previous,presetSlots:previous.presetSlots.filter(slot=>slot.id!==id)};
    });
    notify('프리셋을 삭제했어요');
  };
  const deleteSkin=(id:string)=>{
    preferences.update(previous=>{
      if(Object.keys(visibleSkins(previous.skins)).length<=1)throw new Error('색상은 하나 이상 남겨 주세요.');
      const target=previous.skins[id]||INITIAL_SKINS[id];
      if(!target)return previous;
      const nextSkins={...previous.skins,[id]:{...target,hidden:true}};
      const fallback=fallbackSkinId(nextSkins);
      return {...previous,skins:nextSkins,presetSlots:previous.presetSlots.map(slot=>slot.skinId===id?{...slot,skinId:fallback}:slot)};
    });
    notify('팔레트를 삭제했어요');
  };
  const generateSkin=async(prompt:string)=>{const response=await fetch('/api/ai/skin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});if(!response.ok)throw new Error('팔레트를 만들지 못했어요.');const {skin}=await response.json() as {skin:SkinTheme};preferences.update(previous=>({...previous,skins:{...previous.skins,[skin.id]:skin}}));return skin;};


  const currentCardCapture=useCallback(()=>mainRef.current?.querySelector<HTMLDivElement>('.record-card-stage .fit-card-artwork [data-card-capture="true"]')||null,[]);
  useEffect(()=>{
    exportFile.current = null;
    if (tab !== 'card' || !actualItem) { setExportState('idle'); return; }
    let canceled = false;
    setExportState('preparing'); setExportError('');
    const timer = setTimeout(async () => {
      try {
        let node: HTMLDivElement | null = null;
        for (let attempt = 0; attempt < 100 && !canceled; attempt++) {
          const activeCapture=currentCardCapture();
          if (activeCapture?.isConnected) { node = activeCapture; break; }
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        if (canceled) return;
        if (!node) throw new Error('카드가 아직 준비되지 않았어요.');
        const prepared = await prepareCardExport(node, { filename: `L2_${item.title.replace(/[<>:"/\\|?*]/g, '_')}.jpg` });
        if (!canceled) { exportFile.current = prepared.file; setExportState('ready'); }
      } catch (error) {
        if (!canceled) { setExportState('error'); setExportError(error instanceof Error ? error.message : '이미지를 준비하지 못했어요.'); }
      }
    }, 180);
    return () => { canceled = true; clearTimeout(timer); };
  },[tab,actualItem,item,appearance,members,exportRevision]);

  const ensureExportFile=async():Promise<File|null>=>{
    if(exportFile.current)return exportFile.current;
    const node=currentCardCapture();
    if(!node)return null;
    try{
      setExportState('preparing');
      const prepared=await prepareCardExport(node,{filename:`L2_${item.title.replace(/[<>:"/\\|?*]/g,'_')}.jpg`});
      exportFile.current=prepared.file;
      setExportState('ready');
      return prepared.file;
    }catch(error){
      setExportState('error');
      setExportError(error instanceof Error?error.message:'이미지를 준비하지 못했어요.');
      return null;
    }
  };

  const share=async()=>{
    const file=await ensureExportFile();
    if(!file)return;
    const data=cardShareData(item,file),mapUrl=googleMapShareUrl(item);
    const download=()=>{downloadCardFile(file);notify('카드 이미지를 내려받았어요',mapUrl?'지도 링크 복사':undefined,mapUrl?()=>{void navigator.clipboard.writeText(mapUrl).then(()=>notify('지도 링크를 복사했어요')).catch(()=>notify('지도 링크를 복사하지 못했어요.',undefined,undefined,'error'));}:undefined);};
    try{if(navigator.share&&navigator.canShare?.(data))await navigator.share(data);else download();}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))download();}
  };
  const restore=async(code:string)=>{const response=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recoveryCode:code})});const data=await response.json();if(!response.ok)throw new Error(data.error||'복원 코드를 확인해 주세요.');window.location.reload();};

  const springBackMain=(fromDx:number)=>{
    const node=mainRef.current;
    if(!node)return;
    node.style.transform='';
    if(Math.abs(fromDx)>2&&allowsMotion()){
      node.animate(
        [{transform:`translate3d(${fromDx}px, 0, 0)`},{transform:'translate3d(0, 0, 0)'}],
        {duration:240,easing:'cubic-bezier(0.22, 1, 0.36, 1)'}
      );
    }
  };

  // Horizontal swipe navigation across + 로그 (log) <-> 로그북 (archive) <-> 스튜디오 (studio)
  const onPointerDownShell=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(editingItem||logSaveLock.current)return;
    const target=e.target as HTMLElement|null;
    if(!target)return;
    if(target.closest('input, textarea, select, button:not(.logbook-poster), a, [contenteditable="true"], .preset-library, .leaflet-container, [data-crop-interactive], .logbook-spotlight-backdrop, .swipe-log'))return;
    const hScroll=target.closest<HTMLElement>('.preset-rail');
    if(hScroll&&hScroll.scrollWidth>hScroll.clientWidth+4)return;
    const inDialog=target.closest('[role="dialog"]');
    if(inDialog&&!settings)return;
    swipeStart.current={
      x:e.clientX,
      y:e.clientY,
      dx:0,
      time:Date.now(),
      lockedAxis:null,
      inSwipeRow:Boolean(target.closest('.swipe-log'))
    };
  };

  const onPointerMoveShell=(e:React.PointerEvent<HTMLDivElement>)=>{
    const start=swipeStart.current;
    if(!start||editingItem||settings)return;
    const dx=e.clientX-start.x;
    const dy=e.clientY-start.y;
    if(start.lockedAxis===null){
      if(Math.hypot(dx,dy)<10)return;
      if(Math.abs(dx)>Math.abs(dy)*1.25&&!(start.inSwipeRow&&dx<0)){
        start.lockedAxis='x';
      }else{
        start.lockedAxis='y';
        return;
      }
    }
    if(start.lockedAxis!=='x')return;
    const atBoundary=tab==='log'&&dx>0||tab==='studio'&&dx<0;
    const effectiveDx=atBoundary?Math.sign(dx)*Math.min(Math.abs(dx)*0.18,42):dx;
    start.dx=effectiveDx;
    if(mainRef.current){
      mainRef.current.style.transform=`translate3d(${effectiveDx.toFixed(1)}px, 0, 0)`;
    }
  };

  const onPointerCancelShell=()=>{
    const start=swipeStart.current;
    swipeStart.current=null;
    if(start?.lockedAxis==='x')springBackMain(start.dx);
  };

  const onPointerUpShell=(e:React.PointerEvent<HTMLDivElement>)=>{
    const start=swipeStart.current;
    swipeStart.current=null;
    if(!start||editingItem)return;
    const dx=e.clientX-start.x;
    const dy=e.clientY-start.y;
    const elapsed=Math.max(1,Date.now()-start.time);

    if(settings){
      if(dx>68&&Math.abs(dx)>Math.abs(dy)*1.3){
        haptic.tick();
        setSettings(false);
        setSlideDir('prev');
      }
      return;
    }

    if(start.lockedAxis==='y')return;
    const velocity=Math.abs(dx)/elapsed;
    const triggered=(Math.abs(dx)>=58||Math.abs(dx)>=28&&velocity>0.38)&&Math.abs(dx)>Math.abs(dy)*1.2;
    if(!triggered||start.inSwipeRow&&dx<0){
      if(start.lockedAxis==='x')springBackMain(start.dx);
      return;
    }

    const currentEffective:Tab=tab==='card'?'archive':tab;
    if(dx<0){
      haptic.tick();
      if(currentEffective==='log')go('archive','next',start.dx);
      else if(currentEffective==='archive')go('studio','next',start.dx);
      else if(currentEffective==='studio')springBackMain(start.dx);
    }else if(dx>0){
      if(tab==='card'){haptic.tick();go('archive','prev',start.dx);}
      else if(currentEffective==='studio'){haptic.tick();go('archive','prev',start.dx);}
      else if(currentEffective==='archive'){haptic.tick();go('log','prev',start.dx);}
      else springBackMain(start.dx);
    }
  };

  const storageStatus=!repository.ready?'불러오는 중':failedSyncIds?'동기화 확인 필요':repository.pendingCount?`기기 보관 완료 · ${repository.pendingCount}건 동기화 대기`:preferences.pending?'스타일 동기화 대기':repository.status==='failed'?'서버 연결 대기':'동기화 완료';
  return <div className={`test-shell view-${tab} ${tab==='log'?'is-composing':''}`} onPointerDown={onPointerDownShell} onPointerMove={onPointerMoveShell} onPointerUp={onPointerUpShell} onPointerCancel={onPointerCancelShell}><TestPwa/>
    <header className="test-header"><button className="test-brand" disabled={isSavingLog} onClick={()=>go('log','prev')} aria-label="L2 로그 작성으로">L2<span>.</span></button><nav aria-label="주요 화면">{([{id:'log',label:'+ 로그'},{id:'archive',label:'로그북'},{id:'studio',label:'스튜디오'}] as const).map(entry=><button key={entry.id} disabled={isSavingLog} className={tab===entry.id||tab==='card'&&entry.id==='archive'?'active':''} aria-current={tab===entry.id||tab==='card'&&entry.id==='archive'?'page':undefined} onClick={()=>go(entry.id)}>{entry.label}</button>)}</nav><button className="test-settings-button" disabled={isSavingLog} onClick={()=>setSettings(true)} aria-label="설정 열기"><Settings2 size={20} strokeWidth={2} aria-hidden="true"/></button></header>
    <PwaInstallBanner pwa={pwa}/>
    <div className="test-swipe-viewport">
      <div ref={outgoingRef} className="test-outgoing-host" aria-hidden="true"/>
      <main ref={mainRef} key={tab} className={`test-main ${slideDir?`slide-${slideDir}`:''}`}>
        {tab==='log'&&<QuickLogComposer editingItem={null} onSave={saveLog} onCancelEdit={()=>{}} isReady={repository.ready&&preferences.ready} recordCount={archives.length} inboxPlaces={inboxPlaces} onRemoveInboxPlace={(id:string)=>updateInbox(prev=>prev.filter(p=>p.id!==id))} autoPlaceLinkOn={autoPlaceLinkOn}/>}
        {tab==='archive'&&<ArchiveBrowser archives={archives} newId={newId} onOpen={open} onEdit={entry=>{setToast(null);setActiveId(entry.id);setEditingId(entry.id);}} onWrite={()=>go('log','prev')} onBrowseDesign={()=>go('studio','next')} onCreateGroup={createGroup} onDelete={remove} onCoordinates={saveCoordinates} onAutoLinkPlace={autoLinkPlace} fallbackAppearance={fallbackAppearance} listDetailsOn={listDetailsOn} onToggleListDetails={changeListDetails} autoPlaceLinkOn={autoPlaceLinkOn} onToggleAutoPlaceLink={changeAutoPlaceLink}/>}
        {tab==='card'&&actualItem&&<CardWorkspace item={item} slot={appearance.slot} skin={appearance.skin} authorName={appearance.authorName} members={members} presets={preferences.presetSlots} skins={preferences.skins} captureRef={captureRef} exportState={exportState} exportError={exportError} applying={applying} saved={cardSaved} hasPendingChange={Boolean(pendingAppearance||pendingPhoto)} onApplyPreset={preset=>applyPreset(preset)} onChangeStyle={changeCardStyle} onChangePhoto={crop=>{if(applying||!actualItem)return;setPendingPhoto(photoCropKey(crop)===photoCropKey(actualItem)?null:photoCrop(crop));setCardSaved(false);}} onResetStyle={()=>{setPendingAppearance(null);setPendingPhoto(null);setCardSaved(false);}} onEdit={()=>{setToast(null);setEditingId(item.id);}} onSaveCard={()=>void saveCard()} onShare={()=>void share()} onRetryExport={()=>setExportRevision(v=>v+1)} onOpenMember={open}/>}
        {tab==='studio'&&preferences.ready&&<StudioPanel key={repository.serverSnapshot?.deviceId||'local'} presets={preferences.presetSlots} skins={preferences.skins} defaultPresetId={preferences.defaultPresetId} authorName={preferences.authorName} onSavePreset={savePreset} onReorderPresets={reorderPresetList} onClearCategoryDefault={clearCategoryDefault} onDeletePreset={deletePreset} onGenerate={generateSkin} onDeleteSkin={deleteSkin}/>}
      </main>
    </div>
    <AccessibleDialog open={Boolean(editingItem)} onClose={()=>setEditingId(null)} title={editingItem&&isLogGroup(editingItem)?'그룹 수정':'내용 수정'}>{editingItem&&<div className="record-editor">{isLogGroup(editingItem)?<GroupEditor key={editingItem.id} item={editingItem} archives={archives} onSave={saveGroup}/>:<QuickLogComposer key={editingItem.id} editingItem={editingItem} onSave={saveLog} onCancelEdit={()=>setEditingId(null)} isReady={repository.ready} recordCount={archives.length} inboxPlaces={inboxPlaces} onRemoveInboxPlace={(id:string)=>updateInbox(prev=>prev.filter(p=>p.id!==id))} autoPlaceLinkOn={autoPlaceLinkOn}/>}<button type="button" className="test-text-button danger" onClick={()=>void remove(editingItem).catch(()=>{})}>로그 삭제</button></div>}</AccessibleDialog>
    {settings&&<SettingsDialog open font={font} onFont={changeFont} beforeLogin={async()=>{await repository.prepareForLogin();await preferences.prepareForLogin();}} onClose={()=>setSettings(false)} light={light} onTheme={changeTheme} motion={motion} onMotion={changeMotion} authorName={preferences.authorName} onAuthor={name=>{try{preferences.update({authorName:name});}catch{}}} listDetailsOn={listDetailsOn} onListDetailsChange={changeListDetails} autoPlaceLinkOn={autoPlaceLinkOn} onAutoPlaceLinkChange={changeAutoPlaceLink} recoveryCode={repository.serverSnapshot?.recoveryCode||''} aiUsage={repository.serverSnapshot?.aiUsage||{used:0,limit:20}} onRestore={restore} storageStatus={storageStatus} storageError={repository.error||preferences.error} onRetrySync={()=>{void repository.retrySync();void preferences.retrySync();}} onResetLogs={async()=>{await repository.resetAllLogs();setPendingAppearance(null);setPendingPhoto(null);setEditingId(null);setActiveId('');setNewId(null);setToast(null);go('archive','prev');}} archives={archives} inboxCount={inboxPlaces.length} onImportPlaces={places=>updateInbox(prev=>[...places,...prev].slice(0,200))} pwa={pwa} username={repository.serverSnapshot?.username} onReplayGuide={()=>{firstGuides.replay();setSettings(false);go('log','prev');}}/>}
    <PwaInstallGuideDialog pwa={pwa}/>
    <PwaFirstLaunchLoginPopup pwa={pwa} ready={repository.ready} username={repository.serverSnapshot?.username} onOpenSettings={()=>setSettings(true)}/>
    {repository.ready&&preferences.ready&&firstGuides.enabled&&!firstGuides.seen[guideScreen]&&!editingItem&&!isSavingLog&&<FirstVisitGuide key={guideScreen} screen={guideScreen} onDismiss={dismissGuide}/>}
    {toast&&<div className={`test-toast ${toast.tone}`} role={toast.tone==='error'?'alert':'status'}><span className="test-toast-check" aria-hidden="true">{toast.tone==='error'?'!':toast.tone==='success'?'✓':'·'}</span><span>{toast.title}</span>{toast.action&&<button onClick={()=>{toast.action?.();setToast(null);}}>{toast.actionLabel}</button>}<button className="test-toast-close" aria-label="알림 닫기" onClick={()=>setToast(null)}>×</button></div>}
  </div>;
}
