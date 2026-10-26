import type {Metadata} from 'next';
import SearchReview from '@/design-review/search/SearchReview';
export const metadata:Metadata={title:'L2 · 검색 디자인 MCP 시안',robots:{index:false,follow:false}};
export default function Page(){return <SearchReview/>;}
