/** Writing prompts expire at the slot + 30 minutes, including provider queues. */
export function pushTtl(payload:Record<string,unknown>,now=Date.now()){
 if(payload.kind!=='reminder')return 21600;
 const expiry=payload.expiresAt;
 return typeof expiry==='number'&&Number.isFinite(expiry)?Math.max(0,Math.min(1800,Math.floor((expiry-now)/1000))):0;
}
