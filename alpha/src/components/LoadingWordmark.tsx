'use client';
import {useId,type CSSProperties} from 'react';
import {loadingWordmarkPaths} from './loadingWordmarkPaths';
import './TicgleBrand.css';
import './LoadingWordmark.css';

// Broad pen masks reveal the original filled logo, rather than outlining its edge.
const strokes=[
 [{d:'M210 175 L150 480 Q120 620 290 565',length:534,width:185,delay:0,duration:.48},{d:'M60 325 L310 285',length:254,width:145,delay:0,duration:.48}],
 [{d:'M470 295 L400 585',length:299,width:165,delay:0,duration:.48},{d:'M475 160 L475 164',length:4,width:170,delay:0,duration:.48}],
 [{d:'M850 340 C650 180 450 580 740 575 L850 540',length:679,width:170,delay:0,duration:.48}],
 [{d:'M1215 345 C1070 180 880 385 975 510 C1030 640 1240 520 1260 340 L1190 635 Q1100 810 930 690',length:1502,width:170,delay:0,duration:.48}],
 [{d:'M1480 90 L1390 590',length:509,width:170,delay:0,duration:.48}],
 [{d:'M1570 458 L1830 420 Q1830 270 1690 308 C1470 350 1480 680 1830 550',length:1073,width:170,delay:0,duration:.48}],
];
export default function LoadingWordmark(){
 const id=useId().replace(/:/g,'');
 return <svg className="ticgle-wordmark ticgle-loading-wordmark" viewBox="0 0 1935 813" width={460} height={193} role="img" aria-label="티끌 ticgle">
  <defs>{strokes.map((pen,i)=><mask key={i} id={`${id}-pen-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1935" height="813"><g fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round">{pen.map((s,j)=><path key={j} className="ticgle-pen-stroke" d={s.d} strokeDasharray={s.length} strokeWidth={s.width} style={{'--pen-length':s.length,'--pen-delay':`${s.delay}s`,'--pen-duration':`${s.duration}s`} as CSSProperties}/>)}</g><rect className="ticgle-pen-finish" width="1935" height="813" fill="white"/></mask>)}</defs>
  {loadingWordmarkPaths.map((d,i)=><path key={i} d={d} fill="#F4511E" fillRule="evenodd" mask={`url(#${id}-pen-${i})`} aria-hidden="true"/>)}
 </svg>;
}
