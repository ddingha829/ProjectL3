# Mobile Studio workspace — 2026-10-27

- Preset selector and new-preset action now sit above the preview.
- Front / back / color / finish & typography edit inline without covering the card in a modal.
- Front/back tabs select the corresponding preview face. Preview also offers ratio and photo/text sample controls.
- Name and category defaults live together in secondary settings. Both are drafts until the single preset save action; assigning a category removes it from other presets in the same state transaction.
- Library selection, unsaved-change confirmation, ordering, deletion, and 20-preset limit remain.
- Mobile uses a bounded scrollable settings area; smaller heights reduce this area to keep the save row reachable. Desktop retains side-by-side preview and controls.
- First-use guide updated. Shared card editor still shows its normal Apply button outside Studio; color fields precede theme choices in keyboard and visual order.

Validation:
- TypeScript and production Next build passed.
- Browser checked at 390x844, 375x667, and 1100x800, including dark theme and square/no-photo preview.
- Created a local demo preset; changed back layout, colors, finish, font, name and category default; saved and reloaded. Values persisted, and former category default was cleared.
- No production deployment or real-account data changes.
