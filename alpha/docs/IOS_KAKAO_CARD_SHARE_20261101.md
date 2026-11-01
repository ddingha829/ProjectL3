# iOS installed-app card sharing — 2026-11-01

The reported installed iPhone app opened `talk-apps.kakao.com` and never reached KakaoTalk. That is the SDK's app-launch Universal Link destination. The screenshot identifies the launch handoff failure; it does not establish an account-key or image-upload error.

## Changes
- Installed iOS/iPadOS + native file-sharing support: card and complete-collection sharing directly invoke `navigator.share` inside the user's click. The user selects KakaoTalk in the system sheet; the app does not navigate to the SDK launch page or upload these images to the Kakao CDN.
- Label the action “카카오톡으로 이미지 보내기” and explain how to select KakaoTalk/More. Selected front/back/pair files are preserved. Do not duplicate the same native share action under a second button.
- Other environments retain Kakao's card-link template. Prepare/upload first, then invoke the cached SDK launch closure only on a new “카카오톡 열기” click. Previously the card flow awaited image upload and immediately launched in that continuation.
- Keep image-save fallback and cancel handling; do not automatically retry, upload, or launch a different share route after a cancelled or failed action.
- Complete collection uses the same iOS route. Group invitations are outside this change.

## Verification
- Nine component integration scenarios passed with mocked destinations: fresh user activation, no SDK upload on iOS native path, cancel, failure/save recovery, ordinary Safari, Android, file-format invalidation, iPad desktop UA, unsupported file fallback, SDK preparation failure (nine named cases with multiple assertions).
- Existing Kakao template checks: 15; upload URL checks: 17; shared image URL checks: 10 passed. No actual external upload or message was sent.
- Browser UI harness uses the actual CardImageActions component and mocked OS/SDK endpoints. Native and SDK launch requests both observed `navigator.userActivation.isActive === true`; first SDK preparation observed zero launches.
- TypeScript and production build passed. Physical iPhone share-sheet targets and KakaoTalk delivery still need device verification; this environment cannot verify installed iOS apps.

References: [Kakao app-launch explanation](https://devtalk.kakao.com/t/topic/144631), [Kakao JavaScript sharing](https://developers.kakao.com/docs/ko/kakaotalk-share/js-link), [Web Share activation requirement](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

Run `node scripts/test-kakao-launch-flow.mjs` for the component checks; `node scripts/serve-share-ui-qa.mjs` serves the mocked browser UI on 127.0.0.1:3017.
