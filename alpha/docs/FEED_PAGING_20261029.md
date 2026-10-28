# Four-record feed pages

The cloud boot path now loads RLS-protected account/group/preferences context and four recent records through the table API instead of calling the 300-record snapshot. Each feed request selects at most four records, with a `(created_at, id)` cursor in either sort direction. Categories, scoped groups, bookmarks, photos and search run on the server before limiting. Only those rows' comments, reactions, shares and signed images are hydrated.

Scrolling near the end requests another four; a button is the fallback. Skeleton cards and a status label show pending work. A failed request keeps the existing cards and cursor for retry. Filters invalidate late responses; account switches cannot merge another account's results. Existing rows are deduplicated by ID. Returning from another menu preserves the feed's loaded-page count and cursor.

Map, mosaic, studio, calendar, collections, selection, nearby notifications and export retain the existing complete snapshot path. A loading state guards those screens, and ZIP export refuses an incomplete state. Once complete data is cached, feed pages come from that cache; quiet feed polling stops, while focus/realtime updates still refresh it. The existing complete-snapshot 300-record limit is unchanged by this release. No schema, policy or privilege changes were needed.

Nearby location suggestions now request and display the three closest places. Explicit text search retains up to eight results.

Validation:
- Pure hook tests: four-record pages, single-flight, failure/retry cursor, stale filters, cached pages, menu return.
- Disposable live account: 12 records with timestamp ties, 4/4/4/0 pages, insert while paging without duplicate/skip, search punctuation, category/photo/sort/bookmark/group queries, anonymous denial, complete snapshot and partial-state non-deletion. All generated logs, group and account removed after the test.
- Location provider mock: distance sorting, limit three, text search retained; composer GPS regression checks.
- 393×793 browser: 4→8→12 cards, skeleton/status and retry with previous cards retained. Fixture lives in `scripts/feed-loading-fixture.tsx`; temporary app route removed before release.
- TypeScript, production build, map/viewport/feed toolbar checks. Physical iPhone PWA check remains with testers.
