export const MAX_NICKNAME_LENGTH=6;
export function normalizeNickname(value:string,existingName?:string){
 const name=value.normalize('NFC').trim();
 if(!name)throw Error('닉네임을 입력해주세요.');
 if(Array.from(name).length>MAX_NICKNAME_LENGTH&&name!==existingName?.normalize('NFC').trim())throw Error('닉네임은 6자 이내로 입력해주세요.');
 if(/[\u0000-\u001f\u007f]/.test(name))throw Error('닉네임에 사용할 수 없는 문자가 있어요.');
 return name;
}
export const nicknameInitial=(name:string)=>Array.from(name)[0]||'나';
