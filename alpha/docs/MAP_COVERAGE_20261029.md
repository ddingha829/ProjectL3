# Map coverage simplification

The live map now uses only dong and city/county/district coverage. Zoom 12.75 and above shows dong coverage; all lower zoom levels retain individual districts. Province/country geometry is no longer requested by the app. Record counts and precise dong-to-district aggregation remain intact.

Alpha feedback from the large Hwaseong district: move the dong threshold from 13.25 to 12.75 (half a zoom level earlier), so a broad district gives way to local coverage sooner. Record pin details share this threshold instead of waiting until zoom 13. Initial entry remains at zoom 11; the close-up list remains at 13.5. Administrative boundaries are retained exactly rather than clipping a revealed district to the viewport. Zoom-boundary tests cover 12.5 (district) and 12.75 (dong).

Dark mode blends revealed tiles at 72% opacity with 85% brightness and reduced saturation growth. Light mode keeps the existing appearance. Theme switches redraw existing panes immediately, including during replay, without rebuilding the map or moving it.

Coverage edges use a 1.4px Gaussian blur on an SVG alpha mask, keeping the tile imagery and labels sharp. A mask wrapper compensates Leaflet's layer origin on pan/zoom; zero-sized panes are not masked directly. Boundary outlines are lighter too.

Pan flicker fix: the original mask encoded a new SVG image URL for every moving viewport origin. Safari could drop the old mask while decoding each replacement. Masks now keep a stationary frame in Leaflet layer coordinates, with 256px overscan on each side. Movement within that frame reuses the same decoded image and projected path. Larger moves, zoom/projection changes and coverage changes decode the replacement before switching its image, bounds and tile offsets together. Late/stale image callbacks and unmounts are ignored. Empty strength levels allocate no mask.

Validated with map-region geometry/count/zoom/theme tests, a mask-controller test covering 100 pan frames without another decode, atomic replacement, pending reuse, stale callbacks and cleanup; TypeScript, production build and 393×793 browser dragging (unchanged mask commit count for a short drag, one prepared replacement after a large drag). Physical iPhone verification remains with alpha testers.
