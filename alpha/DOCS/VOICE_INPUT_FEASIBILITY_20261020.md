# 무료 음성 로그 입력 가능성 검토 (2026-10-20)

최초 검토 당시에는 가능성만 검토했다. 이후 사용자가 브라우저 인식을 승인해 구현했다. 현재 동작은 [구현 보고서](VOICE_INPUT_IMPLEMENTATION_20261020.md)를 따른다. 아래는 최초 비교 검토를 보존한 내용이다.

## 권장안

앱 안에 마이크 버튼을 만든다면 Web Speech API로 한국어 음성을 입력하고, 지원하지 않거나 인식 서비스가 실패하는 환경에는 휴대폰 키보드 받아쓰기를 안내하는 조합을 권장한다. 별도의 유료 STT API나 Gemini 요청을 연결할 필요가 없다. 브라우저 인식 서비스의 무제한 제공이나 모든 기기의 오프라인 동작을 보장하는 뜻은 아니다.

예상 흐름: 내용 칸의 마이크 → 권한 허용 → 말하는 동안 변환된 문구 표시 → 중지 → 사용자가 문구 확인/수정 → 기존 로그 저장. 기존 내용을 덮어쓰지 않고 초안에 추가하고, 음성만으로 자동 저장하지 않는다. 중간 인식과 최종 인식을 구분해 중복 입력을 막고, 화면 이동/숨김/취소 시 인식을 중단해야 한다.

## 방법 비교

| 방법 | 별도 유료 인식 API | 장점 | 제한과 판단 |
| --- | --- | --- | --- |
| iPhone/Gboard 등 키보드 받아쓰기 | 불필요 | 표준 제목·내용 입력 칸에서 바로 사용 가능, 개발 부담 최소 | 기기/키보드 설정과 언어에 의존. 즉시 쓸 수 있는 기본 대안 |
| Web Speech API | 불필요 | 앱 내 마이크 버튼과 실시간 문구 표시 가능, 모델 다운로드 불필요 | 브라우저 지원과 서비스 가용성 차이. Chrome 등은 음성을 외부 인식 서비스로 전송할 수 있고 네트워크가 필요. 앱 기능으로 추가할 때 우선 추천 |
| 브라우저 안의 Whisper/Transformers.js | 추론 API 과금 없음 | 자체 모델로 기기 내 처리 가능 | 모델 다운로드·메모리·배터리·속도 및 기기/GPU 호환성 부담. 모델 전송 인프라 비용까지 없어지는 것은 아님. 가벼운 모바일 앱의 첫 선택으로는 보류 |

## 실제 구현 전 확인

- 실제 Android Chrome/설치 PWA, iPhone Safari/홈 화면 앱, 카카오톡 인앱 브라우저에서 한국어 권한·시작·중단·인식 결과를 확인한다. 생성자 존재만으로 정상 동작을 판단하지 않는다.
- `ko-KR`, 중간 결과 표시, 최종 결과 중복 방지, 권한 거절/무음/네트워크 오류와 키보드 대안을 검증한다. 인식 도중 제출·사진 첨부·탭 이동도 확인한다.
- 실험적인 `processLocally`/언어팩 API만으로 한국어 완전 오프라인을 약속하지 않는다. 실제 언어팩 가용성과 브라우저 지원 확인이 필요하다.
- Whisper를 실험한다면 한국어 가능한 다국어 모델을 사용한다. 문서 예제의 영어 전용 `.en` 모델을 그대로 사용하지 않는다. 현재 한국어 정확도·기기별 속도는 측정하지 않았다.
- 제안은 음성을 텍스트로 바꾸는 범위다. 자동 제목·분류·문장 재작성은 별도의 판단이며 현재 검토에 포함하지 않았다.

## 공식/일차 자료

- [MDN SpeechRecognition: 지원 제한, 서버 기반 인식, 언어·중간 결과](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [MDN processLocally: 실험적인 기기 내 인식](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally)
- [MDN available: 언어 및 언어팩 가용성 확인](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static)
- [Apple iPhone 받아쓰기](https://support.apple.com/ko-kr/guide/iphone/iph2c0651d2/ios)
- [Google Gboard 음성 입력](https://support.google.com/gboard/answer/2781851?hl=ko)
- [Hugging Face Transformers.js WebGPU/음성 인식 예제](https://huggingface.co/docs/transformers.js/guides/webgpu)
