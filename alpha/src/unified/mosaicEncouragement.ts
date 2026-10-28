export function mosaicEncouragement(filled:number,total=16,shared=false){
 const count=Math.max(0,Math.min(total,Math.floor(filled))),complete=count===total&&total>0;
 const lines=['','첫 취향이 놓였어요. 시작이 좋아요.','두 장의 취향이 만났어요.','세 번째 조각, 취향이 보이기 시작해요.','한 줄 완성! 멋진 출발이에요.','취향이 조금씩 연결되고 있어요.','여섯 조각만큼 이야기가 쌓였어요.','좋아하는 것들로 채워지고 있어요.',`벌써 절반! ${shared?'우리':'나'}의 취향이 선명해져요.`,'절반을 넘었어요. 계속 모아봐요.','열 장의 취향, 제법 근사해요.','빈칸보다 취향이 더 많아졌어요.','세 줄 완성! 이제 한 줄 남았어요.','거의 다 왔어요. 세 칸만 더!','멋진 한 판까지 두 칸 남았어요.','마지막 한 칸, 어떤 작품을 놓을까요?'];
 return {text:complete?`${shared?'우리':'나'}의 취향으로 완성한 끌렉션!`:lines[count]||'취향이 차곡차곡 쌓이고 있어요.',progress:total>0?count/total:0,complete};
}
