'use client';
import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {BookOpen,Check,Clapperboard,Compass,Film,Moon,Music2,Quote,Star,Sun,Utensils} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import UnifiedApp,{type FeedPresentationProps} from '@/unified/UnifiedApp';
import {cardTitle} from '@/social/EditorialCard';
import {BENTO_RATIOS,bentoLayout,type BentoKind} from './bentoLayout';
import styles from './BentoTestApp.module.css';

type Tile={id:string;kind:BentoKind;title:string;body:string;image:string;author:string;creator?:string;rating?:string;log?:FeedPresentationProps['logs'][number]};
const labels:Record<BentoKind,string>={daily:'일상',dining:'미식',movie:'영화',book:'책',music:'음악',note:'일상'};
const icons={daily:Compass,dining:Utensils,movie:Clapperboard,book:BookOpen,music:Music2,note:Quote};
// Deliberately separate from UnifiedLog: preview music never enters storage or a server request.
const examples:Tile[]=[
 {id:'example-cafe',kind:'dining',title:'느리게 마신 오후',body:'햇빛이 좋은 창가에 앉아, 커피 한 잔만큼 천천히 쉬었다.',image:'/images/studio-cafe.png',author:'준혁',rating:'4.5'},
 {id:'example-music',kind:'music',title:'밤의 산책',creator:'서윤',body:'집으로 돌아가는 길에 한 번 더 듣고 싶었던 곡.',image:'',author:'수현'},
 {id:'example-book',kind:'book',title:'작은 숲의 문장들',creator:'은지',body:'좋아하는 문장에 밑줄을 긋다 보니, 책장이 온통 작은 숲이 됐다.',image:'',author:'지우',rating:'4.5'},
 {id:'example-movie',kind:'movie',title:'오후의 장면',creator:'가상 작품',body:'엔딩 크레딧이 올라간 뒤에도 오래 남는 장면.',image:'/images/cinema.jpg',author:'지원',rating:'4.0'},
 {id:'example-note',kind:'note',title:'좋아하는 것들이 조금씩 모이는 중.',body:'특별하지 않아도, 남겨두고 싶은 오늘이 있다.',image:'',author:'수현'},
 {id:'example-daily',kind:'daily',title:'빛을 따라 걸었다',body:'천천히 돌아본 전시. 한동안 이 빛 앞에 서 있었다.',image:'/images/museum.jpg',author:'민수'},
 {id:'example-food',kind:'dining',title:'오늘 저녁은 여기에',body:'맛있는 한 끼와 밀린 이야기.',image:'/images/korean.jpg',author:'지우'},
];

function Artwork({tile}:{tile:Tile}){
 if(tile.image){const photo=tile.log?.photo;return <img src={tile.image} alt="" loading="lazy" decoding="async" draggable={false} style={photo?{objectPosition:`${photo.x}% ${photo.y}%`,filter:`saturate(${photo.saturation}%) brightness(${photo.brightness}%) contrast(${photo.contrast}%)`}:undefined}/>;}
 if(tile.kind==='music')return <span className={styles.albumArt} aria-hidden="true"><i/><b/><em/></span>;
 if(tile.kind==='book')return <span className={styles.bookArt} aria-hidden="true"><svg viewBox="0 0 180 160"><path d="M-15 160Q58 114 48 25M8 146Q90 125 104 50M68 165Q125 126 166 14M116 171Q160 134 192 79"/><path d="M46 62L20 39M49 79L72 47M42 106L12 83M78 115L63 78M93 86L122 73M135 76L113 42M153 42L177 37M137 117L171 103M158 140L152 112"/></svg></span>;
 return null;
}

function TileFace({tile}:{tile:Tile}){
 const Icon=icons[tile.kind],paper=tile.kind==='note'||tile.kind==='book'&&!tile.image;
 return <>
  <Artwork tile={tile}/>
  {!paper&&<span className={styles.shade} aria-hidden="true"/>}
  <span className={styles.topline}><span className={styles.category}><Icon size={11} aria-hidden="true"/>{labels[tile.kind]}</span>{tile.rating&&<span className={styles.rating} aria-label={`별점 ${tile.rating}점`}><Star size={12} fill="currentColor" aria-hidden="true"/>{tile.rating}</span>}</span>
  <span className={styles.copy}>{tile.kind==='note'&&<Quote className={styles.quoteMark} size={24} aria-hidden="true"/>}<strong>{tile.title}</strong>{tile.creator&&<span className={styles.creator}>{tile.creator}</span>}<small>{tile.kind==='music'?<Music2 size={12} aria-hidden="true"/>:tile.log?.video?<Film size={12} aria-hidden="true"/>:null}{tile.author}</small></span>
 </>;
}

function BentoFeed(props:FeedPresentationProps){
 const sample=props.previewActive,setSample=props.onPreviewChange;
 const [preview,setPreview]=useState<Tile|null>(null),[width,setWidth]=useState(0),root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const node=root.current;if(!node)return;const update=()=>setWidth(node.getBoundingClientRect().width);update();const observer=new ResizeObserver(update);observer.observe(node);return()=>observer.disconnect();},[]);
 const real:Tile[]=props.logs.map(log=>{const kind=log.category==='book'?'book':log.category==='movie'?'movie':!log.image?'note':log.category;return {id:log.id,kind,title:kind==='note'?log.title.trim()||log.body||cardTitle(log):cardTitle(log),body:log.body,image:log.image||log.work?.image||'',author:props.people.find(person=>person.id===log.authorId)?.name||'사용자',creator:log.work?.creator,rating:log.rating,log};});
 const query=props.query.trim().toLowerCase();
 const filtered=examples.filter(tile=>(props.category==='all'||(tile.kind==='note'?'daily':tile.kind)===props.category)&&(!props.photosOnly||Boolean(tile.image)||tile.kind==='music')&&(!query||`${tile.title} ${tile.body} ${tile.creator||''} ${tile.author}`.toLowerCase().includes(query)));
 const tiles=sample?(props.sort==='old'?[...filtered].reverse():filtered):real;
 const layout=bentoLayout(tiles.map(tile=>tile.kind),width);
 return <section className={styles.review} aria-label="벤토 피드 디자인 테스트">
  <div className={styles.reviewBar}><span>벤토 피드 <small>TEST</small></span><div><a href="/">기존 피드</a><button type="button" onClick={props.onToggleTheme} aria-label={props.dark?'밝은 화면으로 보기':'다크 화면으로 보기'}>{props.dark?<Sun size={17}/>:<Moon size={17}/>}</button></div></div>
  <div className={styles.source} role="group" aria-label="테스트에 사용할 카드"><button type="button" aria-pressed={!sample} onClick={()=>setSample(false)}>내 피드</button><button type="button" aria-pressed={sample} onClick={()=>setSample(true)}>주제별 예시 <Music2 size={13} aria-hidden="true"/></button></div>
  {sample&&<p className={styles.caption}>음악을 포함한 디자인 예시예요. 실제 티끌로 저장되지 않아요.</p>}
  <div ref={root} className={`${styles.grid} un-grid`} data-ready={width>0} aria-busy={props.busy} style={width?{height:layout.height}:undefined}>
   {tiles.map((tile,index)=><article key={tile.id} className={`${styles.tile} ${styles[tile.kind]} ${!tile.image?styles.withoutPhoto:''}`} data-log-id={tile.log?.id} style={{aspectRatio:String(BENTO_RATIOS[tile.kind]),...(width?{position:'absolute',...layout.tiles[index]}:{})} as CSSProperties}>
    <button type="button" className={styles.open} aria-label={`${tile.title} ${tile.log?'상세 보기':'예시 보기'}`} aria-pressed={tile.log&&props.selecting?props.picked.includes(tile.id):undefined} onClick={()=>tile.log?props.onOpen(tile.log):setPreview(tile)}><TileFace tile={tile}/>{tile.log&&props.selecting&&<span className={styles.selection}>{props.picked.includes(tile.id)&&<Check size={16} aria-hidden="true"/>}</span>}</button>
   </article>)}
  </div>
  {sample&&!tiles.length&&<p className={styles.empty}>조건에 맞는 예시가 없어요. 검색어나 카테고리를 바꿔보세요.</p>}
  <AccessibleDialog open={!!preview} title={preview?.kind==='music'?'음악 티끌 예시':'티끌 디자인 예시'} onClose={()=>setPreview(null)} panelClassName="lab-dialog">
   {preview&&<div className={styles.detail}><div className={`${styles.tile} ${styles[preview.kind]} ${!preview.image?styles.withoutPhoto:''}`} style={{aspectRatio:String(BENTO_RATIOS[preview.kind])}}><TileFace tile={preview}/></div><h3>{preview.title}</h3>{preview.creator&&<p className={styles.detailCreator}>{preview.creator}</p>}<p>{preview.body}</p>{preview.kind==='music'&&<p className={styles.caption}>음악 검색·재생 API는 아직 연결하지 않은 디자인 예시예요.</p>}</div>}
  </AccessibleDialog>
 </section>;
}

export default function BentoTestApp(){return <UnifiedApp renderFeed={props=><BentoFeed {...props}/>}/>;}
