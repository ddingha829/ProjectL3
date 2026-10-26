import {Sun,Cloud,CloudRain,CloudSnow,Moon} from 'lucide-react';
import type {CardWeather} from './weatherValidation';
export {WEATHER_CONDITIONS as CONDITIONS} from './weatherValidation';
export const WEATHER_NAMES={sun:'맑음',cloud:'흐림',rain:'비',snow:'눈',night:'밤'};
const icons={sun:Sun,cloud:Cloud,rain:CloudRain,snow:CloudSnow,night:Moon};
export function WeatherMark({value}:{value?:CardWeather}){if(!value)return null;const Icon=icons[value.condition];return <span className="ec-weather" aria-label={`${WEATHER_NAMES[value.condition]}${value.temperature===undefined?'':` ${value.temperature}도`}`}><Icon size={12}/>{value.temperature!==undefined&&<span>{value.temperature}°C</span>}</span>;}
