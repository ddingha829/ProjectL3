'use client';
import {useEffect,useRef,useState} from 'react';
import {Cloud,LoaderCircle} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import WeatherInput from './WeatherInput';
import {WeatherMark} from './weather';
import type {CardWeather} from './weatherValidation';
import {requestWeather} from './weatherClient';
import type {Place} from './model';
export default function ComposerWeather({active,value,onChange,place}:{active:boolean;value?:CardWeather;onChange:(weather:CardWeather|undefined)=>void;place?:Place}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),manualKey=useRef(''),valueRef=useRef(value),change=useRef(onChange);valueRef.current=value;change.current=onChange;
 const key=place?place.lat.toFixed(2)+','+place.lng.toFixed(2):'';
 // An aborted lookup must be retried when the sheet opens again, including
 // StrictMode effect replay. Only an explicit manual choice suppresses lookup.
 useEffect(()=>{if(!active||!place||!key||manualKey.current===key||valueRef.current)return;const controller=new AbortController();setBusy(true);setMessage('');
 void(async()=>{try{const weather=await requestWeather(place.lat,place.lng,{signal:controller.signal});if(!controller.signal.aborted&&manualKey.current!==key&&!valueRef.current)change.current(weather);}catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'날씨를 가져오지 못했어요. 다시 시도하거나 직접 입력해주세요.');}finally{if(!controller.signal.aborted)setBusy(false);}})();
 return()=>{controller.abort();setBusy(false);};
 },[active,key,Boolean(value)]);
 return <><button type="button" className="un-composer-weather" aria-label="날씨와 기온" onClick={()=>setOpen(true)}>{busy?<LoaderCircle size={15} className="lab-spin"/>:value?<WeatherMark value={value}/>:<><Cloud size={16}/><span>{message?'다시 조회':'날씨'}</span></>}</button><AccessibleDialog open={open} title="날씨와 기온" onClose={()=>setOpen(false)} panelClassName="lab-dialog lab-story-subdialog">{message&&<p className="lab-weather-message" role="status">{message}</p>}<WeatherInput value={value} onChange={weather=>{manualKey.current=key;setBusy(false);setMessage('');valueRef.current=weather;onChange(weather);}} place={place} canFetch={!!place}/><button className="lab-primary un-full" onClick={()=>setOpen(false)}>완료</button></AccessibleDialog></>;
}
