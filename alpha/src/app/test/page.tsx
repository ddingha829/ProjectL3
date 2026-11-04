import type {Metadata} from 'next';
import BentoTestApp from '@/design-review/bento/BentoTestApp';

export const metadata:Metadata={title:'벤토 피드 테스트 · 티끌',robots:{index:false,follow:false},alternates:{canonical:'/test/'}};
export default function Page(){return <BentoTestApp/>;}
