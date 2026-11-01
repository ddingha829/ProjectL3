# Samsung Internet installation, writer location and last group

## Changes

- Last selected scope is stored on this device under an account-specific key. Membership is loaded before restoration and before feed pagination starts. An explicit entry `scope` wins; a group the account no longer belongs to falls back to personal records. Demo preferences are separate. No new database requests or schema changes.
- Writer location retries call the native API synchronously from the button even if an automatic request never answered. Requests have a cancellable 15-second watchdog, HTTPS/API/policy checks and readable permission errors. Stale callbacks cannot update a closed writer or a work entry.
- Reverse-address failure retains validated GPS coordinates rather than dropping the location. An explicit AbortController timer replaces reliance on AbortSignal.timeout. A location alias or a location-free entry still works.
- Samsung Internet receives address-bar install-icon instructions, a menu fallback, and the instruction to launch the installed icon. Android Chrome, iOS and PC instructions remain available. A captured native install event still opens its confirmation dialog on a direct tap.
- Existing installation identity (`id`, scope and start URL `/`, standalone mode) is preserved. Manifest language and related-app preference are explicit.

## PWA audit

The live site already had the essential PWA configuration. HTTPS, a linked manifest, root service worker registration, standalone display, and 192/512-pixel PNG icons including a maskable icon were present. HTTP checks of the manifest, worker and every icon returned 200 with the proper MIME types; PNG dimensions matched the manifest. `/sw.js` permits root scope and bypasses HTTP caching for updates.

The worker deliberately does not cache account pages, photos or private API data. This change does not claim offline access. It does not change the existing installation identity or ask installed users to reinstall.

Samsung controls the visibility and appearance of its address-bar installation affordance. Eligibility and the guide can be checked here; actual icon appearance, WebAPK installation and Samsung permission prompts still require a Galaxy device.

## Validation

- `node scripts/test-browser-location.mjs`: 10 cases, including no callback, denied permission, API throw, policy/HTTPS failures, cancellation and invalid coordinates.
- `node scripts/test-composer-location.mjs`: 11 cases, including pending-request retry, coordinate preservation, StrictMode replay and stale reverse-address completion.
- `node scripts/test-pwa-install.mjs`: 15 cases, including Samsung detection, one-use prompt, dismissal, app-installed and display-mode transitions.
- `node scripts/test-remembered-scope.mjs`: 9 cases, including deferred membership, explicit links, removed membership, account/demo separation and unavailable local storage.
- Notification-worker isolation, viewport (23 cases), page-swipe rules (23) and swipe events (26) passed.
- Production build and type checking passed.
- Local browser QA at 393 × 793 used actual React components with mocked GPS, reverse-address and native installation APIs. A retry showed `userActivation=true`; an address outage retained `현재 위치`. Group A survived reload and account B started separately. Samsung install instructions and permission-help disclosure rendered and remained dismissible.
- The full production-built app was also checked in the example account: selecting 친구들, returning to the bare `/` URL restored `scope=daily` and the group feed; collaborative collection and settings remained accessible.

Screenshots are in `.test-data/samsung-install-393.png` and `.test-data/samsung-permission-393.png`. The local harness is `scripts/serve-samsung-ui-qa.mjs`; it never requests real location, installs an app, signs in or writes to Supabase. Fixture screenshots are not a physical Samsung test.

## Primary references

- [Samsung: Progressive Web Apps](https://samsunginternet.github.io/docs/progressive-web-apps): HTTPS service workers, manifest, URL-bar badge and standalone launch; push permission is not required for recognition.
- [MDN: getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition): secure context, permission and native options.
- [MDN: geolocation policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/geolocation): policy denial.
- [Samsung: location permissions](https://www.samsung.com/ae/support/mobile-devices/how-to-activate-my-location-and-change-settings-for-location-permissions/): device location and app-level permissions.

## Physical-device follow-up

1. Open `https://www.ticgle.kr` directly in Samsung Internet. Use the address-bar install icon or ≡ menu fallback and confirm installation. Launch its icon and confirm the address bar is absent.
2. Open a new photo/written record, tap location, and check that location is acquired. If permission was already blocked, follow the visible device/site permission instructions, then retry. Film/book records intentionally do not request GPS.
3. Choose a group, fully close and reopen the installed app, and confirm it starts in that group. Explicit invitation/shared links retain their own destination.
