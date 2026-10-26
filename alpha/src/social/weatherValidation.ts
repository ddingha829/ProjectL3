export const WEATHER_CONDITIONS=['sun','cloud','rain','snow','night'] as const;
export type WeatherObservation={source:'weatherapi';observedAt:number;fetchedAt:number;lat:number;lng:number};
export type CardWeather={condition:typeof WEATHER_CONDITIONS[number];temperature?:number;observation?:WeatherObservation};
export function validWeather(value:unknown):value is CardWeather{
 const w=value as CardWeather;
 if(!w||typeof w!=='object'||Array.isArray(w)||!WEATHER_CONDITIONS.includes(w.condition)||(w.temperature!==undefined&&(typeof w.temperature!=='number'||!Number.isFinite(w.temperature)||w.temperature< -60||w.temperature>60)))return false;
 const o=w.observation;
 return o===undefined||Boolean(o&&typeof o==='object'&&!Array.isArray(o)&&o.source==='weatherapi'&&[o.observedAt,o.fetchedAt,o.lat,o.lng].every(n=>typeof n==='number'&&Number.isFinite(n))&&o.observedAt>0&&o.fetchedAt>=o.observedAt&&Math.abs(o.lat)<=90&&Math.abs(o.lng)<=180);
}
