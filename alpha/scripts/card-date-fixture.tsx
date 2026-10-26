import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EditorialFace} from '../src/social/EditorialCard';
import {DEFAULT_EDITORIAL,type EditorialStyle} from '../src/social/editorialStyle';
import type {LabLog} from '../src/social/model';
export function renderCard(back:EditorialStyle['back'],ratio:EditorialStyle['ratio'],rating:string){
 const log:LabLog={id:'date-test',title:'하루의 기록',body:'천천히 남긴 한 줄.',image:'',category:'daily',createdAt:new Date(2026,9,26,12).getTime(),authorId:'me',circleId:null,design:'cover',likes:[],bookmarks:[],comments:[],rating};
 return renderToStaticMarkup(createElement(EditorialFace,{log,author:'테스트',side:'back',appearance:{...DEFAULT_EDITORIAL,back,ratio}}));
}
