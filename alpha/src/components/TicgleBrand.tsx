import './TicgleBrand.css';

/** Approved A wordmark: rounded lowercase lettering with a gentle forward lean. */
export default function TicgleWordmark({className=''}:{className?:string}){
 return <img className={`ticgle-wordmark ${className}`} src="/brand/ticgle-wordmark-a.png" width={460} height={193} alt="티끌 ticgle" draggable={false}/>;
}

export function TicgleAppIcon(){
 return <img className="ticgle-app-icon" src="/brand/ticgle-icon-a-192.png" width={48} height={48} alt="" aria-hidden="true" draggable={false}/>;
}
