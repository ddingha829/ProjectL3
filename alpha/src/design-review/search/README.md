# MCP search design study

Separate review route: `/design-review/search-v2/`. The selected floating design is now integrated in the main unified logbook via `components/logbook/FloatingLogControls`. The quiet alternative remains a review option. Shared icon/choice primitives live in `components/logbook/`. The logbook controls remain sticky below the safe area, with an elevated translucent surface while pinned. Root horizontal overflow uses `clip`, which preserves viewport scrolling instead of creating an unscrolled body scroll container.

The actual configured MCP catalogs were inspected before implementation:

- shadcn `input-group` and `input-group-icon`: input/add-on/end-action structure, adapted to L2 CSS. No blanket shadcn initialization or theme overwrite.
- Tween UI `sliding-tabs` and `sliding-tabs-demo`: moving selection indicator. The upstream component declares GSAP dependencies; the interaction was adapted to the app's existing Motion runtime. This is a pattern adaptation, not an installation of the upstream GSAP component. Selection follows the chosen category rather than hover so the visible state agrees with filtering. Supports touch, keyboard arrows, interrupted transitions, and reduced motion.
- AnimateIcons `lu-search`, React documentation and actual component source: locally copied/adapted icon with imperative play/stop on input focus, including touch focus and reduced-motion support. Uses the existing `motion` dependency and per-icon source.
- Compact feed iteration: the actual app uses the same Tween UI selection pattern for the small scope switch beside the logo and the collapsed category list. AnimateIcons `lu-sliders-horizontal` was searched, read and locally adapted for the filter control. The one-row toolbar keeps category, view and library in accessible popovers; all interactions have touch and keyboard paths, and respect reduced motion. These are source/pattern adaptations to existing CSS/Motion rather than upstream GSAP installations.

Source references:

- https://ui.shadcn.com/docs/components/input-group
- https://tween-ui.vercel.app/r/sliding-tabs.json
- https://animateicons.in/r/lu-search.json
- https://animateicons.in/icons/docs/react

The prototype uses fixed example data in memory, with working search, scope/category selection, staged filter application/cancel, sort, photo-only filtering, card/list modes, saved view, dark/light mode. It does not write browser or cloud log data. Prototype navigation actions explicitly direct the user to the main app rather than pretending to create a real log.

Verification: `npm run typecheck`, static build, `scripts/qa-search-v2.mjs` in Chrome and WebKit. The test checks focus restoration, touch-sized controls and responsive overflow, and actual normal/reduced-motion icon behavior.
