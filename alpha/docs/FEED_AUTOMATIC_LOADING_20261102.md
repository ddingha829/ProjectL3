# Automatic feed paging — 2026-11-02

- Removed the normal “티끌 4장 더 보기” action. Approaching the bottom of the owned app scroll pane automatically requests the next four records, preserving the existing keyset cursor and page size.
- The footer stays mounted while a request is loading; a callback ref also reconnects the observer whenever conditional rendering replaces the sentinel.
- One in-flight request at a time, disconnected observer callbacks ignored, final pages stop, failures pause automatic loading and expose only an explicit retry. Browser fallback uses passive scroll/resize events coalesced through one animation frame.
- Locally cached/full records page without network requests, even if the previous remote query had reached its final page.
- The new-entry sheet now offers Capture / Work / Text. Capture still includes the Photo / Video 2s switch; the separate video entry was removed.
- Validation: 32 pagination checks, typecheck and production build passed. Tests include sentinel replacement, auto single flight, stale callbacks, end-of-feed, local paging, scroll fallback and failure retry behavior. Local browser use was disabled in Work settings, so no fresh visual browser verification was performed for this change.
