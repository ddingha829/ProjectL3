import type {Metadata,Viewport} from 'next';
import './globals.css';
import UnifiedPwa from '@/components/UnifiedPwa';
export const metadata:Metadata={title:'티끌 ticgle',description:'작은 기록을 모아 취향을 채우고, 원하는 모임에 나누세요.',manifest:'/manifest.webmanifest',appleWebApp:false,other:{'apple-mobile-web-app-capable':'yes','apple-mobile-web-app-title':'티끌'},robots:{index:false,follow:false},icons:{icon:'/brand/ticgle-icon.svg',apple:'/brand/ticgle-apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#FFFFFF'};
const boot="try{var t=localStorage.getItem('l2_unified_ui_theme');document.documentElement.classList.toggle('light',t&&t!=='auto'?t==='light':!matchMedia('(prefers-color-scheme: dark)').matches)}catch{}";
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko" className="light" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:boot}}/><link rel="preload" href="/fonts/sebang-gothic-bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}<UnifiedPwa/></body></html>;}
