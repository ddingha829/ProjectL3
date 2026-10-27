import {UI_SESSION} from './store';

const AUTH_KEY='l2_unified_supabase_auth_v1';
const GENERATION_KEY='l2_unified_backend_generation_v1';

/** A backend reset starts a new session namespace without erasing local records. */
export function backendSessionKey(generation:unknown,storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>){
 if(typeof generation!=='string'||!/^[-a-zA-Z0-9._]{1,64}$/.test(generation))return AUTH_KEY;
 if(storage.getItem(GENERATION_KEY)!==generation){
  // Demo login must be chosen again after a reset. Account caches, unsynced
  // operations and the demo records themselves stay available on this device.
  storage.removeItem(UI_SESSION);
  storage.setItem(GENERATION_KEY,generation);
 }
 return `${AUTH_KEY}:${generation}`;
}
