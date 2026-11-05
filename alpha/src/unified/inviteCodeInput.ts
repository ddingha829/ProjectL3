/** Normalize before truncating: pasted spaces must not consume a code character. */
export const normalizeInviteCode=(value:string)=>value.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
