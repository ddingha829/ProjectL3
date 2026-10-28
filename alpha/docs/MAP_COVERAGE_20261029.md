# Map coverage simplification

The live map now uses only dong and city/county/district coverage. Zoom 13.25 and above shows dong coverage; all lower zoom levels retain individual districts. Province/country geometry is no longer requested by the app. Record counts and precise dong-to-district aggregation remain intact.

Dark mode blends revealed tiles at 72% opacity with 85% brightness and reduced saturation growth. Light mode keeps the existing appearance. Theme switches redraw existing panes immediately, including during replay, without rebuilding the map or moving it.

Validated with map-region geometry/count/zoom/theme tests, TypeScript, production build, and a 393×793 browser check of dark mode and zoom-out. Physical iPhone verification remains with alpha testers.
