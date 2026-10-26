export const FRONTS=['cover','ticket','polaroid'] as const;
export const BACKS=['postcard','review','day','doodle','broadside','passport','vinyl','library','paint'] as const;
export type CardFront=typeof FRONTS[number];
export type CardBack=typeof BACKS[number];
export const FINISHES=['none','film','satin','letterpress','acrylic'] as const;
export const FONT_MOODS=['swiss','serif','analog'] as const;
export type SurfaceFinish=typeof FINISHES[number];
export type FontMood=typeof FONT_MOODS[number];
export type EditorialStyle={front:CardFront;back:CardBack;ratio:'9:16'|'1:1';bg:string;text:string;accent:string;finish?:SurfaceFinish;fontMood?:FontMood;ambientBleed?:boolean};
export const FINISH_NAMES={none:'없음',film:'필름',satin:'새틴 코팅',letterpress:'레터프레스',acrylic:'아크릴'};
export const FINISH_HELP={none:'원래 색과 사진을 그대로',film:'앞면 사진 · 입자와 따뜻한 빛 번짐',satin:'앞·뒷면 · 플립에 반응하는 코팅 광택',letterpress:'타이틀·구분선 · 은은한 음각 인쇄',acrylic:'뒷면 · 사진의 색감만 비치는 아크릴'};
export const FONT_MOOD_NAMES={swiss:'Swiss Grotesque',serif:'Editorial Serif',analog:'Analog Mono'};
export function cardCorner(layout:CardFront|CardBack){return ['polaroid','postcard','library','broadside'].includes(layout)?6:layout==='ticket'?12:20;}
export const FRONT_NAMES={cover:'INSTA',ticket:'TICKET',polaroid:'POLAROID'};
export const BACK_NAMES={postcard:'엽서',review:'리뷰 노트',day:'일력',doodle:'두들',broadside:'호외',passport:'여권',vinyl:'바이닐',library:'도서카드',paint:'페인트'};
export const EDITORIAL_THEMES=[
 {id:'paper',name:'Warm Paper',bg:'#f6f3ec',text:'#161616',accent:'#d94e28'},
 {id:'noir',name:'Obsidian Noir',bg:'#121316',text:'#f3f1ec',accent:'#e6a93c'},
 {id:'forest',name:'Forest Archive',bg:'#eef3ee',text:'#142218',accent:'#2a6b47'},
 {id:'burgundy',name:'Burgundy Editorial',bg:'#f8f3f1',text:'#1f1416',accent:'#8e2438'},
] as const;
export const DEFAULT_EDITORIAL:EditorialStyle={front:'cover',back:'postcard',ratio:'9:16',bg:EDITORIAL_THEMES[0].bg,text:EDITORIAL_THEMES[0].text,accent:EDITORIAL_THEMES[0].accent};
export const validHex=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export function validEditorial(value:unknown):value is EditorialStyle{const p=value as EditorialStyle;return Boolean(p&&FRONTS.includes(p.front)&&BACKS.includes(p.back)&&['9:16','1:1'].includes(p.ratio)&&validHex(p.bg)&&validHex(p.text)&&validHex(p.accent)&&(p.finish===undefined||FINISHES.includes(p.finish))&&(p.fontMood===undefined||FONT_MOODS.includes(p.fontMood))&&(p.ambientBleed===undefined||typeof p.ambientBleed==='boolean'));}
export function mixColor(a:string,b:string,fraction:number){const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const x=rgb(a),y=rgb(b);return '#'+x.map((n,i)=>Math.round(n*(1-fraction)+y[i]*fraction).toString(16).padStart(2,'0')).join('');}
function luminance(hex:string){const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return r*.2126+g*.7152+b*.0722;}
export function editorialColors(style:EditorialStyle){const {bg,text,accent}=style,l=luminance(accent),dark=luminance('#141413'),whiteContrast=1.05/(l+.05),darkContrast=(l+.05)/(dark+.05);return {'--ec-bg':bg,'--ec-text':text,'--ec-accent':accent,'--ec-accent-ink':whiteContrast>=darkContrast?'#ffffff':'#141413','--ec-sub':mixColor(text,bg,.38),'--ec-border':mixColor(text,bg,.84),'--ec-chip':mixColor(text,bg,.93)};}
