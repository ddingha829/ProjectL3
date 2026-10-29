# Feed/header hierarchy

- Feed toolbar: 48px with a faint warm background and a quiet border, 8px below the header and 12px above cards. Its single existing sticky surface gains glass/shadow on scroll. Category and archive no longer have separate default containers. Selected controls retain a soft accent state. Search/view expansion stays within the same row.
- The top gap sits on the toolbar sentinel, keeping the sticky detector aligned with the toolbar's actual flow position.
- Root spacing bug: the archive popover and feed pagination both used `un-feed-more`; pagination margins, height and button borders leaked onto the archive. They now use distinct `un-feed-library` / `un-feed-pagination` classes, including the QA fixture.
- Header scope picker is centred with symmetric grid tracks. The current scope has a subtle accent surface; group options show current active membership counts. Existing context switching and join/create actions are unchanged.
- Normal browsers retain installation guidance. At 320px the install control is an accessible icon button so scope/settings cannot overlap; installed apps still hide installation controls. Header/safe-area/dock dimensions are unchanged.

Validation: TypeScript; feed sticky-position tests (including the new 8px entry gap); manual 393px/320px layout measurements, search/view/archive interactions, scope/member counts, scrolling and themes; production build. Physical iPhone PWA validation remains with alpha testers.
