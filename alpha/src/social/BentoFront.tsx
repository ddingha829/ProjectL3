'use client';
import {BookOpen,Clapperboard,Compass,Film,Quote,Star,Utensils} from 'lucide-react';
import type {CSSProperties} from 'react';
import type {LabLog} from './model';
import {BENTO_RATIOS,BENTO_RATIO_LABELS,bentoImage,bentoKind} from './bentoLayout';
import './BentoFront.css';

const icons={daily:Compass,dining:Utensils,movie:Clapperboard,book:BookOpen,music:Film,note:Quote};
const labels={daily:'일상',dining:'미식',movie:'영화·드라마',book:'책',music:'음악',note:'일상'};
const dateOf=(time:number)=>new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'numeric',day:'numeric'}).format(time);
export const bentoTitle=(log:LabLog)=>log.work?.title||log.title||log.locationLabel||log.place?.name||(!bentoImage(log)?log.body.trim().slice(0,60):'')||dateOf(log.createdAt);

/** One automatic front for feed, detail, photo adjustment and image export. */
export default function BentoFront({log,author,native=false,canvasHeight}:{log:LabLog;author:string;native?:boolean;canvasHeight?:number}){
 const kind=bentoKind(log),image=bentoImage(log),Icon=icons[kind],title=kind==='note'?log.title.trim()||log.body||bentoTitle(log):bentoTitle(log);
 const location=log.work?.creator||log.locationLabel||log.place?.name||'',meta=location!==title?location:'',photo=log.photo;
 const imageStyle:CSSProperties={objectFit:photo?.fit||'cover',objectPosition:`${photo?.x??50}% ${photo?.y??50}%`,...(photo?{transform:`translate(${(50-photo.x)*(photo.zoom-1)}%, ${(50-photo.y)*(photo.zoom-1)}%) scale(${photo.zoom})`,filter:`saturate(${photo.saturation/100}) brightness(${photo.brightness/100}) contrast(${photo.contrast/100})`}:{})};
 const height=canvasHeight??420/BENTO_RATIOS[kind];
 return <div className={`ec-face ec-front ec-bento ${!image?'ec-bento-paper':''}`} data-ec-face="front" data-ec-layout="bento" data-native-preview={native?'true':undefined} data-bento-kind={kind} data-topic-ratio={BENTO_RATIO_LABELS[kind]} data-card-width="420" data-card-height={height} style={{'--ec-height':`${height}px`,...(native?{width:'100%',height:'auto',aspectRatio:String(BENTO_RATIOS[kind])}:{})} as CSSProperties}>
  <div className="ec-bento-content">
   {image?<><img className="ec-bento-image" src={image} alt="" loading={native?'lazy':undefined} decoding="async" draggable={false} style={imageStyle} onError={event=>{event.currentTarget.style.visibility='hidden';}}/><span className="ec-bento-shade" aria-hidden="true"/></>:<Icon className="ec-bento-watermark" aria-hidden="true"/>}
   <div className="ec-bento-top"><span className="ec-bento-category"><Icon aria-hidden="true"/>{labels[kind]}</span>{log.rating&&<span className="ec-bento-rating" aria-label={`별점 ${log.rating}점`}><Star aria-hidden="true" fill="currentColor"/>{log.rating}</span>}</div>
   <div className="ec-bento-copy">{kind==='note'&&<Quote className="ec-bento-quote" aria-hidden="true"/>}<h2>{title}</h2>{meta&&<p className="ec-bento-meta"><span>{meta}</span></p>}<div className="ec-bento-credit"><time dateTime={new Date(log.createdAt).toISOString()}>{dateOf(log.createdAt)}</time>{log.video&&<span className="ec-bento-video"><Film aria-hidden="true"/>2초</span>}<p className="ec-bento-author"><span>{author}</span></p></div></div>
  </div>
 </div>;
}
