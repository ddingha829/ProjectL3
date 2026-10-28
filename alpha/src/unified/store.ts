import {seedState,readState,type LabState,type LabLog} from '@/social/model';
import {DEFAULT_EDITORIAL,EDITORIAL_THEMES,normalizeEditorial,validEditorial,type EditorialStyle} from '@/social/editorialStyle';
import {emptyMosaic,validMosaic,type MosaicBoardState} from './mosaic';
export type PhotoSettings={x:number;y:number;zoom:number;saturation:number;brightness:number;contrast:number;fit:'cover'|'contain'};
export const DEFAULT_PHOTO:PhotoSettings={x:50,y:50,zoom:1,saturation:100,brightness:100,contrast:100,fit:'cover'};
export type UnifiedLog=LabLog&{circleIds?:string[];photo?:PhotoSettings;serverRevision?:number;imagePath?:string};
export type Preset={id:string;name:string;style:EditorialStyle;defaults:string[]};
export type Collection={id:string;name:string;logIds:string[];createdAt:number};
export type UnifiedState=Omit<LabState,'logs'>&{logs:UnifiedLog[];presets:Preset[];collections:Collection[];mosaic:MosaicBoardState;serverPreferencesRevision?:number;nicknameConfigured?:boolean};
export const UI_STORAGE='l2_unified_ui_v1',UI_SESSION='l2_unified_preview_session_v1';
export const destinations=[['logs','피드'],['map','티끌맵'],['mosaic','끌렉션'],['studio','스튜디오']] as const;
export type Destination=typeof destinations[number][0];
export const audienceIds=(log:UnifiedLog)=>log.circleIds??(log.circleId?[log.circleId]:[]);
export const inScope=(log:UnifiedLog,scope:string,actor:string)=>scope==='mine'?log.authorId===actor:audienceIds(log).includes(scope);
export function initialUnified():UnifiedState{
 const state=seedState();
 const logs=state.logs.map(l=>l.id==='walk'?{...l,title:'창가에 머문 오후',body:'햇빛이 드는 자리에서 느리게 마신 커피. 서두르지 않아도 좋았던 오후였다.',image:'/images/studio-cafe.png',category:'dining' as const,rating:'4.5',place:{id:'my-cafe',name:'창가의 작은 카페',area:'성수동',lat:37.5445,lng:127.0557}}:l);
 logs.push({...logs.find(l=>l.id==='movie')!,id:'my-movie',authorId:'me',circleId:null,title:'엔딩이 남긴 여운',body:'상영이 끝나고도 한동안 자리를 떠나지 못했다. 말보다 오래 남은 장면들이 있었다.',createdAt:Date.now()-2*86400000,likes:[],bookmarks:[],comments:[]});
 return {...state,mosaic:emptyMosaic(),circles:state.circles.map((c,i)=>({...c,name:i?'주말 모임':'친구들'})),logs:logs.map(l=>({...l,circleIds:l.circleId?[l.circleId]:[]})),collections:[],presets:EDITORIAL_THEMES.map((theme,i)=>({id:'preset-'+theme.id,name:['나의 일상','시네마 노트','초록의 기록','취향의 문장'][i],style:{...DEFAULT_EDITORIAL,...theme,front:i===1?'ticket':i===2?'polaroid':'cover',back:i===1?'review':i===3?'library':'postcard'},defaults:i===0?['daily','dining']:i===1?['movie']:i===3?['book']:[]}))};
}
export function validPhoto(value:unknown):value is PhotoSettings{
 const p=value as PhotoSettings;return !!p&&typeof p==='object'&&['cover','contain'].includes(p.fit)&&[['x',0,100],['y',0,100],['zoom',1,3],['saturation',0,200],['brightness',50,150],['contrast',50,150]].every(([key,min,max])=>typeof p[key as keyof PhotoSettings]==='number'&&Number.isFinite(p[key as keyof PhotoSettings])&&Number(p[key as keyof PhotoSettings])>=Number(min)&&Number(p[key as keyof PhotoSettings])<=Number(max));
}
export function parseUnified(raw:string):UnifiedState|null{
 try{const s=JSON.parse(raw) as UnifiedState;if(!readState(raw)||!Array.isArray(s.presets)||s.presets.length<1||s.presets.length>20||!Array.isArray(s.collections)||s.collections.length>100)return null;
 if(s.nicknameConfigured!==undefined&&typeof s.nicknameConfigured!=='boolean')return null;
 if(s.logs.some(l=>l.circleIds!==undefined&&(!Array.isArray(l.circleIds)||l.circleIds.some(id=>typeof id!=='string'))||l.photo!==undefined&&!validPhoto(l.photo)))return null;
 if(s.presets.some(p=>!p||typeof p.id!=='string'||typeof p.name!=='string'||p.name.length>40||!validEditorial(p.style)||!Array.isArray(p.defaults)))return null;
 if(s.collections.some(c=>!c||typeof c.id!=='string'||typeof c.name!=='string'||!Array.isArray(c.logIds)||c.logIds.some(id=>typeof id!=='string')))return null;
 if(s.mosaic!==undefined&&!validMosaic(s.mosaic))return null;
 if(new Set(s.logs.map(l=>l.id)).size!==s.logs.length||new Set(s.presets.map(p=>p.id)).size!==s.presets.length)return null;return {...s,logs:s.logs.map(log=>log.card?{...log,card:normalizeEditorial(log.card)}:log),presets:s.presets.map(p=>({...p,style:normalizeEditorial(p.style)})),mosaic:s.mosaic||emptyMosaic()};
 }catch{return null;}
}
export const defaultStyle=(state:UnifiedState,category:string)=>({...((state.presets.find(p=>p.defaults.includes(category))||state.presets[0])?.style||DEFAULT_EDITORIAL)});
