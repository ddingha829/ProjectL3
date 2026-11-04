# Live bento feed

The production feed uses chronological, justified two-card rows. Each pair shares a height by varying column widths. Notes and unpaired cards span the row, so a text card or odd result count cannot leave an empty second column. Layout uses native CSS Grid, including its initial render; no resize observer or absolute positioning is needed for feed cards.

| Topic | Front ratio |
| --- | --- |
| Daily / dining | 4:5 |
| Movie / drama | 2:3 |
| Book | 3:4 |
| Text only | 2:1 in feed; full-height review in detail |

`social/bentoLayout.ts` owns grouping and geometry. `BentoFront` is shared by feed, detail, photo editing and image export. It retains title, author, rating, date, place/creator, weather, video indicator and photo corrections. A work with no cover retains its topic and gets a typography placeholder. Video files load only through the existing detail player.

The production feed retains the existing scopes, category/search filters, sorting, saved items, collections and multi-select, list/calendar modes, four-record automatic pagination, new-arrival highlight, comments/reactions and history/scroll restoration. Collection contents use the same bento presentation. The paused prototype controls and duplicate bento renderer are removed; `/test/` now opens the production presentation. `/test/music/` remains separate.

Front template and ratio controls are removed from studio and card customization. Back templates, colors, fonts, material, preset/default-category management, image adjustment, export formats and complete review pagination remain. A back preset applies only back fields; previous `front` and `ratio` values remain in records and backups for compatibility. No database migration or record rewrite is performed.

Photo/work detail fronts and backs share the automatic topic geometry. Text-only detail retains a 420×672 review canvas. Export reads the actual canvas height and excludes the on-screen border. Long reviews still use the existing paginated full-back export; two-image/paired exports require a review that fits one back.

## Local backup

Before migration, all tracked source/assets at `6377c64844ee13385f7a923a69518c312614db96` were archived locally under `Documents/Codex/backups/ticgle-card-design-before-bento-20261104-202615/`. The archive is outside this repository and is not deployed. Its README describes restoration; user records, existing design fields and media remain in their original storage.

## Validation

`npm run test:bento` covers layout bounds, all topic pair combinations, chronology, ratios, non-overlap, legacy settings, photo/work/text/video front rendering, back-only presets and old-state round trips. Existing surface, swipe, viewport and pinned-toolbar checks remain required. Browser QA checks mobile light/dark views, studio controls, detail flipping, image generation and selection/search flows.
