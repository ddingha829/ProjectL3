# Invite placement after a work record is saved

New movie, TV and book records already become eligible unplaced tiles through the existing work filter. This change adds a lightweight bridge from confirmed saving to choosing a board position; it does not create a second record, upload another image or choose a slot automatically.

## Behaviour

- Only a newly created, valid work record authored by the current user is queued. The offer waits for successful server confirmation. Failed or pending saves do not display it; a successful retry can display it.
- The saved-card animation finishes before the offer appears. The text is “이 작품을 끌렉션에 놓아볼까요?” with a “자리 고르기” action, a thumbnail/title and a close button. No modal or autofocus interrupts the feed.
- First display includes a short explanation, remembered separately per account on this device. It stays for 12 seconds; later compact offers stay for 8 seconds. Keyboard focus, mouse hover and a hidden page pause the remaining lifetime.
- Dismissal leaves the original record and unplaced tile intact. Navigating, changing scope, opening a record or starting another record clears the offer and any queued invitation. Ordinary records and already placed tiles are excluded. Account changes cannot surface a previous account's invitation.
- Choosing a position opens the personal collection with the saved tile selected. The tray scrolls to that tile. A full first board opens the first page with a vacancy. Subsequent incoming logs do not replace a manually chosen tile.
- The offer shares the dock's document frame and bottom spacing. It hides with the keyboard and stays clear of existing dialogs/onboarding. Existing generic toasts no longer inherit a stale collection action.

## Validation

- `node scripts/test-collection-placement-offer.mjs`: 13 integration cases covering confirmation/retry, eligibility, dismissal, account isolation, intro persistence, paused timeouts, background visibility, the full-board destination and manual selection preservation.
- Existing mosaic encouragement (55 checks), remembered scope (9 cases) and viewport (23 cases) passed. Production build and TypeScript passed.
- Full `UnifiedApp` browser QA used a local composer and mocked save boundary, with real save feedback, invitation, navigation and placement components. No Supabase, native camera/location/notification request, upload or external sharing was used.
- At 393 × 793: pending/failed save had no offer; retry success played the saved-card moment and then the first intro. With 16 existing tiles, “자리 고르기” opened page 2 with the saved TV tile selected; tapping slot 17 placed the correct record.
- A later offer omitted the first intro. Both buttons measured 44px high. The offer ended at 699px and the dock began at 715px. No horizontal overflow. At 320 × 568 the offer ended at 478px, with the dock beginning at 492px, and no horizontal overflow. Dark mode was inspected. A normal record did not produce an offer.

Local screenshots: `.test-data/collection-offer-first-393.png`, `.test-data/collection-offer-dark-393.png`. To repeat the UI flow after a production build, run `node scripts/serve-collection-offer-qa.mjs`; its save-success/failure controls are local mocks and never contact the database.
