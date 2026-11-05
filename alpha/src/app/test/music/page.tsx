import type {Metadata} from 'next';
import MusicBrainzTest from '@/design-review/music/MusicBrainzTest';
export const metadata:Metadata={title:'음악 티끌 · MusicBrainz',robots:{index:false,follow:false},alternates:{canonical:'/test/music/'}};
export default function Page(){return <MusicBrainzTest/>;}
