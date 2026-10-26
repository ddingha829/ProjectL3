'use client';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {BookOpen,Clapperboard,Utensils,Compass,Star} from 'lucide-react';
import type {LabLog} from './model';
import {DEFAULT_EDITORIAL,editorialColors,cardCorner,mixColor,type EditorialStyle} from './editorialStyle';
import {photoMaterial,type PhotoMaterial} from './cardMaterial';
import {WeatherMark} from './weather';
import {useCardTurn} from './useCardTurn';
import './EditorialCard.css';
export function styleOf(log:LabLog):EditorialStyle{return log.card||{...DEFAULT_EDITORIAL,front:log.design,back:log.category==='book'?'library':log.category==='movie'?'review':'postcard'};}
const labels={daily:'DAILY',dining:'DINING',movie:'CINEMA',book:'BOOKS'};
const icons={daily:Compass,dining:Utensils,movie:Clapperboard,book:BookOpen};
export const cardTitle=(log:LabLog)=>log.work?.title||log.title||log.locationLabel||log.place?.name||new Date(log.createdAt).toLocaleDateString('ko-KR');
const dateOf=(time:number)=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(time).replaceAll('-','.');

export function EditorialFace({log,author,side,appearance}:{log:LabLog;author:string;side:'front'|'back';appearance?:EditorialStyle}){
 const s=appearance||styleOf(log),Icon=icons[log.category]||Compass,date=dateOf(log.createdAt),title=cardTitle(log),place=log.locationLabel||log.place?.name||log.work?.creator||'',meta=[place,date].filter(Boolean).join(' · '),specs=[['GOOD',log.good],['BAD',log.bad],['NOTE',log.note]].filter(row=>row[1]);
 const needed=Boolean(log.image&&(s.finish==='film'||s.finish==='acrylic'||s.ambientBleed)),[material,setMaterial]=useState<{source:string;value?:PhotoMaterial;failed?:boolean}|null>(null);
 useEffect(()=>{let active=true;if(needed)photoMaterial(log.image).then(value=>{if(active)setMaterial({source:log.image,value});}).catch(()=>{if(active)setMaterial({source:log.image,failed:true});});return()=>{active=false;};},[log.image,needed]);
 const prepared=material?.source===log.image?material:undefined,colors=prepared?.value?.colors||[s.accent,s.bg,s.bg,s.accent],layout=side==='front'?s.front:s.back;
 const signature=<span className="ec-signature">@{author.replace(/^@/,'')}</span>;
 const rating=log.rating?<span className="ec-rating"><Star size={15} fill="currentColor"/>{log.rating}</span>:null;
 const category=<span className="ec-category"><Icon size={13}/>{labels[log.category]}</span>;
 const photoBadges=<div className="ec-photo-badges"><span className="ec-glass"><Icon size={14}/>{labels[log.category]}</span>{rating&&<span className="ec-glass">{rating}</span>}</div>;
 const settings=log.photo;
 const photo=<img style={settings?{objectFit:settings.fit,objectPosition:settings.x+'% '+settings.y+'%',transform:'translate('+((50-settings.x)*(settings.zoom-1))+'%, '+((50-settings.y)*(settings.zoom-1))+'%) scale('+settings.zoom+')',filter:'saturate('+settings.saturation/100+') brightness('+settings.brightness/100+') contrast('+settings.contrast/100+')'}:undefined} className="ec-photo" src={s.finish==='film'&&prepared?.value?prepared.value.film:log.image} alt="" draggable={false}/>;
 const variables={...editorialColors(s),'--ec-height':s.ratio==='1:1'?'420px':'747px','--ec-radius':`${cardCorner(layout)}px`,'--ec-material-light':mixColor(s.bg,'#ffffff',.75),'--ec-material-shadow':mixColor(s.bg,'#000000',.36),'--ec-bleed-1':colors[0],'--ec-bleed-2':colors[3]} as CSSProperties;
 const surface=<>{side==='back'&&(s.ambientBleed||s.finish==='acrylic')&&<div className={`ec-color-residue ${s.finish==='acrylic'?'ec-frosted':''}`} aria-hidden="true"/>}{s.finish==='satin'&&<div className="ec-satin-sheen" aria-hidden="true"/>}</>;
 const materialClass=`ec-finish-${s.finish||'none'} ${s.fontMood?`ec-mood-${s.fontMood}`:''}`;
 const materialState=needed&&!prepared?'pending':prepared?.failed?'fallback':'ready';
 const specsView=<div className="ec-specs">{specs.map(([label,value])=><div className="ec-spec ec-flow-block" key={label}><b>{s.back==='vinyl'?`TRACK ${label==='GOOD'?'01':label==='BAD'?'02':'03'} · `:''}{label}</b><p>{value}</p></div>)}</div>;
 if(side==='front')return <div data-ec-face="front" data-ec-layout={s.front} data-ec-material={materialState} className={`ec-face ec-front ec-${s.front} ${materialClass} ${s.ratio==='1:1'?'ec-square':''}`} style={variables}>
  {s.front==='cover'?<>{photo}<div className="ec-cover-shade"/><div className="ec-cover-top"><span className="ec-glass"><Icon size={14}/>{labels[log.category]}</span>{rating&&<span className="ec-glass">{rating}</span>}</div><div className="ec-cover-bottom"><h2>{title}</h2><p className="ec-meta"><span>{meta}</span><WeatherMark value={log.weather}/></p></div></>:s.front==='ticket'?<><div className="ec-ticket-photo">{photo}{photoBadges}</div><div className="ec-ticket-stub"><div><h2>{title}</h2><p className="ec-meta"><span>{meta}</span><WeatherMark value={log.weather}/></p></div><div className="ec-ticket-code"><i className="ec-barcode" aria-hidden="true"/>{signature}</div></div><span className="ec-notch ec-notch-left"/><span className="ec-notch ec-notch-right"/></>:<><div className="ec-polaroid-photo">{photo}{photoBadges}</div><div className="ec-polaroid-meta"><span>{place}</span><span className="ec-meta">{date}<WeatherMark value={log.weather}/></span></div><h2>{title}</h2><p className="ec-polaroid-caption">{log.body}</p>{signature}</>}
  {surface}
 </div>;
 return <div data-ec-face="back" data-ec-layout={s.back} data-ec-material={materialState} className={`ec-face ec-back ec-${s.back} ${materialClass} ${s.ratio==='1:1'?'ec-square':''}`} style={variables}>
  {surface}
  {s.back==='doodle'&&<i className="ec-tape" aria-hidden="true"/>}
  {s.back==='paint'&&<div className="ec-swatch" aria-hidden="true"/>}
  {(['review','day','broadside'] as string[]).includes(s.back)&&<div className="ec-back-topline">{category}{s.back==='review'&&<span className="ec-top-date">{date}</span>}{rating}</div>}
  {s.back==='day'&&<div className="ec-calendar-date"><strong>{new Date(log.createdAt).getDate()}</strong><span>{new Date(log.createdAt).getFullYear()}<i>/</i>{new Date(log.createdAt).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</span></div>}
  <header className="ec-back-header"><div>{!(['review','day','broadside'] as string[]).includes(s.back)&&category}<h2>{title}</h2>{place&&s.back!=='broadside'&&<p>{place}</p>}</div>
   {s.back==='postcard'?<div className="ec-stamp">{rating}<span>{date}</span></div>:s.back==='vinyl'?<div className="ec-disc" aria-hidden="true"><i/></div>:!(['review','day','broadside'] as string[]).includes(s.back)&&rating}
  </header>
  {s.back==='broadside'&&<div className="ec-news-meta"><div><b>DATE</b><span>{date}</span></div>{place&&<div><b>PLACE</b><span>{place}</span></div>}{log.rating&&<div><b>RATING</b><span>★ {log.rating} / 5.0</span></div>}</div>}
  {s.back==='passport'&&<div className="ec-passport-grid"><div><b>LOCATION</b><span>{place||'—'}</span></div><div><b>DATE</b><span>{date}</span></div><div><b>RATING</b><span>{log.rating||'—'}</span></div></div>}
  {s.back==='library'&&<div className="ec-library-grid"><span>TITLE</span><b>{title}</b><span>AUTHOR</span><b>{log.work?.creator||author}</b><span>DATE</span><b>{date}</b></div>}
  <div className="ec-back-scroll" data-ec-scroll role="region" aria-label="전체 리뷰" tabIndex={0}><div className="ec-scroll-inner">
   {log.body&&<blockquote className="ec-quote ec-flow-block" data-ec-quote>{log.body}</blockquote>}
   {specsView}
  </div></div>
  <footer className="ec-back-footer"><span>{s.back==='passport'?`<<<<${author.replace(/\s/g,'').toUpperCase()}<<<<`:date}</span><WeatherMark value={log.weather}/>{signature}</footer>
 </div>;
}

export default function EditorialCard({log,author,appearance,interactive=true,initialSide,hintStrength='normal'}:{log:LabLog;author:string;appearance?:EditorialStyle;interactive?:boolean;initialSide?:'front'|'back';hintStrength?:'normal'|'strong'}){
 const scene=useRef<HTMLDivElement>(null),start=useRef<{x:number;y:number}|null>(null),hintSeen=useRef(false),[hint,setHint]=useState(false),[scale,setScale]=useState(.5),[back,setBack]=useState(initialSide==='back'||!log.image);
 const s=appearance||styleOf(log),canFlip=interactive&&Boolean(log.image);
 const targetBack=useRef(back);targetBack.current=back;
 const turn=useCardTurn(scene,initialSide==='back'||!log.image);
 useLayoutEffect(()=>{const initial=initialSide==='back'||!log.image;setBack(initial);turn.reset(initial);},[log.id,Boolean(log.image),initialSide,turn.reset]);
 useEffect(()=>{if(log.image)turn.turn(back);},[back,Boolean(log.image),turn.turn]);
 useEffect(()=>{
  hintSeen.current=false;setHint(false);
  const element=scene.current;if(!element||!canFlip)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const observer=new IntersectionObserver(entries=>{if(!entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.25)||hintSeen.current)return;hintSeen.current=true;observer.disconnect();if(motion.matches)return;setHint(true);turn.hint(targetBack.current,()=>setHint(false),hintStrength==='strong');},{threshold:.25});
  const stop=()=>{if(motion.matches){setHint(false);turn.reset(targetBack.current);}};motion.addEventListener('change',stop);observer.observe(element);
  return()=>{observer.disconnect();motion.removeEventListener('change',stop);};
 },[log.id,canFlip,turn.hint,turn.reset,hintStrength]);
 useLayoutEffect(()=>{const element=scene.current;if(!element)return;const update=()=>setScale(element.clientWidth/420);update();const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect();},[]);
 const flip=()=>{hintSeen.current=true;setHint(false);if(canFlip&&!window.getSelection()?.toString())setBack(value=>!value);};
 return <div ref={scene} className={`ec-scene ${log.image&&back?'ec-is-back':''} ${canFlip?'ec-interactive':''} ${!log.image?'ec-single':''}`} style={{aspectRatio:s.ratio==='1:1'?'1':'420/747','--ec-scale':scale,'--ec-height':s.ratio==='1:1'?'420px':'747px'} as CSSProperties} data-card-preview data-card-side={!log.image||back?'back':'front'} data-flip-hint={hint?true:undefined} role={canFlip?'button':undefined} tabIndex={canFlip?0:undefined} aria-label={canFlip?`${cardTitle(log)} · ${back?'앞면':'뒷면'}으로 뒤집기`:undefined} aria-pressed={canFlip?back:undefined}
  onPointerDown={event=>{start.current={x:event.clientX,y:event.clientY};}} onPointerUp={event=>{if(start.current&&Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)<7)flip();start.current=null;}} onPointerCancel={()=>{start.current=null;}}
  onClick={event=>{if(event.detail===0)flip();}} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();flip();}}}>
  <div className="ec-logical">{log.image?<div className={`ec-hint-stage ${hint?'ec-hint-active':''}`}><div className="ec-rotator">
   <div ref={turn.front} className="ec-plane ec-front-plane" style={{visibility:turn.visibleBack?'hidden':'visible'}} aria-hidden={turn.visibleBack} inert={turn.visibleBack}><EditorialFace log={log} author={author} side="front" appearance={s}/></div>
   <div ref={turn.rear} className="ec-plane ec-back-plane" style={{visibility:turn.visibleBack?'visible':'hidden'}} aria-hidden={!turn.visibleBack} inert={!turn.visibleBack}><EditorialFace log={log} author={author} side="back" appearance={s}/></div>
  </div></div>:<EditorialFace log={log} author={author} side="back" appearance={s}/>}</div>
 </div>;
}
