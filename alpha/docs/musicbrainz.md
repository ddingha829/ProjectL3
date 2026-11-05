# 음악 티끌

새 티끌 → 작품 등록하기 → 음악에서 곡명·아티스트로 검색한다. MusicBrainz recording MBID를 작품 ID로 저장하고, 앨범·아티스트·발매 연도와 Cover Art Archive의 커버 참조를 함께 보존한다. 음악은 커버 유무와 관계없이 4:5 벤토 카드(정사각형 앨범 커버 + 아래 정보 영역)이며, 취향 선반·월간 카드·끌렉션의 기존 작품 흐름을 사용한다.

`GET /api/music/search?q=...`는 MusicBrainz JSON 검색을 최대 6개 결과로 정규화한다. 검색 입력은 650ms 뒤 요청하고 이전 요청을 취소한다. 브라우저별 분당 12회, 서비스 전체 1.1초 간격의 원자적 DB 슬롯으로 제한한다. 검색어는 해시한 키로 기존 provider cache에 보관하며 결과는 24시간, 빈 결과는 10분이다. 최대 96개 메모리 캐시를 먼저 확인해 같은 서버의 반복 검색은 DB도 조회하지 않는다. 새 테이블은 만들지 않는다.

`GET /api/music/cover?group=<MBID>&release=<MBID>`는 release-group의 500px 앞표지를 먼저 찾고, 없으면 release 앞표지로 대체한다. UUID만 입력받고 Cover Art Archive/HTTPS Internet Archive의 리디렉션만 허용하며 1MB·8초 상한을 적용한다. 실제 커버는 브라우저 1일/CDN 7일 캐시하고, 없는 경우 가벼운 SVG 기본 앨범 이미지를 1시간 캐시한다. 동적 이미지나 음원을 DB·사진 스토리지에 복제하지 않는다. 같은 출처 이미지 경로라 카드 이미지 내보내기에도 사용할 수 있다.

배포 전 `20261105_015_music_works.sql` 적용이 필요하다. 이 마이그레이션은 기존 저장 RPC의 카테고리·작품·이미지 경로 목록에 음악을 추가하고, service role만 호출 가능한 검색 슬롯 함수를 만든다. 기존 댓글·모임·알림·소유권 검사는 유지한다.

이전 YouTube 실험 API는 `/api/music/youtube`에 격리하며 음악 등록에 사용하지 않는다. `/test/music/`는 현재 MusicBrainz 검색과 벤토 앞면의 저장 없는 미리보기다.

출처: [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API), [요청 제한](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting), [Cover Art Archive API](https://musicbrainz.org/doc/Cover_Art_Archive/API).
