import './BrandDetails.css';

export function TicgleDots(){return <span className="un-ticgle-dots" aria-hidden="true"><i/><i/><i/></span>;}

export function BrandEmpty({title,description,action,onAction,compact=false}:{title:string;description:string;action?:string;onAction?:()=>void;compact?:boolean}){
 return <div className={`un-brand-empty ${compact?'is-compact':''}`}><TicgleDots/><h3>{title}</h3><p>{description}</p>{action&&onAction&&<button type="button" onClick={onAction}>{action}<span aria-hidden="true">↗</span></button>}</div>;
}

export function CollectionProgress({filled,slots}:{filled:number;slots:boolean[]}){
 return <div className="un-collection-progress" role="progressbar" aria-label="이 끌렉션에 모은 작품" aria-valuemin={0} aria-valuemax={slots.length} aria-valuenow={filled}><span><strong>{filled}</strong> / {slots.length}<small>개의 취향</small></span><div aria-hidden="true">{slots.map((full,i)=><i key={i} data-filled={full}/>)}</div></div>;
}
