import type {Metadata} from 'next';
import FeedToolbarReview from '@/design-review/feed-toolbar/FeedToolbarReview';
export const metadata:Metadata={title:'피드 상단 메뉴 · 개선안 비교',robots:{index:false,follow:false}};
export default function Page(){return <FeedToolbarReview/>;}
