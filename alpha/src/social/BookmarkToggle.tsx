'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Bookmark,Plus} from 'lucide-react';
import {BookmarkCheckIcon,type BookmarkCheckIconHandle} from '@/components/icons/bookmark-check';
import './InteractionPolish.css';

/** Only a committed false→true prop transition celebrates a successful collection. */
export default function BookmarkToggle({active,onClick,children,intent=false,className='',iconOnly=false}:{active:boolean;onClick:()=>void;children:ReactNode;intent?:boolean;className?:string;iconOnly?:boolean}){
 const previous=useRef(active),icon=useRef<BookmarkCheckIconHandle>(null),[pulse,setPulse]=useState(false);
 useEffect(()=>{const added=active&&!previous.current;previous.current=active;let timer:ReturnType<typeof setTimeout>|undefined;if(added){setPulse(true);icon.current?.startAnimation();timer=setTimeout(()=>{setPulse(false);icon.current?.stopAnimation();},650);}else{setPulse(false);icon.current?.stopAnimation();}return()=>clearTimeout(timer);},[active]);
 return <button type="button" className={`lab-bloom-toggle ${className}`} aria-label={iconOnly?(active?'담아두기 취소':'담아두기'):undefined} title={iconOnly?(active?'담아두기 취소':'담아두기'):undefined} aria-pressed={active} data-bloom={active&&pulse||undefined} onClick={onClick}><span className="lab-bloom-fill" aria-hidden="true"/><span className="lab-toggle-icon" aria-hidden="true">{active?<BookmarkCheckIcon ref={icon} size={17} isAnimated={false} duration={.65}/>:intent?<Plus size={17}/>:<Bookmark size={17}/>}</span><span className={iconOnly?'sr-only':'lab-toggle-label'}>{children}</span></button>;
}
