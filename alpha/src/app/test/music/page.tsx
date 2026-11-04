import type {Metadata} from 'next';
import YouTubeMusicTest from '@/design-review/music/YouTubeMusicTest';
export const metadata:Metadata={title:'음악 티끌 · YouTube 연동 테스트',robots:{index:false,follow:false},alternates:{canonical:'/test/music/'}};
export default function Page(){return <YouTubeMusicTest/>;}
