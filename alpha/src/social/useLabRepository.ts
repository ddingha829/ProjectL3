'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {BrowserLabRepository,RepositoryWriteError,type LabRepository} from './repository';
import type {LabState} from './model';

export function useLabRepository(onError:(message:string)=>void){
 const [state,setState]=useState<LabState|null>(null),[repository,setRepository]=useState<LabRepository|null>(null),[loadError,setLoadError]=useState(''),ref=useRef<LabRepository|null>(null),error=useRef(onError);error.current=onError;
 useEffect(()=>{try{const repo=new BrowserLabRepository(localStorage,window);ref.current=repo;setState(repo.snapshot());setRepository(repo);const unsubscribe=repo.subscribe(setState);return()=>{unsubscribe();repo.dispose();ref.current=null;};}catch(e){const message=e instanceof Error?e.message:'기기 저장소를 열지 못했어요.';setLoadError(message);error.current(message);}},[]);
 const commit=useCallback((change:(current:LabState)=>LabState)=>{if(!ref.current)return false;try{ref.current.update(change);return true;}catch(e){if(!(e instanceof RepositoryWriteError))throw e;error.current(e.message);return false;}},[]);
 const getCurrent=useCallback(()=>ref.current?.snapshot()||null,[]);
 return{state,repository,commit,getCurrent,loadError};
}
