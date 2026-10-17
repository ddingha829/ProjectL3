# 첫 방문 가이드·스튜디오 개선

2026-10-18

## 반영 내용

- 새 방문 환경에서 +로그·로그북·카드 상세·스튜디오·설정에 화면별 1회 가이드. 기존 설치의 환경설정 캐시가 있으면 자동 안내를 생략한다.
- 브라우저/기기의 로컬 저장소 기준이다. 계정 전체의 첫 가입 여부를 판별하는 서버 플래그는 아니다. 브라우저 데이터를 지우거나 새 기기를 쓰면 안내가 다시 나타날 수 있다.
- 설명에서 실제 입력란·버튼까지 SVG 연결선을 그린다. 번호만으로 대상을 표시하지 않는다. 리사이즈·스크롤에 맞춰 위치를 다시 계산한다.
- 화면을 한 번 누르거나 Escape로 닫는다. 닫는 클릭이 뒤쪽 저장·삭제 버튼을 실행하지 않는다. 안내 중 배경은 inert, 키보드 포커스는 안내 안에 유지한다.
- 설치/가입 안내와 다른 모달이 먼저 열린 경우 기다린다. 복잡한 화면의 추가 안내는 하단 또는 상단의 내용 선택 버튼으로 볼 수 있다. 아무 곳이나 누르면 전체 안내를 닫는다.
- 설정의 ‘사용 가이드 다시 보기’로 전체 안내를 다시 시작한다.
- 스튜디오의 ‘프리셋 목록’과 ‘프리셋 이름’을 각각 테두리 영역으로 분리하고 사진용/텍스트용 모드를 글자로 표시했다. 미리 보기 크기는 남은 높이에 맞춘다.
- 사진용 7종, 텍스트용 4종을 구분한다. 사진 예시는 라테·피낭시에가 있는 가상 카페 ‘오후의 한 잔’, 텍스트는 기타 일상 기록 ‘천천히 걸은 저녁’이다. 사용자의 로그로 저장되지 않는다.
- OAT MILK / SAGE MIST / DUSTY ROSE / LILAC PAPER 기본 색상 추가. 본문/배경 대비 4.5 이상 확인.
- 선택 중인 색상의 삭제 버튼과 색상 목록 각각의 삭제 버튼을 제공한다. 기본/생성 색상 모두 삭제할 수 있고 최소 한 색상은 남긴다.
- 기본 색상이 초기 데이터 병합 때문에 다시 생기지 않도록 JSON의 `hidden` 표식을 로컬·서버 프로필에 함께 저장한다. 사용 중인 프리셋은 남은 색상으로 전환하되, 기존 로그의 불변 카드 스냅샷은 변경하지 않는다. DB 컬럼 변경은 필요 없다.
- 작성창의 768px 너비 제한을 제거해 상단바와 같은 부모 너비를 사용한다.
- 이전 요청의 카드 상세 개별 도안 선택줄 제거와 ‘그룹 만들기’ 명칭 변경을 포함한다.
- 카드 상세와 스튜디오의 프리셋 목록은 터치·트랙패드로 가로 스크롤하고 마우스로도 밀어서 탐색한다. 마우스 드래그에는 관성을 적용하며 드래그가 프리셋 클릭이나 상단 탭 전환으로 처리되지 않는다. 동작 줄이기 설정에서는 관성을 생략한다.
- 공유는 카드 이미지에 실제 Google 지도 링크만 덧붙인다. 저장된 Google Maps URL이 없지만 유효한 장소 좌표가 있으면 해당 좌표를 여는 Google Maps URL을 만든다. 지도 정보가 없으면 이미지 파일만 전달하며 제목·본문·앱 공유 페이지 URL은 넣지 않는다.
- 네이티브 공유를 지원하지 않는 브라우저에서는 이미지를 내려받고 지도 연결 로그에 한해 링크 복사 동작을 제공한다. 공유 대상 앱이 이미지·텍스트 조합을 표시하는 방식은 앱마다 다르며 실제 카카오톡/iOS 실기기 수신 화면은 미검증이다.
- 카드 슬라이드 전환 중 이미지 내보내기가 이전 카드 잔상 DOM을 잡지 않도록 현재 카드 캔버스를 명시적으로 선택한다.

## 검증

`npm run typecheck`, `npm run build`, `npm run test:repository`, `npm run test:save-feedback`, `npm run test:guides-studio`.

UI 검증은 API를 가상 응답으로 격리하며 운영 Supabase·Google 생성 API에 테스트 기록이나 생성 요청을 보내지 않는다. 320×568 / 390×844 / 768×1024 / 1280×800에서 스튜디오 높이와 작성창 너비, 안내 위치를 확인한다. 실제 iOS 설치·공유·햅틱 실기기 검증은 포함하지 않는다.

## 샘플 사진 출처와 프롬프트

파일: `alpha/public/images/studio-cafe.png`. 개발 중 built-in `image_gen` 도구로 생성·수정한 허구의 카페 사진이다. 실제 업소 사진이나 사용자 업로드가 아니다. 온라인 이미지 다운로드를 사용하지 않았다.

초기 생성 프롬프트:

```text
Use case: photorealistic-natural. Asset type: a sample photograph for a personal cafe diary card in the Korean L2 app. Generate ONE square editorial photograph, no collage, no text, no typography, no border, no watermark. A quiet afternoon at a small fictional Korean cafe: a warm ivory ceramic cup of latte with simple latte art and a small golden butter financier on a cream plate, on a light oak table near a window. Soft natural late afternoon light and very faint leaf shadow, muted cream, sage and warm wood tones, contemporary tasteful film photography, real appetizing food. Camera at a gentle 45 degree angle with BOTH cup and pastry entirely contained within the central 45% of image height and central 65% of width, enough generous table negative space around subjects on all sides. The cup and pastry are relatively small in the frame, so a very wide 2.5:1 center crop still contains them fully. No people, hands, brands, signs, cutlery cut off at the edge, or busy decor. Accurate realistic materials, restrained natural grain, crisp food detail. Intended as an honest fictional preview titled '오후의 한 잔' with a latte and financier.
```

정사각형 여백 수정 프롬프트:

```text
Edit target: the attached generated cafe photograph. Create a SQUARE 1:1 photograph by extending the quiet light oak table above and below and to the sides. Keep the same latte and financier, natural lighting and warm muted photographic style. Zoom OUT substantially: the complete latte cup AND pastry together should fit inside the center 45 percent of image width and the center 28 percent of image height, with wide clean table negative space all around. Center both items around y=50 percent; nothing important near edges. Must output square, not a panoramic aspect ratio. This is one image for an app sample that must tolerate both wide and tall centered card crops without cutting off either cup or pastry. No typography, no people, no logos or borders. Photorealistic. Preserve the appealing food and believable materials.
```

최종 파일은 생성 결과를 그대로 프로젝트에 복사했다. 별도 코드 기반 이미지 편집을 하지 않았다.
