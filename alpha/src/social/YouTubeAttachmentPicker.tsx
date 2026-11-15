'use client';
import {useEffect,useRef,useState} from 'react';
import {LoaderCircle,Play} from 'lucide-react';
import {youtubeVideoId} from '@/lib/youtubeMusic';
import {validYouTubeAttachment,youtubeAttachmentImage,type YouTubeAttachment} from './youtubeAttachment';
export default function YouTubeAttachmentPicker({onSelect}:{onSelect:(video:YouTubeAttachment)=>void}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[video,setVideo]=useState<YouTubeAttachment>();
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 const lookup=async()=>{
  if(busy)return;const id=youtubeVideoId(url);if(!id){setError('유튜브 영상 링크를 확인해주세요.');return;}
  const controller=new AbortController();request.current=controller;setBusy(true);setError('');setVideo(undefined);
  try{const response=await fetch(`/api/music/youtube?url=${encodeURIComponent(url.trim())}`,{signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'영상을 가져오지 못했어요.');const item=data.results?.[0];if(!validYouTubeAttachment(item)||item.videoId!==id)throw Error('영상 정보를 확인하지 못했어요.');setVideo({videoId:item.videoId,title:item.title,channelTitle:item.channelTitle});}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'다시 시도해주세요.');}finally{if(!controller.signal.aborted)setBusy(false);}
 };
 return <div className="lab-youtube-picker"><label className="un-form-label">유튜브 영상 링크<input type="url" value={url} maxLength={2048} placeholder="https://youtu.be/…" autoComplete="off" onChange={e=>{request.current?.abort();setBusy(false);setUrl(e.target.value);setVideo(undefined);setError('');}}/></label><button type="button" className="lab-primary" disabled={busy||!url.trim()} onClick={()=>void lookup()}>{busy?<><LoaderCircle size={16} className="lab-spin"/>불러오는 중…</>:'썸네일 가져오기'}</button>{error&&<p className="lab-error" role="alert">{error}</p>}{video&&<><div className="lab-youtube-preview"><img src={youtubeAttachmentImage(video)} alt=""/><strong>{video.title}</strong><small>{video.channelTitle}</small></div><button type="button" className="lab-primary" onClick={()=>onSelect(video)}><Play size={18}/>이 영상 첨부하기</button></>}<p className="lab-local-note">영상 링크와 썸네일만 연결해요. 끌렉션에는 포함되지 않아요.</p></div>;
}
