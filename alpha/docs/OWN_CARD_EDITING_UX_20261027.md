# Own-card editing — 2026-10-27

- Individual card design editing now uses the same live workspace as Studio: actual card preview, front/back controls, ratio, color, finish and typography. Mobile reserves space for the apply row; wide screens show preview and controls side by side.
- Presets can be previewed before applying. Closing a changed draft uses an in-app discard confirmation. Unapplied changes do not modify the saved card.
- Content editing reuses the new-log writing sheet over the existing photo or note background. Existing title, body, rating, attachments and optional details are prefilled. The title is editable separately.
- Opening an edit does not acquire current GPS or replace historical weather. Saving preserves the original date, card appearance, photo adjustment (unless the photo changes), reactions and shared audiences.
- Guide copy reflects the new editing paths and pauses while the design editor is open.

Validation:
- TypeScript and production build passed. Card navigation (11), page swipe (23), card date/layout (36) and weather (10) checks passed.
- Browser checks at 390x844, 375x667 and 1024x768: live preview, front/back and palette changes, preset selection, apply/cancel, content save/reload, unsaved-content cancellation, no-photo editing and Studio save/sample toggle.
- Saved edited demo content retained rating, place, original date and the selected card layout after reload. No-photo editing opened the note background without starting a camera stream.
- Viewport checks are browser emulation, not a physical iPhone test. No database schema or migration changes.
