import type {Metadata} from 'next';
export const metadata:Metadata={
 title:'화면 테스트',description:'아이폰 홈 화면 앱의 하단 위치를 확인하는 설치 설정 테스트입니다.',
 manifest:'/viewport-install/manifest.webmanifest',
 // Next's appleWebApp object inserts statusBarStyle=default even when omitted.
 // Disable that object, retaining only the capable/title legacy hints.
 appleWebApp:false,
 other:{'apple-mobile-web-app-capable':'yes','apple-mobile-web-app-title':'화면 테스트'},
};
export default function ViewportInstallLayout({children}:{children:React.ReactNode}){return children;}
