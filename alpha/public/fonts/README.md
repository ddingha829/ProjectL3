# Fonts

The active UI uses NAVER NanumSquareNeo. Card typography offers NanumBarunGothic, NanumSquareNeo, NanumMyeongjo, and NanumGeumEunBoHwa.

Official NAVER webfont sources and weight aliases are in `src/styles/nanum-fonts.css`. Fonts load from `hangeul.pstatic.net` only when used; card export embeds the actual selected WOFF outline. The four former Sebang font files and their preload were removed.

Legacy Caveat, Gaegu, Single Day and Noto files remain for older non-active preview components with their existing license texts. They are not the app default or selectable card fonts.
