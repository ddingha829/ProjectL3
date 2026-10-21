# Local fonts

SEBANG Gothic 2.0 Regular/Bold and matching italic faces: unmodified WOFF2 files supplied by the project owner from WebFont/. Used for web typography only. Copyright SEBANG GROUP.
Official use and restrictions: https://www.sebanggroup.com/client/ko/company/font
The official terms allow commercial web use; they are NOT the standard SIL OFL and restrict unauthorized modification/redistribution/resale. Do not package these files as a downloadable font product.

Caveat wordmark subset (official Google Fonts text-subset download, only “live & log!”): https://github.com/google/fonts/tree/main/ofl/caveat
Copyright The Caveat Project Authors; SIL OFL 1.1, full license in Caveat-OFL.txt.

Font trial rollback: Settings > 화면 · 프로필 > 글꼴 > 기존. Stored on this device as l2_font_family=pretendard. No data or preset changes are required.

Italic is a design accent on editorial brands, magazine mastheads and full-bleed short quotes. It is not an application-wide font toggle.

Gaegu (개구) handwriting option: official Google Fonts Regular (400) and Bold (700), converted losslessly to WOFF2 with fontTools/Brotli, with all glyphs preserved. Source: https://github.com/google/fonts/tree/main/ofl/gaegu
Copyright 2018 The Gaegu Project Authors; SIL OFL 1.1, full license in Gaegu-OFL.txt. No reserved font name is declared in the upstream license.
Select Settings > 화면 · 프로필 > 글꼴 > 손글씨. Applies to UI and card typography on this device; saved logs/preset JSON are unchanged. Sharing re-renders the card after font changes. PWA shell v8 includes both faces for offline use.

Gaegu covers 2,350 common Hangul syllables; Sebang remains the fallback for other syllables and is also embedded during export. Both Gaegu faces use size-adjust:112% for small UI labels.


2026-10-21 readability update: Gaegu now uses its real Bold outline for the entire CSS weight range (100–1000), retaining the same 112% size adjustment. The Regular file remains available for baseline comparison/offline backwards compatibility. No synthetic stroke or modified outlines were added.

Single Day (또박 손글씨): official SingleDay-Regular.ttf converted losslessly to full-glyph WOFF2; Source: https://github.com/google/fonts/tree/main/ofl/singleday
Copyright 2015 DXKorea Inc.; SIL OFL 1.1, license in SingleDay-OFL.txt. All 11,172 modern Hangul syllables are retained. The original 400 outline is mapped across UI weights (100–1000), with size-adjust:110%; this is not a new variable-font weight axis. Device choice is l2_font_family=single-day. PWA shell v9 caches this 92,768-byte local font; PNG export embeds it with the Sebang fallback.
