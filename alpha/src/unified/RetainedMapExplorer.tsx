'use client';
import {useRef,type ComponentProps} from 'react';
import MapExplorer from './MapExplorer';
type Props=ComponentProps<typeof MapExplorer>&{active:boolean;loading:boolean;busy:boolean;onRetry:()=>void};
/** Paint the base immediately; retain only complete, same-scope map records. */
export default function RetainedMapExplorer({active,loading,busy,onRetry,...props}:Props){
 const snapshot=useRef<typeof props|null>(null);
 if(active&&!loading)snapshot.current=props;
 const retained=!active?snapshot.current:!loading?props:snapshot.current?.scopeKey===props.scopeKey?snapshot.current:null;
 if(!active&&!retained)return null;
 return <div hidden={!active} inert={!active} className="un-retained-map"><MapExplorer {...(retained||props)} logs={retained?.logs||[]} dark={props.dark} active={active} recordsLoading={loading} recordsBusy={busy} onRetryRecords={onRetry}/></div>;
}
