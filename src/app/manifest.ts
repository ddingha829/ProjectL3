import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'L2. — Taste Archive & Card Engine',
    short_name: 'L2.',
    description:
      '감각적인 경험 아카이빙과 카카오톡·인스타그램 공유용 명함/포스터 카드 엔진',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#08080A',
    theme_color: '#08080A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
