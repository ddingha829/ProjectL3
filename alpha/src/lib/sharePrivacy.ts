import type { ArchiveItem, CardAppearance } from '@/types/l2';
export interface SharePrivacy { location:boolean; signature:boolean; map:boolean }
export function privateShareItem(item:ArchiveItem,options:SharePrivacy):ArchiveItem {
  return {...item,...(!options.location?{loc:'',addressShort:'',fullAddress:'',sub:item.cat}:{}),...(!options.signature?{author:''}:{})};
}
export function privateShareAppearance(appearance:CardAppearance,options:SharePrivacy):CardAppearance {
  return {...appearance,slot:{...appearance.slot,showLocation:options.location,showSignature:options.signature},authorName:options.signature?appearance.authorName:''};
}
