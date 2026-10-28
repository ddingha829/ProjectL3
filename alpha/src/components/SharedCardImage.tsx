'use client';
import {useState} from 'react';
export default function SharedCardImage({src}:{src:string}){const [failed,setFailed]=useState(false);return failed?<p role="status">공유 기간이 끝났거나 삭제된 카드예요.</p>:<img src={src} alt="공유된 티끌 카드" onError={()=>setFailed(true)} style={{display:'block',maxWidth:'100%',maxHeight:'calc(100svh - 120px)',objectFit:'contain',margin:'auto',borderRadius:8,boxShadow:'0 12px 40px #0002'}}/>;}
