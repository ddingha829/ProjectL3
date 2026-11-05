import {browserContext,digest,reserve,settings} from '@/server/integrationRuntime';
import {createYouTubeMusicCache,handleYouTubeMusic} from '@/server/youtubeMusic';
export const dynamic='force-dynamic';
const metadataCache=createYouTubeMusicCache();
export async function GET(request:Request){return handleYouTubeMusic(request,{key:settings().YOUTUBE_DATA_API_KEY,browserContext,...metadataCache,digest,reserve});}
