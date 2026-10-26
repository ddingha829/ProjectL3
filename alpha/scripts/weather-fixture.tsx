import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import ComposerWeather from '../src/social/ComposerWeather';
import type {CardWeather} from '../src/social/weatherValidation';
function Fixture(){const [active,setActive]=useState(true),[value,setValue]=useState<CardWeather>(),[generation,setGeneration]=useState(0);return <main><h1>날씨 조회 수명주기 테스트</h1><button onClick={()=>setActive(false)}>접기</button><button onClick={()=>setActive(true)}>열기</button><button onClick={()=>{setValue(undefined);setActive(true);setGeneration(v=>v+1);}}>새 테스트</button><p>작성창: {active?'열림':'접힘'}</p><ComposerWeather key={generation} active={active} value={value} onChange={setValue} place={{id:'fixture',name:'서울 테스트 좌표',area:'서울',lat:37.56,lng:126.98}}/><pre aria-label="조회 결과">{value?JSON.stringify(value):'날씨 없음'}</pre></main>;}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
