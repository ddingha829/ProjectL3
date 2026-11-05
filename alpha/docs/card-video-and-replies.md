# Inline card video and comment replies

Feed and detail explicitly opt into inline video; studio, map, thumbnails and image exports retain still covers. Only at least 60% visible foreground cards play, up to two decoders at a time. Other dialogs, hidden tabs, back faces, reduced-motion and data-saver preferences suspend autoplay. Pause and manual playback remain available. Signed sources are reused in memory for 20 seconds per client/account (60-second URLs), without a persistent token or media cache.

New recordings use a silent 480×768 canvas at 15fps and a 600kbps target. Album/compatibility encodes also use 15fps with bounded bitrate fallbacks. Existing conforming camera MP4s are copied, not batch re-encoded. Sharing still captures the underlying poster and strips video UI.

Migration 14 adds an optional parent comment reference. The existing comment query returns roots and replies together. RPC writes and full/paged reads preserve parent IDs; a trigger rejects missing, cross-log and cyclic parents. Existing RLS and notification rules remain in effect. UI flattens descendants to one visual indent and retains the specific parent context. Reply selection/cancellation stays local until submitting. The floating composer reserves additional scrolling clearance while a reply is selected.

Validation: video resource policy checks, camera/FFmpeg/schema tests, bento checks, 60 database scenarios, comment thread ordering tests, typecheck/build and mobile browser interaction checks. Live migration verification is read-only after applying the transaction; no production test comments are inserted.
