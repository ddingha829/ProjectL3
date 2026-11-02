'use client';
import {useRef,type ComponentProps} from 'react';
import MapExplorer from './MapExplorer';
import {RecordLoading} from './FeedLoading';

type Props=ComponentProps<typeof MapExplorer>&{active:boolean;loading:boolean;busy:boolean;onRetry:()=>void};
/** One retained map per signed-in account; hidden feeds cannot replace its data. */
export default function RetainedMapExplorer({active,loading,busy,onRetry,...props}:Props){
 const snapshot=useRef<typeof props|null>(null);
 if(active&&!loading)snapshot.current=props;
 if(active&&loading&&snapshot.current?.scopeKey!==props.scopeKey){snapshot.current=null;return <RecordLoading busy={busy} onRetry={onRetry}/>;}
 const retained=active&&!loading?props:snapshot.current;
 if(!retained)return null;
 return <div hidden={!active} inert={!active} className="un-retained-map"><MapExplorer {...retained} dark={props.dark} active={active}/></div>;
}
