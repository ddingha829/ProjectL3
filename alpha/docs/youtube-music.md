# YouTube music integration test

`/test/music/` tests a real YouTube connection, separately from the paused bento design. It does not publish logs or alter the production category/work schema. User notes exist only in React state.

## Connection

- Public video links from YouTube and YouTube Music resolve using YouTube oEmbed; no search key or YouTube account connection is needed.
- Title search uses the official YouTube Data API v3, music video category, six results, explicit submit only.
- Enable YouTube Data API v3 in Google Cloud, restrict the key to that API, and set **server-only** `YOUTUBE_DATA_API_KEY` in Vercel. Redeploy to pick up the setting. Never use a `NEXT_PUBLIC_` variable for this key.
- `/api/music/search/?status=1` exposes capability booleans only.

## Resource limits

- Existing shared integration RPCs hold atomic request budgets: 12 uncached lookups/browser/minute; 95 uncached title searches/day per configured key; 300 uncached link lookups/day. Daily boundaries follow Pacific time, including daylight saving.
- Metadata uses a bounded in-memory cache (96 entries/instance, 24h expiry), removed by timers and checked on every read. No YouTube metadata is written to DB/disk. Different serverless instances can miss this cache, but the DB request budgets remain shared. No image/video/audio binary is stored or proxied.
- No autoplay, audio extraction, thumbnail processing, extra npm dependencies, or changes to the production feed.
- Before permanent music-post storage is introduced, design the reference/metadata refresh and guaranteed deletion lifecycle together with the database migration. This test does not add permanent YouTube metadata to posts.

## Verification

`npm run test:music`, `npm run typecheck`, `npm run build`.

Tests cover trusted-host parsing, canonical URLs, invalid/private videos, metadata validation, cache hits, atomic quotas, Pacific day changes, and sanitized provider failures. Real oEmbed retrieval and modal focus/close/error retry are checked in the browser. Live title search requires the configured Google key.

Sources: [Search API](https://developers.google.com/youtube/data/reference/rest/v3/search/list), [developer policies](https://developers.google.com/youtube/terms/developer-policies), [YouTube oEmbed provider](https://github.com/iamcal/oembed/blob/master/providers/youtube.yml).
