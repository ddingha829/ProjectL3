'use client';
import {useState} from 'react';
import WorkSearch from '@/social/WorkSearch';
import BentoFront from '@/social/BentoFront';
import type {Work} from '@/social/taste';
import '@/social/SocialLab.css';
import styles from './YouTubeMusicTest.module.css';
export default function MusicBrainzTest(){
 const [work,setWork]=useState<Work>();
 return <main className={styles.page}><h1>음악 티끌</h1><p>MusicBrainz에서 곡을 골라 음악 카드로 남겨보세요.</p><WorkSearch kind="music" onSelect={setWork}/>{work&&<section style={{maxWidth:360,margin:'24px auto'}}><BentoFront log={{id:'music-test',authorId:'me',circleId:null,title:work.title,body:'오늘을 닮은 한 곡',image:work.image,category:'music',work,createdAt:Date.now(),design:'cover',likes:[],bookmarks:[],comments:[]}} author="나" native/><p>{work.creator}{work.album?' · '+work.album:''}</p><small>미리보기예요. 티끌은 등록되지 않아요.</small></section>}<a href="/">티끌로 돌아가기</a></main>;
}
