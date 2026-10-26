# Card back navigation

- Card detail uses a 44px upper-left back arrow instead of the upper-right close icon.
- Dragging right follows the pointer; a short drag springs back. Vertical gestures remain available for comments and review scrolling. Taps still flip the card.
- Opening a card adds a same-URL history entry, preserving Next router state. Browser/OS Back closes the card and Forward reopens it. The original view, scope and saved scroll position remain in place.
- Native Back dismisses the top share/options/design dialog first. Unapplied design changes retain the existing confirmation.
- Text inputs, selected text, desktop review text selection and multi-touch do not initiate swipe dismissal. The leftmost 24px on touch is reserved for native browser/OS navigation.
- First-use card guidance includes the back arrow and right-swipe behavior.

Validation: typecheck, production build and 11 pure navigation/history checks passed. At 390 × 844, browser UI verified right-swipe dismissal, short-drag cancellation, tap flip, comments, back arrow, browser Back/Forward, share-dialog dismissal, and returning from a tile card to its original board. Physical iOS/Android edge gestures were not device-tested.

Deploy only the `codex/unified-vercel` Preview branch. Do not promote the personal production deployment.
