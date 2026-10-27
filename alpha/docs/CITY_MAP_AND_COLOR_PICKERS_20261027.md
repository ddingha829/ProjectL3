# City map entry and simpler color controls — 2026-10-27

- Removed the duplicate HEX text fields from the shared card design editor (Studio and per-card editing). Kept native color pickers and theme presets; removed the now-unused validation UI/state. Mobile color swatches fill their columns.
- Main ScratchMap starts at zoom 9.5 for city context on phone widths. The first automatic GPS result uses the same constant, rather than zooming back to 15. Manual recenter keeps the current zoom. Location picker, compact and explicit focused-log flows keep their detailed views.
- Guide now describes city-level map entry.

Validation: TypeScript and production build; browser at 390x844 showed the complete Seoul city footprint at zoom 9.5 (province tier), then restored dong/log details at 13.5. Map entry was checked with location permission denied; successful GPS centering uses the same city constant by code. Studio has three native color inputs and no HEX fields; a palette change and save worked, with the save row clear of navigation. No browser errors during checks.
