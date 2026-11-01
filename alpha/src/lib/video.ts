export type VideoClip={path:string;bytes:number;duration:2;width:480;height:768};
export const VIDEO_SOURCE_LIMIT=50*1024*1024;
export function validVideo(value:unknown):value is VideoClip{const v=value as VideoClip;return !!v&&typeof v.path==='string'&&/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp4$/i.test(v.path)&&v.duration===2&&v.width===480&&v.height===768&&Number.isInteger(v.bytes)&&v.bytes>0&&v.bytes<=450000;}
