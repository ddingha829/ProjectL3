export function authMessage(error:unknown){
 const {code='',message='',reasons:rawReasons}=(error||{}) as {code?:string;message?:string;reasons?:unknown};
 const reasons=Array.isArray(rawReasons)?rawReasons.filter((value):value is string=>typeof value==='string'):[];
 if(/user_already_exists|email_exists/.test(code)||/already registered/i.test(message))return '이미 가입된 이메일이에요. 기존 비밀번호로 로그인하거나 비밀번호를 재설정해주세요.';
 if(code==='invalid_credentials'||/Invalid login credentials/i.test(message))return '이메일 또는 비밀번호를 확인해주세요. 기억나지 않으면 비밀번호 찾기를 이용하세요.';
 if(code==='email_not_confirmed')return '이메일 확인이 필요한 계정이에요. 받은 메일을 확인해주세요.';
 if(/rate_limit|over_.*rate/.test(code)||/rate limit|too many/i.test(message))return '요청이 많아 잠시 쉬고 있어요. 조금 뒤 다시 시도해주세요.';
 if(code==='weak_password'||/password.*(?:least|short|weak|pwned|leaked)/i.test(message)){
  if(reasons.includes('pwned')||/pwned|leaked|compromised|easy to guess|known.*password/i.test(message))return '유출되었거나 너무 흔한 비밀번호예요. 다른 비밀번호를 사용해주세요.';
  if(reasons.includes('characters'))return '비밀번호에 필요한 문자 조합이 빠져 있어요. 영문 대·소문자, 숫자, 기호를 조합해주세요.';
  if(reasons.includes('length')||/too short|at least \d+|minimum.*length/i.test(message)){
   const minimum=Number(message.match(/(?:at least|minimum(?: password)? length[: ]*)\s*(\d+)/i)?.[1]||6);
   return `비밀번호는 ${minimum>=6&&minimum<=128?minimum:6}자 이상으로 입력해주세요.`;
  }
  return '비밀번호가 보안 기준에 맞지 않아요. 6자 이상으로, 흔하지 않은 다른 비밀번호를 사용해주세요.';
 }
 if(code==='same_password')return '기존 비밀번호와 다른 비밀번호를 입력해주세요.';
 if(code==='signup_disabled')return '현재 신규 가입을 잠시 이용할 수 없어요. 잠시 후 다시 시도해주세요.';
 if(code==='email_address_invalid')return '올바른 이메일 주소를 입력해주세요.';
 if(/fetch|network|timeout/i.test(message))return '연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.';
 return '인증 요청을 완료하지 못했어요. 잠시 후 다시 시도해주세요.';
}
export const RECOVERY_REDIRECT='https://project-l3-nine.vercel.app/auth/reset';
