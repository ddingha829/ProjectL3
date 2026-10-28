'use client';
import {useState} from 'react';
import EditorialCard from '@/social/EditorialCard';
import {BACKS,FRONTS,BACK_NAMES,FRONT_NAMES,DEFAULT_EDITORIAL,EDITORIAL_THEMES,FINISHES,FINISH_NAMES,FONT_MOODS,FONT_MOOD_NAMES,type SurfaceFinish,type FontMood} from '@/social/editorialStyle';
import {seedState,type LabLog} from '@/social/model';

export default function CardShowcase(){
 const [ratio,setRatio]=useState<'9:16'|'1:1'>('9:16'),[themeIndex,setThemeIndex]=useState<number|null>(null);
 const [finish,setFinish]=useState<SurfaceFinish>('none'),[fontMood,setFontMood]=useState<FontMood|undefined>(undefined),[ambientBleed,setAmbientBleed]=useState(false);
 const material={finish,fontMood,ambientBleed};
 const sample:LabLog={...seedState().logs[0],title:'오후의 한 잔',body:'창가로 비스듬히 들어온 빛. 커피가 식을 때까지, 아무것도 서두르지 않아도 괜찮았던 오후.',rating:'4.5',good:'고소한 라테와 갓 구운 피낭시에',bad:'창가 자리는 테이블이 조금 작다',note:'평일 오후가 한적하다',createdAt:new Date(2026,9,24).getTime()};
 const cinema:LabLog={...sample,id:'cinema-sample',category:'movie',image:'/images/cinema.jpg',title:'엔딩이 오래 남는 밤',place:undefined,body:'붉은 복도 끝에서 인물이 멈췄다. 화면의 여백과 느린 호흡이 대사보다 오래 남았다. 엔딩 크레딧이 올라가는 동안, 처음 장면을 다시 떠올렸다.',rating:'4.8',good:'빛과 그림자만으로 감정을 전하는 장면',bad:'초반의 호흡은 다소 느리다',note:'조용한 저녁, 큰 화면으로 보면 좋다'};
 const exhibition:LabLog={...sample,id:'exhibition-sample',category:'daily',image:'/images/museum.jpg',title:'빛이 머무는 방',place:{id:'gallery',name:'한남동 전시 공간',area:'한남동',lat:37.5348,lng:127.0019},body:'어두운 공간 한가운데 빛이 떠 있었다. 설명을 읽기보다 한참 바라보게 된 전시. 잠깐의 고요를 오래 기억하고 싶다.',rating:'4.9',good:'천천히 감상할 수 있는 조용한 동선',bad:undefined,note:'오후 늦은 시간이 한적하다',createdAt:new Date(2026,9,12).getTime()};
 const frontSamples=[sample,cinema,exhibition];
 const themeFor=(fallback:number)=>EDITORIAL_THEMES[themeIndex??fallback];
 return <main className="ec-showcase">
  <header><a href="/">← 로그로</a><h1>앞면 × 뒷면</h1><p>사진은 앞에, 이야기는 뒤에.</p>
   <div className="ec-showcase-ratios">{(['9:16','1:1'] as const).map(r=><button key={r} aria-pressed={r===ratio} onClick={()=>setRatio(r)}>{r}</button>)}</div>
   <div className="ec-showcase-themes"><button aria-pressed={themeIndex===null} onClick={()=>setThemeIndex(null)}>추천 조합</button>{EDITORIAL_THEMES.map((theme,index)=><button key={theme.id} aria-pressed={themeIndex===index} onClick={()=>setThemeIndex(index)}><span aria-hidden="true">{[theme.bg,theme.text,theme.accent].map(color=><i key={color} style={{background:color}}/>)}</span>{theme.name}</button>)}</div>
   <div className="ec-showcase-material" aria-label="질감 비교"><span>표면</span>{FINISHES.map(value=><button key={value} aria-pressed={finish===value} onClick={()=>setFinish(value)}>{FINISH_NAMES[value]}</button>)}</div>
   <div className="ec-showcase-material" aria-label="폰트 비교"><span>폰트</span>{FONT_MOODS.map(value=><button key={value} aria-pressed={(fontMood||'swiss')===value} onClick={()=>setFontMood(value)}>{FONT_MOOD_NAMES[value]}</button>)}<label><input type="checkbox" checked={ambientBleed} onChange={event=>setAmbientBleed(event.target.checked)}/>뒷면 색감 번짐</label></div>
  </header>
  <section><h2>사진 앞면 <small>3 DESIGNS</small></h2><div className="ec-showcase-grid">{FRONTS.map((front,index)=><article key={front}><EditorialCard log={frontSamples[index]} author="archive.soul" appearance={{...DEFAULT_EDITORIAL,...material,...themeFor(index),front,ratio}}/><h3>{FRONT_NAMES[front]}</h3></article>)}</div></section>
  <section><h2>타이포그래피 뒷면 <small>9 DESIGNS</small></h2><div className="ec-showcase-grid">{BACKS.map((back,index)=><article key={back}><EditorialCard log={back==='review'?cinema:back==='day'?exhibition:sample} author="archive.soul" initialSide="back" appearance={{...DEFAULT_EDITORIAL,...material,...themeFor(back==='review'?1:back==='day'?2:back==='broadside'?3:index%4),back,ratio}}/><h3>{BACK_NAMES[back]}</h3></article>)}</div></section>
  <style>{`
   .ec-showcase{min-height:100vh;background:#101014;color:#f1f0eb;padding:40px max(20px,calc((100vw - 1120px)/2));font-family:'NanumBarunGothic',sans-serif}
   .ec-showcase header{margin-bottom:42px}.ec-showcase header>a{font-size:12px;color:#a5a4a9}.ec-showcase h1{font-size:46px;letter-spacing:-.06em;margin:25px 0 8px}.ec-showcase header>p{font-size:14px;color:#a5a4a9}
   .ec-showcase-ratios{display:flex;gap:7px;margin-top:24px}.ec-showcase button{min-height:44px;padding:8px 18px;border:1px solid #ffffff24;border-radius:25px;color:#c5c3cc;transition:background 180ms,color 180ms}.ec-showcase button[aria-pressed=true]{background:#f1f0eb;color:#16151b;border-color:#f1f0eb}.ec-showcase button:focus-visible{outline:2px solid #e6a93c;outline-offset:4px}
   .ec-showcase-themes{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.ec-showcase-themes button{display:flex;align-items:center;gap:9px;font-size:11px;padding:8px 12px}.ec-showcase-themes button>span{display:flex}.ec-showcase-themes i{height:12px;width:12px;margin-left:-2px;border:1px solid #8885;border-radius:50%}
   .ec-showcase-material{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:12px}.ec-showcase-material>span{font-size:11px;color:#a5a4a9;width:32px}.ec-showcase-material button{font-size:11px;padding:8px 12px}.ec-showcase-material label{min-height:44px;display:flex;align-items:center;gap:8px;font-size:11px;padding:0 8px}.ec-showcase-material input{accent-color:#e6a93c;width:17px;height:17px}
   .ec-showcase section{margin-bottom:50px}.ec-showcase section>h2{display:flex;align-items:center;gap:12px;font-size:17px;margin-bottom:22px;padding-top:24px;border-top:1px solid #ffffff16}.ec-showcase section>h2>small{font:9px ui-monospace,monospace;letter-spacing:.1em;color:#8f8e97}
   .ec-showcase-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px}.ec-showcase article{min-width:0}.ec-showcase h3{font-size:12px;text-align:center;margin-top:14px;color:#c6c4cc}.ec-showcase article :global(.ec-scene){filter:drop-shadow(0 10px 12px #0003)}.ec-showcase article :global(.ec-notch){background:#101014}
   @media(max-width:700px){.ec-showcase{padding:24px 16px}.ec-showcase h1{font-size:34px}.ec-showcase-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 12px}.ec-showcase-themes button{font-size:10px}.ec-showcase header{margin-bottom:28px}}
   @media(prefers-reduced-motion:reduce){.ec-showcase button{transition:none}}
  `}</style>
 </main>;
}
