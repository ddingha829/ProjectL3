import {searchRoute} from '@/server/searchRoute';
export const dynamic='force-dynamic';
export async function GET(request:Request){return searchRoute(request,'movie');}
