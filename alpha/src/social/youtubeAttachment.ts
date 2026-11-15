import {isYouTubeVideoId,youtubeVideoUrl} from '@/lib/youtubeMusic';
export type YouTubeAttachment={videoId:string;title:string;channelTitle:string};
export function validYouTubeAttachment(value:unknown):value is YouTubeAttachment{
 const v=value as YouTubeAttachment;
 return !!v&&isYouTubeVideoId(v.videoId)&&typeof v.title==='string'&&v.title.trim().length>0&&v.title.length<=240&&typeof v.channelTitle==='string'&&v.channelTitle.length<=150;
}
export const youtubeAttachmentUrl=(v:YouTubeAttachment)=>youtubeVideoUrl(v.videoId);
export const youtubeAttachmentImage=(v:YouTubeAttachment)=>`https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
