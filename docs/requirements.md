# Requirements v1 — Victor's portfolio site

_Produced by product-manager (Wave 0). The user opted out of clarifying questions; assumptions are marked A-n._

## User stories
- **US-1 Recruiter:** reads the CV in under a minute on any device, even without WebGL, and can open project repos.
- **US-2 Classmate:** explores the 3D room and clicks shelf items to see projects.
- **US-3 Victor:** adds one object to `data/projects.json`, pushes, and it appears on the shelf and in the list. No build step.

## Acceptance criteria
**Content / data**
- AC-1: The CV renders only from `data/cv.json`. Unknown values show as a literal `TODO`.
- AC-2: `projects.json` with N items (0–12) gives exactly N interactive shelf objects (`window.__room.items.length`) and exactly N `<button>`/`<a>` entries in the accessible project list.
- AC-3: `kind` (`chip|board|robot|book|box`) picks the shape. An unknown or missing kind falls back to `box`, with no console error.
- AC-4: The initial `projects.json` holds the 5 projects from the brief, with their kinds and URLs. The mower has no `url`.

**Interaction**
- AC-5: Clicking a shelf item or activating a list entry opens a panel (title, language/tech, description, link). Esc and the close button both close it, and focus returns to the trigger.
- AC-6: Hovering a shelf item gives visible feedback (highlight/label) within one frame.
- AC-7: List entries can be reached with Tab and activated with Enter/Space, and focus is always visible.

**Platform**
- AC-8: Zero console errors and zero 404s when served from a sub-path (`/portfolio/`). No `src`/`href`/`fetch` starts with `/`.
- AC-9: Three.js and addons load through an importmap pinned to `three@0.170.0` on jsdelivr. No `package.json` runtime deps and no build output.
- AC-10: With WebGL disabled, the CV and full project list still render, a Swedish notice replaces the canvas, and there are no uncaught errors.
- AC-11: With `prefers-reduced-motion: reduce`, there is no auto-rotation, camera tween or idle animation. Screenshots taken 1 s apart are identical.
- AC-12: Renderer pixelRatio ≤ 2. No render calls while `document.hidden`.
- AC-13: No external model or texture files. Network requests are same-origin plus jsdelivr (and Google Fonts) only.
- AC-14: At 375×667 there is no horizontal scroll, the CV is one column, and the canvas fits the width.
- AC-15: `<html lang="sv">`, with Swedish UI labels.
- AC-16: The background is `#050505`, the font is monospace, and only palette colours are used.
- AC-17: The room contains named scene objects: back wall, desk, ultrawide monitor, PC case with cyan glow, drawer unit, chair, lamp, window, radiator, and the shelf on the back wall.
- AC-18: `README.md` documents adding a project (with a JSON example) and deploying to Pages.

## Non-goals (v1)
No backend, CMS, analytics, cookies, contact form or i18n toggle. No bundler, npm runtime, TypeScript or framework. No imported models or textures. No GitHub API auto-fetch. No PDF export. No invented CV facts.

## Edge cases
- **0 projects:** empty shelf, the list says "inga projekt än", no errors.
- **12 projects:** a second shelf row, no overlap, all clickable.
- **More than 12 (A):** the first 12 go on the shelf, all go in the list, plus a console warning.
- **Long title (80+ chars):** wraps or ellipsizes, no overflow at 375px.
- **No `url`:** the panel says "ingen publik länk" and shows no dead `<a>`.
- **Malformed or missing `projects.json`:** the CV still renders and the list shows an error notice.
- **Tab hidden then shown again:** rendering resumes.

## Assumptions
- A1: One page, with the CV first and the room after.
- A2: The project list is always visible, not only as a fallback.
- A3: There is a test hook `window.__room` and/or `data-*` attributes.
- A4: Projects keep their JSON order.
