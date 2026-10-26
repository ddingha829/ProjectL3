'use client';
import {useState} from 'react';
import './InteractionPolish.css';
/** Focus Frame's four-corner gesture, triggered by a ready photo instead of hover. */
export default function PhotoAttachment({image}:{image:string}){
 const [loaded,setLoaded]=useState('');
 const ready=loaded===image;
 return <span className="lab-focused-photo" data-photo-ready={ready||undefined}><img src={image} alt="첨부한 사진" onLoad={()=>setLoaded(image)}/>{[0,1,2,3].map(corner=><i key={`${image}:${corner}`} className={`lab-photo-corner corner-${corner}`} aria-hidden="true"/>)}</span>;
}
