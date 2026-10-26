'use client';
import EditorialCard from './EditorialCard';
import {type LabLog,type Person} from './model';
import {publicationLabel} from './publication';

export default function LogPoster({log,owner,onOpen,fresh=false,showPublication=false}:{log:LabLog;owner:Person;onOpen:()=>void;fresh?:boolean;showPublication?:boolean}){
 return <article className={`lab-feed-card lab-log-poster ${fresh?'is-fresh':''}`} data-fresh={fresh||undefined} data-log-id={log.id} data-log-kind={log.category}>
  <div className="lab-poster-art"><EditorialCard log={log} author={owner.name}/></div>
  <button type="button" className="lab-poster-caption" aria-label={`${owner.name} · ${log.title||log.body.slice(0,30)||'사진으로 남긴 순간'} 카드 보기`} onClick={onOpen}><span className="lab-poster-author">{owner.name}</span>{showPublication&&log.publication&&<span className={`lab-share-badge is-${log.publication.status}`}>{publicationLabel(log)}</span>}<span className="lab-card-open-glyph" aria-hidden="true">↗</span></button>
 </article>;
}
