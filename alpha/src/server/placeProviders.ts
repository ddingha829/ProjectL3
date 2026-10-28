import 'server-only';
import type {Place} from '@/social/model';
import {settings} from './integrationRuntime';
export type NearbyPlace=Place&{distance?:number};
type GooglePlace={id?:string;displayName?:{text?:string};formattedAddress?:string;location?:{latitude?:number;longitude?:number}};
export const validPoint=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
const clean=(value:unknown)=>String(value||'').replace(/^대한민국\s*/,'').slice(0,200);
function distance(lat:number,lng:number,a:number,b:number){const rad=Math.PI/180,h=Math.sin((a-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin((b-lng)*rad/2)**2;return Math.round(12742000*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h))));}
export async function reverseAddress(lat:number,lng:number):Promise<Place>{
 const key=settings().GOOGLE_MAPS_API_KEY!;
 const response=await fetch('https://maps.googleapis.com/maps/api/geocode/json?'+new URLSearchParams({latlng:`${lat},${lng}`,language:'ko',key}),{signal:AbortSignal.timeout(8000)});
 const data=await response.json() as {status?:string;results?:{formatted_address?:string}[]};
 if(!response.ok||!['OK','ZERO_RESULTS'].includes(data.status||''))throw Error('LOCATION_PROVIDER_UNAVAILABLE');
 const address=clean(data.results?.[0]?.formatted_address);return{id:`gps:${lat.toFixed(5)}:${lng.toFixed(5)}`,name:address||'현재 위치',area:address||`${lat.toFixed(4)}, ${lng.toFixed(4)}`,lat,lng};
}
export async function nearbyPlaces(lat:number,lng:number,query=''):Promise<NearbyPlace[]>{
 const response=await fetch(`https://places.googleapis.com/v1/places:${query?'searchText':'searchNearby'}`,{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':settings().GOOGLE_MAPS_API_KEY!,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location'},signal:AbortSignal.timeout(10000),body:JSON.stringify(query?{textQuery:query,languageCode:'ko',regionCode:'KR',pageSize:8,locationBias:{circle:{center:{latitude:lat,longitude:lng},radius:3000}}}:{languageCode:'ko',rankPreference:'DISTANCE',maxResultCount:3,includedTypes:['restaurant','cafe','bakery','bar','book_store','museum','art_gallery','park','tourist_attraction','shopping_mall'],locationRestriction:{circle:{center:{latitude:lat,longitude:lng},radius:500}}})});
 if(!response.ok)throw Error('LOCATION_PROVIDER_UNAVAILABLE');const data=await response.json() as {places?:GooglePlace[]};
 return (data.places||[]).flatMap(place=>{const a=place.location?.latitude,b=place.location?.longitude;if(!place.id||!place.displayName?.text||typeof a!=='number'||typeof b!=='number'||!validPoint(a,b))return[];return[{id:'google:'+place.id,name:clean(place.displayName.text),area:clean(place.formattedAddress),lat:a,lng:b,distance:distance(lat,lng,a,b)}];}).sort((a,b)=>a.distance-b.distance).slice(0,query?8:3);
}
