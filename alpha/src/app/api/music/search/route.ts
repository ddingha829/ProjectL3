import {browserContext,digest,reserve,cached,cache} from '@/server/integrationRuntime';
import {musicbrainzSlot} from '@/server/integrationStore';
import {createMusicMetadataCache,handleMusicSearch} from '@/server/musicbrainz';
export const dynamic='force-dynamic';
const metadataCache=createMusicMetadataCache({cached,cache});
export async function GET(request:Request){
 return handleMusicSearch(request,{browserContext,digest,reserve,...metadataCache,slot:musicbrainzSlot});
}
