'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {DownloadIcon,type DownloadIconHandle} from '@/components/icons/download';
import {CheckIcon,type CheckIconHandle} from '@/components/icons/check';

export default function ExportActionIcon({working,done,stage,children}:{working:boolean;done:boolean;stage:string;children:ReactNode}){
 const download=useRef<DownloadIconHandle>(null),check=useRef<CheckIconHandle>(null);
 useEffect(()=>{if(working)download.current?.startAnimation();if(done)check.current?.startAnimation();return()=>{download.current?.stopAnimation();check.current?.stopAnimation();};},[working,done,stage]);
 return <span className="lab-export-icon" aria-hidden="true">{working?<DownloadIcon ref={download} size={17} duration={.65} isAnimated={false}/>:done?<CheckIcon ref={check} size={17} duration={.65} isAnimated={false}/>:children}</span>;
}
