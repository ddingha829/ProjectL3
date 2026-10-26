import 'server-only';

/** Read only server environment variables. Never import this module in UI code. */
export function settings(){return {
 TMDB_API_KEY:process.env.TMDB_API_KEY,
 KAKAO_REST_API_KEY:process.env.KAKAO_REST_API_KEY,
 GEMINI_API_KEY:process.env.GEMINI_API_KEY,
 GEMINI_MODEL:process.env.GEMINI_MODEL,
 GOOGLE_MAPS_API_KEY:process.env.GOOGLE_MAPS_API_KEY,
 WEATHER_API_KEY:process.env.WEATHER_API_KEY,
 API_COOKIE_SECRET:process.env.API_COOKIE_SECRET,
 SUPABASE_URL:process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,
 SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
 SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,
 L2_UNIFIED_BACKEND:process.env.L2_UNIFIED_BACKEND,
};}
