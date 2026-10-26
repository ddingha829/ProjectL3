import {AI_DAILY_LIMIT,browserContext,cached,json,providerStateKey,settings,usage} from '@/server/integrationRuntime';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const context=await browserContext(request),env=settings();return json({tmdb:!!env.TMDB_API_KEY,books:!!env.KAKAO_REST_API_KEY,gemini:!!env.GEMINI_API_KEY,geminiAvailable:!!env.GEMINI_API_KEY&&!await cached(await providerStateKey()),used:await usage(context.id),limit:AI_DAILY_LIMIT},200,context.cookie);}catch{return json({error:'연결 상태를 확인하지 못했어요.'},503);}}
