import './TicgleBrand.css';

/** Original Ticgle wordmark, copied without altering the source artwork. */
export default function TicgleWordmark({className=''}:{className?:string}){
 return <img className={`ticgle-wordmark ${className}`} src="/brand/ticgle-wordmark.png" width={919} height={372} alt="티끌 ticgle" draggable={false}/>;
}

export function TicgleAppIcon(){
 return <img className="ticgle-app-icon" src="/brand/ticgle-icon.svg" width={48} height={48} alt="" aria-hidden="true" draggable={false}/>;
}
