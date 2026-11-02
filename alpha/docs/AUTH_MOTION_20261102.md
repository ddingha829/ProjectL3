# Auth motion — 2026-11-02

- Login/signup use the established 400/30 spring, limited to the auth panel, heading, confirmation fields, button feedback and a body-level visual bridge. No app ancestor transform, viewport movement, backdrop blur or extra server request was introduced.
- The native form, submit target and credential inputs remain stable. iOS password-manager DOM values, single-flight submission, password confirmation and recovery behavior are preserved. Exiting confirmation fields immediately become inert/hidden.
- Actual authentication starts the bridge from the submit button's position. A successful API result is distinct from the destination being ready. Completion is shown only after both; the small check holds for 280ms before the bridge fades and reveals the unchanged app geometry. Signup reveals nickname setup with a restrained spring.
- Slow requests have honest text after eight seconds. Errors dismiss the bridge and preserve entered fields for retry. Recovery never shows an authentication-success bridge. Reduced-motion removes physical movement and the completion hold.
- Validation: `test:auth-motion` checks six interaction/state scenarios, auth-session transition checks 8, existing auth error checks, surface interaction checks, typecheck and production build passed. The local auth QA harness supports the new bridge with mocked results and no external account creation.
- Browser control was disabled in Work settings, so no fresh visual/iPhone/PWA execution was performed. The change is validated with component/state checks and the production build.
