'use client';
import {useState} from 'react';
import {ArrowUpFromLine,Check,Copy,Smartphone} from 'lucide-react';
import './viewport-install.css';
export default function ViewportInstall(){
 const [copied,setCopied]=useState(false),[manual,setManual]=useState(false);
 const address='https://project-l3-nine.vercel.app/viewport-install/';
 const copy=async()=>{try{await navigator.clipboard.writeText(address);setCopied(true);}catch{setManual(true);}};
 return <main className="viewport-install-intro">
  <span className="viewport-install-tag"><Smartphone size={17} aria-hidden="true"/>아이폰 설치 확인</span>
  <h1>화면 위치 테스트</h1>
  <p>새 설치 설정에서 리모콘이 홈 표시줄 가까이에 놓이는지 확인해요.</p>
  <ol><li><span>1</span><div><strong>Safari에서 이 주소 열기</strong><p>채팅 안의 브라우저라면 주소를 복사해 Safari로 열어주세요.</p></div></li>
   <li><span>2</span><div><strong>공유 → 홈 화면에 추가</strong><p>아이콘 이름은 ‘화면 테스트’예요. 기존 아이콘은 그대로 두고 추가하세요.</p></div></li>
   <li><span>3</span><div><strong>새 아이콘에서 먼저 둘러보기</strong><p>리모콘 위치를 확인한 뒤, 설정 → 알파테스트 → 문제 알리기에서 보고서를 복사해 보내주세요.</p></div></li></ol>
  <p className="viewport-install-note">기존 앱을 삭제하거나 데이터를 지우지 않아요. 이 링크는 설치 설정을 비교하기 위한 테스트예요.</p>
  <button type="button" onClick={()=>void copy()}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'주소를 복사했어요':'테스트 주소 복사'}</button>
  {manual&&<label>주소를 길게 눌러 복사해주세요.<input readOnly aria-label="화면 테스트 주소" value={address}/></label>}
  <a href="/viewport-install/app/">설치 전 화면만 보기<ArrowUpFromLine size={15} aria-hidden="true"/></a>
  {copied&&<p role="status" className="viewport-install-status">Safari 주소창에 붙여넣은 뒤 홈 화면에 추가해주세요.</p>}
 </main>;
}
