export function normalizeNickname(value:string){
 const name=value.normalize('NFC').trim();
 if(!name)throw Error('닉네임을 입력해주세요.');
 if(Array.from(name).length>30)throw Error('닉네임은 30자 이내로 입력해주세요.');
 if(/[\u0000-\u001f\u007f]/.test(name))throw Error('닉네임에 사용할 수 없는 문자가 있어요.');
 return name;
}
export const nicknameInitial=(name:string)=>Array.from(name)[0]||'나';
