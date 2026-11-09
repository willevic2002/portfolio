# Architecture v1 (architect, Wave 0) — condensed; orchestrator decisions at the bottom

Verified against three@0.170.0 source on jsdelivr (context7 unavailable): importmap must map `three` AND
`three/addons/` (→ examples/jsm/). WebGLRenderer r170 requires **WebGL2** (throws otherwise) → check
`getContext('webgl2')` and wrap mount in try/catch. Raycaster ignores `.visible` → invisible hitboxes work.
Headless Chromium 152 here: WebGL2 needs `--user-data-dir=<tmp> --enable-unsafe-swiftshader --use-angle=swiftshader`;
`--disable-3d-apis` forces no-WebGL; console lines appear in stderr as `INFO:CONSOLE:...` with `--enable-logging=stderr`.

## Ownership
- B (shell+cv): index.html css/style.css js/main.js js/cv.js README.md .nojekyll
- A (room): js/room.js js/room/{scene,shelf,items,layout}.js  (layout.js pure, no imports)
- QA: tests/**  (tests/layout.html, tests/out/.gitignore="*")
- Orchestrator: data/cv.json data/projects.json

## Schemas
projects.json = array of {id ^[a-z0-9-]+$ unique, title, kind chip|board|robot|book|box (unknown→box), summary ("TODO" ok), tech string[], url? https, year? int}
cv.json = {name, title, location?, about, contact[{label,url}], education[Entry], experience[Entry], skills[{group,items[]}], languages?[{name,level}]}
Entry = {start "YYYY"|"YYYY-MM", end? same|null (null = pågår), title, org, detail?}
TODO rule: string === "TODO" or startsWith("TODO") → rendered with class `.todo`.

## Shell ↔ room interface
DOM ids: #cv (sections #about #education #experience #skills #contact), #room-canvas (div; room appends canvas
role=img aria-label), #project-list (ul > li > button[type=button][data-project-id][aria-pressed]),
#project-panel (aside aria-live=polite), #room-note (fallback text).
html dataset (written ONLY by main.js): data-cv=ready|error, data-room=loading|ready|fallback.
main.js: fetch via new URL('../data/x.json', import.meta.url); render CV + list + panel; if hasWebGL2() →
await import('./room.js') → mountRoom(...) in try/catch, else/failed → fallback.
Selection: shell owns selectedId; setSelected(id) updates aria-pressed, panel, history.replaceState('#p='+id),
room.select(id). room.select never calls onSelect (no loop). onHover(id|null) previews in panel, null → back to selected.
`#p=<id>` on load preselects.

## Room (metres, Y up, origin floor centre)
Room x∈[-1.8,1.8] z∈[-1.6,1.6] ceiling 2.6; back wall z=-1.6 navy #1f2731; side walls #d9d9d4; floor #b9a68a; no front wall.
Desk top 1.6×0.8 @y0.74 x∈[-1.0,0.6] against back wall; mat, keyboard; curved ultrawide @x-0.35 (open cylinder segment,
emissive screen + thin white ring); second panel w/ red edge @x≈0.1; PC case 0.22×0.45×0.45 @x≈0.42 cyan emissive;
Alex drawers 0.36w×0.70h under right end; chair @(-0.25,0,-0.3); lamp @x-0.9; window on x=+1.8 z∈[-1.2,0.2] y0.95–2.2
emissive plane + curtain planes + radiator + light-blue scooter on sill.
Lights: hemi ~0.4; directional window from +x #dfe8f0 ~1.5; points PC #4fd0e0 (2, d1.2), lamp #ffb874 (1.5, d1.5), monitor #8b9aac (0.8). No shadows. bg #050505.
Camera fov50 near0.05 far20 start (-0.6,1.6,1.3) target (-0.1,1.1,-0.9). OrbitControls: enablePan=false, min/maxDistance 0.6/2.4,
polar 1.0–1.75, azimuth ±0.75, enableDamping=!reducedMotion.
Shelf: boards 1.2 wide × 0.22 deep centred x=-0.2 on back wall; row r at y=1.45+0.40r; rows=max(1,ceil(n/6)); first ceil(n/rows) in row0…;
x = left + W(i+.5)/count; n=0 → one empty board. makeItem(kind) → Group fitting 0.18×0.20×0.16 slot, origin bottom centre, own materials.
Picking: invisible slot hitbox per item (userData.projectId), raycast hitboxes only, once per frame; click only if pointer moved <5px.
Hover emissive #f0f0f0 0.25 + cursor pointer; selected emissive 0.4 + thin white torus "photon ring".
Perf: DPR ≤2, ResizeObserver, loop off when document.hidden or IntersectionObserver offscreen; destroy() disposes everything.
Mobile: canvas ~60vh (OrbitControls sets touch-action:none).

## Tests (stdlib + chromium)
Serve tmpdir with symlink portfolio→repo via `python3 -m http.server`, load /portfolio/.
test_static.py: schema validation, unique ids, https urls, no root-absolute paths, importmap pin, .nojekyll.
test_browser.py: WebGL run (--dump-dom) data-room=ready, data-cv=ready, button count = len(projects), name present;
fallback run (--disable-3d-apis) data-room=fallback + list + CV; deep link #p=<id> → panel has title;
fail on any :CONSOLE line or server 404; screenshots 1280×800 + 375×812 (>20KB) to tests/out/.
tests/layout.html imports layout.js, dumps layouts for n=1,6,7,12 → assert rows + no overlap.
CDN unreachable → WebGL test SKIPPED, not failed.

## Orchestrator decisions (resolving Wave-0 conflicts)
- D1 Fonts: system monospace stack only, NO webfonts (ignore any @import of Google Fonts in design/tokens.css).
- D2 Project panel: NON-modal `aside` beside the list (no focus trap). Opening via list moves focus to panel heading;
  Esc / close button clears selection and returns focus to the triggering list button. Hover previews.
- D3 Test hooks (AC-2, AC-17): room writes on ITS container `#room-canvas`: `data-items="<n>"` and
  `data-objects="backwall,desk,monitor,pc,drawers,chair,lamp,window,radiator,shelf,scooter"` (names it actually
  created via Object3D.name). main.js also sets `window.__room = {items: n}`.
- D4 >12 projects: first 12 on shelf, all in list, console.warn — tests must not run with >12 (warn = console line).
