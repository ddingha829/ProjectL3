'use client';
import type {ButtonHTMLAttributes} from 'react';
import SlideArrowButton from '@/components/tweenui/slide-arrow-button';
import './AnimatedSaveButton.css';

type Props=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'>&{children:string;busy?:boolean;compact?:boolean};
export default function AnimatedSaveButton({children,busy=false,compact=false,disabled,className='',...props}:Props){
 return <SlideArrowButton {...props} className={`l2-save-button ${compact?'is-compact':''} ${className}`} disabled={disabled||busy} pending={busy}>
  {busy?(compact?'저장 중':'기기에 저장 중'):children}
 </SlideArrowButton>;
}
