# Dark card surface edges — 2026-10-31

- Add a theme-only SVG contour to ticket, polaroid and all nine text/review layouts. Existing cover styling remains the baseline.
- Contours use each layout's actual corner radius. Ticket contour follows the four cut corners and both semicircular punch holes at the same seam as the mask, for portrait and square cards.
- Stroke compensates for the logical card scale. The clipped inside half is approximately one screen pixel in feed and detail sizes. The SVG does not receive pointer events or create a new filter/compositor layer.
- Hide the contour in light mode and print. Remove UI-only elements from the export clone so theme changes do not alter saved artwork.

Validation: all front/text layouts inspected at mobile feed scale, portrait and square seam alignment checked, light mode has zero visible UI contours. At detail scale 0.8495, the 2.3543px logical stroke yields a 1px visible half stroke.

Exported ticket PNG (1080×1728): both punch centers have alpha 0. The straight outer edge retains RGB 18,19,22 and alpha 255, confirming the UI hairline is absent from the image. Production build and TypeScript passed. Temporary review route removed before build. Physical iPhone rendering was not tested.

Local review image: `.test-data/dark-card-edges-final.png`.
