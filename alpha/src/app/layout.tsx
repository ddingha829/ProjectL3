import type {Metadata,Viewport} from 'next';
import './globals.css';
import UnifiedPwa from '@/components/UnifiedPwa';
export const metadata:Metadata={title:'L2 - 일상 로그하기',description:'일상을 카드로 기록하고 원하는 모임에 나누세요.',manifest:'/manifest.webmanifest',appleWebApp:false,other:{'apple-mobile-web-app-capable':'yes','apple-mobile-web-app-title':'L2.'},robots:{index:false,follow:false},icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#FFFFFF'};
const boot="try{var t=localStorage.getItem('l2_unified_ui_theme');document.documentElement.classList.toggle('light',t&&t!=='auto'?t==='light':!matchMedia('(prefers-color-scheme: dark)').matches)}catch{}";
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko" className="light" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:boot}}/><link rel="preload" href="/fonts/sebang-gothic-bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}<UnifiedPwa/></body></html>;}
