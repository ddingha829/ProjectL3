export function mosaicEncouragement(filled:number,total=9,shared=false){
 const count=Math.max(0,Math.min(total,Math.floor(filled))),complete=count===total&&total>0;
 const lines=['','첫 공간이 열렸어요!','옆 칸에도 이야기가 생겼어요.','작은 골목이 만들어졌어요.','취향이 이웃을 만나고 있어요.','벌써 동네의 절반을 넘었어요!','제법 근사한 동네가 됐어요.','두 작품만 더 모아볼까요?','마지막 한 칸, 어떤 작품일까요?'];
 return {text:complete?(shared?'우리':'나')+'의 취향 동네 완성!':lines[count]||'동네가 조금씩 자라고 있어요.',progress:total>0?count/total:0,complete};
}
