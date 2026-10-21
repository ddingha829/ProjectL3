'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArchiveItem, CardAppearance } from '@/types/l2';
import { privateShareAppearance, privateShareItem, type SharePrivacy } from '@/lib/sharePrivacy';
import { googleMapShareUrl } from '@/lib/cardShare';
import { prepareCardExport } from '@/lib/cardExport';
import AccessibleDialog from './AccessibleDialog';
import CardStage from './CardStage';
import FitCard from './FitCard';
import './ShareCardDialog.css';

export default function ShareCardDialog({item,appearance,members,initialFile,onClose,onSend}:{item:ArchiveItem;appearance:CardAppearance;members:ArchiveItem[];initialFile:File|null;onClose:()=>void;onSend:(file:File,includeMap:boolean)=>Promise<boolean>}) {
  const [options,setOptions]=useState<SharePrivacy>(()=>({location:appearance.slot.showLocation!==false,signature:appearance.slot.showSignature!==false,map:Boolean(googleMapShareUrl(item))}));
  const [file,setFile]=useState<File|null>(initialFile),[error,setError]=useState(''),[sending,setSending]=useState(false),[revision,setRevision]=useState(0);
  const capture=useRef<HTMLDivElement>(null),lock=useRef(false);
  const shareItem=useMemo(()=>privateShareItem(item,options),[item,options.location,options.signature]);
  const style=useMemo(()=>privateShareAppearance(appearance,options),[appearance,options.location,options.signature]);
  const shareMembers=useMemo(()=>members.map(member=>privateShareItem(member,options)),[members,options.location,options.signature]);
  useEffect(()=>{
    let canceled=false;setError('');
    if(initialFile&&options.location===(appearance.slot.showLocation!==false)&&options.signature===(appearance.slot.showSignature!==false)&&!revision){setFile(initialFile);return;}
    setFile(null);
    const timer=setTimeout(async()=>{try{if(!capture.current)throw new Error('미리보기를 준비하지 못했어요.');const prepared=await prepareCardExport(capture.current,{filename:`L2_${item.title.replace(/[<>:"/\\|?*]/g,'_')}.png`});if(!canceled)setFile(prepared.file);}catch(e){if(!canceled)setError(e instanceof Error?e.message:'이미지를 준비하지 못했어요.');}},180);
    return()=>{canceled=true;clearTimeout(timer);};
  },[shareItem,style,shareMembers,initialFile,revision,options.location,options.signature,appearance,item.title]);
  const send=async()=>{if(!file||lock.current)return;lock.current=true;setSending(true);try{if(await onSend(file,options.map))onClose();}catch(e){setError(e instanceof Error?e.message:'공유하지 못했어요.');}finally{lock.current=false;setSending(false);}};
  return <AccessibleDialog open onClose={()=>{if(!sending)onClose();}} title="공유할 카드" description="이번 공유에만 적용돼요. 원본 로그와 프리셋은 유지됩니다." panelClassName="share-card-dialog">
    <div className="share-card-content">
      <div className="share-card-preview"><FitCard ratio={style.slot.ratio}><CardStage item={shareItem} slot={style.slot} skin={style.skin} authorName={style.authorName} selectedItems={shareMembers} curationTitle={shareItem.title} cardCaptureRef={capture}/></FitCard></div>
      <div className="share-card-options" role="group" aria-label="이번 공유의 공개 범위">{([{key:'map',label:'지도 링크'},{key:'location',label:'위치 문구'},{key:'signature',label:'서명'}] as const).map(option=><label key={option.key}><input type="checkbox" checked={options[option.key]} disabled={sending||option.key==='map'&&!googleMapShareUrl(item)} onChange={event=>{if(option.key!=='map')setFile(null);setOptions(current=>({...current,[option.key]:event.target.checked}));}}/><span>{option.label}</span></label>)}</div>
      {error&&<div className="share-card-error" role="alert"><p>{error}</p><button type="button" onClick={()=>setRevision(value=>value+1)}>이미지 다시 준비</button></div>}
      <button type="button" className="test-button primary share-card-submit" disabled={!file||sending} onClick={()=>void send()}>{sending?'공유 중…':file?'선택한 옵션으로 공유':'이미지 준비 중…'}</button>
    </div>
  </AccessibleDialog>;
}
