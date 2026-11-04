'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowUpRight,Check,Link2,LoaderCircle,Moon,Music2,Search,Sun,SquarePlay} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import {useThemePreference} from '@/hooks/useThemePreference';
import type {YouTubeMusicResult} from '@/lib/youtubeMusic';
import styles from './YouTubeMusicTest.module.css';

export default function YouTubeMusicTest(){
 const {changeTheme}=useThemePreference();
 const [dark,setDark]=useState(false),[mode,setMode]=useState<'link'|'search'>('link'),[searchAvailable,setSearchAvailable]=useState<boolean|null>(null);
 const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[results,setResults]=useState<YouTubeMusicResult[]|null>(null);
 const [selected,setSelected]=useState<YouTubeMusicResult|null>(null),[note,setNote]=useState(''),[consent,setConsent]=useState(false);
 const request=useRef<AbortController|null>(null),sequence=useRef(0);
 useEffect(()=>{
  setDark(!document.documentElement.classList.contains('light'));
  const controller=new AbortController();
  fetch('/api/music/search/?status=1',{signal:controller.signal}).then(response=>response.ok?response.json():null).then(data=>{if(data)setSearchAvailable(data.searchAvailable===true);}).catch(()=>{});
  return()=>{controller.abort();request.current?.abort();sequence.current++;};
 },[]);
 function reset(nextMode:'link'|'search'){
  request.current?.abort();sequence.current++;setMode(nextMode);setInput('');setResults(null);setError('');setBusy(false);
 }
 async function submit(event:FormEvent){
  event.preventDefault();if(!input.trim()||!consent)return;
  request.current?.abort();const controller=new AbortController();request.current=controller;const id=++sequence.current;
  setBusy(true);setError('');setResults(null);
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const params=new URLSearchParams({[mode==='link'?'url':'q']:input.trim()});
   const response=await fetch(`/api/music/search/?${params}`,{signal:controller.signal,headers:{'X-L2-Request':'1'}}),data=await response.json();
   if(!response.ok)throw Error(typeof data.error==='string'?data.error:'불러오지 못했어요. 다시 시도해주세요.');
   if(id===sequence.current)setResults(Array.isArray(data.results)?data.results:[]);
  }catch(cause){if(id===sequence.current)setError(controller.signal.aborted?'연결이 늦어지고 있어요. 다시 시도해주세요.':cause instanceof Error?cause.message:'정보를 불러오지 못했어요.');}
  finally{clearTimeout(timer);if(id===sequence.current)setBusy(false);}
 }
 const disabled=!input.trim()||!consent||busy||(mode==='search'&&searchAvailable!==true);
 return <main className={styles.page}>
  <header className={styles.header}>
   <a href="/" className={styles.back} aria-label="티끌 피드로 돌아가기"><ArrowLeft size={20}/></a>
   <img src="/brand/ticgle-wordmark-a.svg" alt="ticgle" width="98" height="34"/>
   <button type="button" className={styles.theme} aria-label={dark?'밝은 화면으로 보기':'다크 화면으로 보기'} onClick={()=>{setDark(!dark);changeTheme(dark?'light':'dark');}}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>
  </header>
  <div className={styles.eyebrow}><Music2 size={15} aria-hidden="true"/>음악 티끌 <span>연동 테스트</span></div>
  <h1>오늘은 어떤 곡을<br/>남기고 싶나요?</h1>
  <p className={styles.intro}>좋아하는 음악에, 지금의 마음을 더해요.</p>
  <section className={styles.finder} aria-label="YouTube 음악 찾기">
   <div className={styles.modes} role="group" aria-label="음악 찾는 방법">
    <button type="button" aria-pressed={mode==='link'} onClick={()=>reset('link')}><Link2 size={17} aria-hidden="true"/>링크로 가져오기</button>
    <button type="button" aria-pressed={mode==='search'} onClick={()=>reset('search')}><Search size={17} aria-hidden="true"/>제목으로 찾기</button>
   </div>
   <form onSubmit={submit}>
    <label htmlFor="music-query">{mode==='link'?'YouTube · YouTube Music 링크':'곡 제목 또는 아티스트'}</label>
    <div className={styles.inputRow}>
     <input id="music-query" type={mode==='link'?'url':'search'} inputMode={mode==='link'?'url':'search'} placeholder={mode==='link'?'https://music.youtube.com/watch?v=…':'예: 아이유 밤편지'} maxLength={mode==='link'?2048:100} autoCapitalize="none" autoComplete="off" enterKeyHint="search" value={input} onChange={event=>setInput(event.target.value)} aria-describedby="music-help"/>
     <button type="submit" disabled={disabled} aria-label={busy?'음악 정보 불러오는 중':mode==='link'?'링크 정보 가져오기':'음악 검색'}>{busy?<LoaderCircle className={styles.spinner} size={20}/>:<ArrowUpRight size={21}/>}</button>
    </div>
    <p id="music-help" className={styles.help}>{mode==='link'?'공유 메뉴에서 복사한 영상 링크를 붙여넣어주세요.':searchAvailable===null?'검색 연결 상태를 확인하고 있어요.':searchAvailable?'음악 카테고리에서 최대 6개의 영상을 찾아요.':'제목 검색은 연결 준비 중이에요. 지금은 링크로 가져와주세요.'}</p>
    <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>아래 개인정보 안내를 확인하고 정보 전달에 동의해요.</span></label>
   </form>
  </section>
  <div role="status" aria-live="polite" className={styles.status}>{busy?<><LoaderCircle size={16} className={styles.spinner}/>음악 정보를 가져오고 있어요.</>:results?results.length?`${results.length}개의 영상을 찾았어요. 음악을 선택해보세요.`:'검색 결과가 없어요. 다른 제목이나 링크로 찾아보세요.':null}</div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {results&&results.length>0?<section aria-label="음악 검색 결과" className={styles.results}>
   {results.map(item=><article key={item.videoId} className={styles.result}>
    <button type="button" className={styles.choose} onClick={()=>{setSelected(item);setNote('');}} aria-label={`${item.title} 음악 티끌 미리보기`}>
     <span className={styles.artwork} style={{aspectRatio:`${item.thumbnailWidth}/${item.thumbnailHeight}`}}><img src={item.thumbnailUrl} width={item.thumbnailWidth} height={item.thumbnailHeight} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"/></span>
     <span className={styles.resultCopy}><small><SquarePlay size={14} aria-hidden="true"/>YouTube</small><strong>{item.title}</strong><span>{item.channelTitle}</span><span className={styles.chooseLabel}>음악 티끌로 미리보기 <ArrowUpRight size={15} aria-hidden="true"/></span></span>
    </button>
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.source}>YouTube에서 원본 보기 <ArrowUpRight size={14} aria-hidden="true"/></a>
   </article>)}
  </section>:!busy&&!error&&results===null?<section className={styles.empty}>
   <span className={styles.emptyIcon}><Music2 size={28} strokeWidth={1.5}/></span>
   <h2>한 곡에 담긴, 오늘의 취향</h2>
   <p>YouTube에서 곡을 고르고<br/>공유 링크를 가져와보세요.</p>
  </section>:null}
  <footer className={styles.footer}>
   <p><Check size={15} aria-hidden="true"/>미리보기 화면이에요. 실제 피드에는 등록되지 않아요.</p>
   <details><summary>YouTube 이용 · 개인정보 안내</summary><p>이 화면은 YouTube API 서비스를 사용해요. 입력한 검색어·영상 링크를 YouTube에 전달하며, 조회한 제목·채널명·썸네일 주소는 24시간 동안 캐시로 재사용해요. 요청 횟수 제한을 위해 무작위 브라우저 식별자를 쿠키에 보관해요. YouTube 썸네일을 표시할 때 Google에 접속 정보가 전달될 수 있어요. 음악이나 영상을 내려받거나 별도로 저장하지 않아요.</p><p>이 기능을 이용하면 YouTube 이용약관이 적용돼요. 문의는 앱 설정의 ‘문제 알리기’를 이용해주세요.</p></details>
   <div><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube 이용약관</a><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a></div>
  </footer>
  <AccessibleDialog open={!!selected} title="음악 티끌 미리보기" description="고른 음악에 짧은 마음을 남겨보세요." onClose={()=>setSelected(null)} closeLabel="음악 미리보기 닫기" scrollBody springSheet panelClassName={styles.dialog}>
   {selected&&<>
    <article className={styles.preview}>
     <img className={styles.previewArt} src={selected.thumbnailUrl} width={selected.thumbnailWidth} height={selected.thumbnailHeight} style={{aspectRatio:`${selected.thumbnailWidth}/${selected.thumbnailHeight}`}} alt={`${selected.title} 영상 썸네일`} referrerPolicy="no-referrer"/>
     <div className={styles.previewBody}><span className={styles.previewTag}><Music2 size={14} aria-hidden="true"/>음악 <span>· YouTube</span></span><h3>{selected.title}</h3><p>{selected.channelTitle}</p>{note.trim()&&<blockquote>{note}</blockquote>}</div>
    </article>
    <label className={styles.noteLabel} htmlFor="music-note">이 곡을 남기는 이유</label>
    <textarea id="music-note" className={styles.note} rows={3} maxLength={300} placeholder="집으로 돌아가는 길, 한 번 더 듣고 싶었던 곡." value={note} onChange={event=>setNote(event.target.value)}/>
    <a className={styles.listen} href={selected.url} target="_blank" rel="noopener noreferrer"><SquarePlay size={20} aria-hidden="true"/>YouTube에서 듣기<ArrowUpRight size={18} aria-hidden="true"/></a>
    <p className={styles.previewNote}>작성한 내용은 이 미리보기에서만 보여요.</p>
   </>}
  </AccessibleDialog>
 </main>;
}
