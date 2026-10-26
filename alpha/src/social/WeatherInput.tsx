'use client';
import {useEffect,useRef,useState} from 'react';
import {CloudDownload,LoaderCircle} from 'lucide-react';
import {WEATHER_CONDITIONS,type CardWeather} from './weatherValidation';
import {requestWeather} from './weatherClient';
import {WEATHER_NAMES,WeatherMark} from './weather';
import type {Place} from './model';
export default function WeatherInput({value,onChange,place,canFetch=false}:{value?:CardWeather;onChange:(value:CardWeather|undefined)=>void;place?:Place;canFetch?:boolean}){
 const [error,setError]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const controller=useRef<AbortController|null>(null),sequence=useRef(0);
 const lat=place?.lat,lng=place?.lng;
 useEffect(()=>{sequence.current++;controller.current?.abort();setBusy(false);setMessage('');return()=>{sequence.current++;controller.current?.abort();};},[lat,lng,canFetch]);
 const manual=(next:CardWeather|undefined)=>{sequence.current++;controller.current?.abort();setBusy(false);setMessage('');setError(false);onChange(next?{condition:next.condition,temperature:next.temperature}:undefined);};
 const lookup=async()=>{
  if(!canFetch||lat===undefined||lng===undefined||busy)return;
  const token=++sequence.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;setBusy(true);setMessage('');
  try{
   const weather=await requestWeather(lat,lng,{signal:abort.signal});
   if(token!==sequence.current)return;
   setError(false);onChange(weather);
  }catch(error){if(token===sequence.current)setMessage(error instanceof Error&&error.name!=='AbortError'?error.message:'연결이 지연되고 있어요. 직접 입력하거나 다시 시도해주세요.');}
  finally{if(token===sequence.current)setBusy(false);}
 };
 const observed=value?.observation;
 return <fieldset className="lab-weather-input"><legend>그날의 공기 <small>선택</small></legend>
  <div className="lab-weather-fetch"><button type="button" disabled={!canFetch||!place||busy} onClick={()=>void lookup()}>{busy?<LoaderCircle size={16} className="lab-spin"/>:<CloudDownload size={16}/>}<span>{busy?'날씨 가져오는 중…':'현재 날씨 가져오기'}</span></button><small>{place&&canFetch?place.name+' 기준 · 장소 좌표로 조회해요':'장소를 선택하면 현재 날씨를 가져올 수 있어요. 직접 입력해도 좋아요.'}</small></div>
  {message&&<p role="status" className="lab-weather-message">{message}</p>}
  <div className="lab-weather-choices"><button type="button" aria-pressed={!value} onClick={()=>manual(undefined)}>없음</button>{WEATHER_CONDITIONS.map(condition=><button type="button" key={condition} aria-label={WEATHER_NAMES[condition]} aria-pressed={value?.condition===condition} onClick={()=>manual({...value,condition})}><WeatherMark value={{condition}}/><span>{WEATHER_NAMES[condition]}</span></button>)}</div>
  {value&&<label>온도 <small>선택 · °C</small><input aria-label="기록한 날의 온도" type="number" inputMode="decimal" min="-60" max="60" step=".1" value={value.temperature??''} onChange={event=>{const raw=event.target.value,n=Number(raw);if(raw===''||Number.isFinite(n)&&n>=-60&&n<=60)manual({...value,temperature:raw===''?undefined:n});else setError(true);}}/>{error&&<span role="alert">-60~60°C 사이로 입력해주세요.</span>}</label>}
  {observed&&<p className="lab-weather-credit"><a href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer">WeatherAPI.com</a> · {new Date(observed.observedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 관측 · 기록에 보관돼요</p>}
 </fieldset>;
}
