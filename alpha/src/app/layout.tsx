import type { Metadata, Viewport } from 'next';
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/themePreference';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#08080A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3013'
  ),
  title: 'L2 - 일상 로그하기',
  description:
    '감각적인 경험 아카이빙과 카카오톡·인스타그램 공유용 명함/포스터 카드 엔진',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'L2.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: THEME_BOOTSTRAP_SCRIPT}} />
        <script dangerouslySetInnerHTML={{__html: "try{var f=localStorage.getItem('l2_font_family');document.documentElement.dataset.font=f==='pretendard'||f==='gaegu'?f:'sebang'}catch{}"}} />
        <link rel="preload" href="/fonts/sebang-gothic-regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/sebang-gothic-bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          crossOrigin="anonymous"
          async
        ></script>
      </head>
      <body className="min-h-screen flex flex-col justify-between selection:bg-[#FF3B1D] selection:text-white">
        {children}
      </body>
    </html>
  );
}
