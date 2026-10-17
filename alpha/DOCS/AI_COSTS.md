# Google AI 호출 경로 및 비용 확인

확인일: 2026-10-18 (한국시간). 공식 요금표와 현재 Alpha 코드를 대조했다. 실제 소유자의 Google 청구 계정·월별 청구액·Vercel 환경 변수 값은 조회하지 않았다. 로컬 키는 값 노출 없이 모델 목록 조회에만 사용했고, 유료 생성 호출을 실행하지 않았다.

## 실제 연결

| 기능 | 호출 경로 | 보내는 데이터 |
|---|---|---|
| 분위기로 색상 만들기 | `POST /api/ai/skin` → `callGemini` | 분위기 단어·문장, JSON 색상 생성 지시 |
| 내용 자동 추천 | `POST /api/ai/extract` → `callGemini` | 제목·본문·장소, GOOD/BAD/NOTE 요약 지시 |
| 장소 검색의 추가 폴백 | `GET /api/places/search` → `callGemini` | 앞선 장소 검색 결과가 없는 경우 검색어 |

이 기능은 텍스트 JSON을 생성한다. 카드 PNG는 브라우저의 `html-to-image`로 만들며 Gemini 이미지 생성 API를 부르지 않는다. 이번에 추가한 카페 샘플 사진은 개발 중 imagegen으로 한 번 만든 정적 파일이며 사용자가 스튜디오를 열 때마다 유료 사진을 생성하지 않는다.

현재 `src/lib/gemini.ts`의 후보 순서는 `gemini-3.8-flash` → `gemini-3.5-flash` → `gemini-flash-lite-latest`이다. 로컬 키의 Models 목록에서 세 이름이 제공되는 것을 확인했지만, 이는 운영에서 실제 성공한 모델이나 무료/유료 등급의 확인은 아니다.

Google은 현재 `gemini-3.5-flash`를 이전 모델로 분류하고 요청을 `gemini-3.6-flash`로 자동 라우팅한다고 안내한다. `latest`는 고정 버전이 아니므로 시점에 따라 대상이 달라질 수 있다. [3.5 모델 안내](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash.md), [모델 이름 규칙](https://ai.google.dev/gemini-api/docs/models#latest)

## 공식 Standard 유료 요금

USD, 100만 토큰당. 세금·환율·별도 Google Places 비용 제외. 출력에는 생각(thinking) 토큰도 포함한다.

| 모델 | 입력 | 출력 | 시점 |
|---|---:|---:|---|
| Gemini 3.8 Flash | $0.75 | $3.75 | 2026-12-31까지 |
| Gemini 3.8 Flash | $1.50 | $7.50 | 2027-01-01부터 |
| Gemini 3.6 Flash | $0.75 | $3.75 | 2026-12-31까지, 3.5 요청의 현재 라우팅 대상 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 | `latest` 비용을 검토할 때의 참고 모델. 별칭의 실제 대상 확정은 아님 |

[Google 공식 요금표](https://ai.google.dev/gemini-api/docs/pricing)

예시로 한 번에 입력 1,000토큰 + 출력·생각 합계 300토큰을 소비한다면 현재 3.8 Standard 요금은 **$0.001875/회**, 같은 사용량으로 1,000회면 **$1.875**다. 측정값이나 청구 보장이 아니라 계산 예시다. 실제 본문 길이·생각 토큰·재시도에 따라 달라진다.

## 앱 제한과 Google 무료 등급의 차이

`AI_DAILY_LIMIT=20`은 소유자/기기 ID별로 색상 생성·내용 추천·장소 검색의 Gemini 폴백이 공유하는 **앱 자체 제한**이다. 한국시간 자정 기준이며, Google의 무료 호출량이나 프로젝트 전체 지출 상한이 아니다. 여러 사용자의 비용은 같은 Google 프로젝트에 합산된다.

한도 도달·키 미설정·AI 오류 때는 색상은 로컬 절차적 조합, 요약은 로컬 추출기로 대체한다. 이 로컬 경로 자체는 Google 생성 요청을 보내지 않는다. 이미 실행된 Gemini 요청이 있었던 경우 비용까지 취소된다는 뜻은 아니다. 오해를 부르던 ‘무료 AI 호출 한도’ 문구는 ‘앱 AI 사용 한도’로 바꿨다.

2026-10-18 안정성 보강으로 호출 **전**에 `reserveAiUsage`가 원자적 사용량 증가 RPC를 이용해 횟수를 예약한다. 19/20 상태의 동시 요청 12개 중 한 개만 생성을 진행하는 회귀 검증을 통과했다. 실패한 생성도 예약 횟수에 포함되며, 키 미설정·빈 입력·한도 도달 시 로컬 폴백은 추가 예약하지 않는다. 이전에 제한 밖이었던 장소 검색의 Gemini 폴백도 같은 카운터에 포함했다. 기존 `PLACES_AI_DAILY_LIMIT=60` 미사용 상수는 제거했다. 모델 후보 재시도는 하나의 앱 요청 안에서 발생하므로, 20회가 Google HTTP 호출 수·토큰 수·금액 상한을 보장하지는 않는다.

Free/Paid 등급과 선불·후불 상태는 **API 키가 속한 프로젝트·청구 계정**에 따른다. Google Maps 결제를 연결했다는 사실만으로 Gemini 프로젝트의 결제 상태까지 확정할 수 없다. [Google 결제 안내](https://ai.google.dev/gemini-api/docs/billing)

## 다음 권장 조치 — 이번 변경에는 미포함

1. 실제 키의 프로젝트를 AI Studio에서 확인하고 Spend/Billing과 Cloud Billing Reports에서 Gemini API/SKU별 금액을 확인한다.
2. 필요하면 프로젝트 지출 상한을 설정한다. Google은 실험적 상한 및 약 10분 집계 지연에 따른 초과 가능성을 안내하므로, 앱 측 호출 제한도 함께 둔다.
3. 요약·색상처럼 작은 JSON 작업에는 고정 Flash-Lite 모델을 우선하는 비용·품질 비교를 권한다. 이번에는 모델 순서를 임의로 바꾸지 않았다.
4. `maxOutputTokens`, thinking 설정, 입력 길이 제한 및 프로젝트 전체 요청 제한을 추가하고 모든 AI 경로에 일관되게 적용한다.
5. `usageMetadata`의 입력·출력·생각 토큰, 실제 `modelVersion`, 시도 횟수를 기록하면 성공 횟수보다 정확하게 비용을 추적할 수 있다. 사용자 원문이나 키는 로그에 남기지 않는다.

[공식 지출 상한 설명](https://ai.google.dev/gemini-api/docs/billing#spend-caps)
