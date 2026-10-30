import type {SupabaseClient} from '@supabase/supabase-js';
import {authMessage} from './authMessages';

export function newPasswordProblem(password:string,confirmation:string):{field:'password'|'confirmation';message:string}|null{
 if(password.length<6)return {field:'password',message:'비밀번호는 6자 이상으로 입력해주세요.'};
 if(!confirmation)return {field:'confirmation',message:'비밀번호 확인란을 입력해주세요.'};
 if(password!==confirmation)return {field:'confirmation',message:'두 비밀번호가 일치하지 않아요.'};
 return null;
}

/** Reauthenticate the same account before updating; never persist form values. */
export async function changeAccountPassword(client:SupabaseClient,userId:string,email:string,currentPassword:string,password:string,confirmation:string,isCurrent:()=>boolean){
 if(!currentPassword)throw Error('현재 비밀번호를 입력해주세요.');
 const problem=newPasswordProblem(password,confirmation);if(problem)throw Error(problem.message);
 if(currentPassword===password)throw Error('현재 비밀번호와 다른 새 비밀번호를 입력해주세요.');
 if(!isCurrent())throw Error('로그인 상태가 바뀌었어요. 다시 로그인한 뒤 변경해주세요.');
 const verified=await client.auth.signInWithPassword({email,password:currentPassword});
 if(verified.error){if(verified.error.code==='invalid_credentials')throw Error('현재 비밀번호를 확인해주세요.');throw Error(authMessage(verified.error));}
 if(verified.data.user?.id!==userId||!isCurrent())throw Error('로그인 상태가 바뀌었어요. 다시 로그인한 뒤 변경해주세요.');
 const result=await client.auth.updateUser({password,current_password:currentPassword});
 if(result.error)throw Error(authMessage(result.error));
 if(!isCurrent())throw Error('계정 상태가 바뀌었어요. 새 비밀번호로 다시 로그인해주세요.');
}
