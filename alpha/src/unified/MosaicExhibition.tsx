'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,LoaderCircle,Share2,MessageCircle} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import TicgleWordmark from '@/components/TicgleBrand';
import {cardTitle,styleOf} from '@/social/EditorialCard';
import {prepareCardExport,downloadCardFile,isShareCanceled} from '@/lib/cardExport';
import {prepareKakaoCard} from '@/lib/kakaoCardShare';
import type {UnifiedLog} from './store';
import './MosaicExhibition.css';

export default function MosaicExhibition({logs,title,page,contributors,onClose}:{logs:UnifiedLog[];title:string;page:number;contributors:string[];onClose:()=>void}){
 const root=useRef<HTMLDivElement>(null),alive=useRef(true),lock=useRef(false),kakao=useRef<(()=>void)|null>(null);
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[kakaoReady,setKakaoReady]=useState(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const prepare=async()=>{if(!root.current||lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await prepareCardExport(root.current,{filename:`ticgle-collection-${page+1}.png`,pixelRatio:3});if(alive.current)setFile(result.file);}catch(e){if(alive.current)setError(e instanceof Error?e.message:'이미지를 준비하지 못했어요.');}finally{lock.current=false;if(alive.current)setBusy(false);}};
 const share=async()=>{if(!file||lock.current)return;lock.current=true;setBusy(true);setError('');try{await navigator.share({files:[file]});}catch(e){if(alive.current&&!isShareCanceled(e))setError('공유를 열지 못했어요. 이미지 저장을 이용해주세요.');}finally{lock.current=false;if(alive.current)setBusy(false);}};
 const shareKakao=async()=>{if(!file||lock.current)return;lock.current=true;setBusy(true);setError('');try{if(kakao.current)kakao.current();else{const open=await prepareKakaoCard(file,title);if(alive.current){kakao.current=open;setKakaoReady(true);}}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'카카오톡 공유를 준비하지 못했어요.');}finally{lock.current=false;if(alive.current)setBusy(false);}};
 return <AccessibleDialog open title="완성된 끌렉션" onClose={onClose} panelClassName="lab-dialog mosaic-exhibition" scrollBody>
  <div className="mosaic-exhibition-preview"><div ref={root} className="mosaic-print"><header><span>ticgle collection</span><span>VOL. {String(page+1).padStart(2,'0')}</span></header><h2>{title}</h2><p>작은 취향이 모여, 하나의 장면.</p><div className="mosaic-print-grid">{logs.map(log=><div key={log.id}>{log.image?<img src={log.image} alt={cardTitle(log)} crossOrigin="anonymous"/>:<span style={{background:styleOf(log).bg,color:styleOf(log).text}}>{cardTitle(log)}</span>}</div>)}</div><footer><div><strong>16개의 취향, 한 장의 끌렉션</strong><span>{contributors.join(' · ')}</span></div><TicgleWordmark/></footer></div></div>
  <div className="mosaic-exhibition-actions">{!file?<button className="un-primary" disabled={busy} onClick={()=>void prepare()}>{busy?<LoaderCircle size={16} className="lab-spin"/>:<Share2 size={16}/>} {busy?'이미지 만드는 중':'저장·공유 이미지 만들기'}</button>:<><button className="un-outline" disabled={busy} onClick={()=>downloadCardFile(file)}><Download size={16}/>이미지 저장</button>{navigator.canShare?.({files:[file]})&&<button className="un-outline" disabled={busy} onClick={()=>void share()}><Share2 size={16}/>기기 공유</button>}<button className="mosaic-exhibition-kakao" disabled={busy} onClick={()=>void shareKakao()}>{busy?<LoaderCircle className="lab-spin" size={16}/>:<MessageCircle size={16}/>} {kakaoReady?'카카오톡 열기':'카카오톡 공유 준비'}</button></>}</div>
  {file&&<p className="mosaic-exhibition-note">받을 사람은 공유 화면에서 선택해요.</p>}{error&&<p role="alert" className="lab-error">{error}</p>}
 </AccessibleDialog>;
}
