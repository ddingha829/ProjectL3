export const dynamic='force-dynamic';
export async function GET(){
 const key=process.env.KAKAO_JAVASCRIPT_KEY||'';
 // A Kakao JavaScript key is intentionally public. Never fall back to a REST
 // or admin credential on this client-facing endpoint.
 return Response.json({enabled:/^[a-f0-9]{32}$/i.test(key),key:/^[a-f0-9]{32}$/i.test(key)?key:undefined},{headers:{'Cache-Control':'private, no-store'}});
}
