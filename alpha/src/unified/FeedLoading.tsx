import LoadingWordmark from '@/components/LoadingWordmark';
import './FeedLoading.css';
export function FeedSkeleton(){return <div className="un-feed-skeletons" aria-hidden="true">{[0,1,2,3].map(n=><div className="un-feed-skeleton" key={n}><span/><i/><i/></div>)}</div>;}
export function RecordLoading({busy,onRetry}:{busy:boolean;onRetry:()=>void}){return <div className="un-record-loading" role="status">{busy?<><LoadingWordmark/><span>기록을 불러오고 있어요</span></>:<><p>기록을 끝까지 불러오지 못했어요.</p><button type="button" onClick={onRetry}>다시 불러오기</button></>}</div>;}
