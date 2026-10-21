import type { ArchiveCategory } from '@/types/l2';
export interface ArchiveViewState { category:'ALL'|ArchiveCategory; query:string; view:'list'|'grid'|'map'; oldest:boolean }
export const initialArchiveView = ():ArchiveViewState => ({category:'ALL',query:'',view:'list',oldest:false});
