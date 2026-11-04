import type {Metadata} from 'next';
import UnifiedApp from '@/unified/UnifiedApp';

export const metadata:Metadata={title:'티끌 · 벤토 피드',robots:{index:false,follow:false},alternates:{canonical:'/'}};
export default function Page(){return <UnifiedApp/>;}
