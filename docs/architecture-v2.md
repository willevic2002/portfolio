# Architecture v2 (architect, Wave 0) — binding for v2 builders; v1 docs/architecture.md applies where not overridden

## Verified in three@0.170.0 (jsdelivr source)
InstancedMesh(setMatrixAt/setColorAt/instanceMatrix.needsUpdate; raycast→instanceId; recompute boundingSphere or
frustumCulled=false after matrix changes). AgXToneMapping/ACESFilmicToneMapping/NeutralToneMapping + toneMappingExposure.
shadowMap.autoUpdate/needsUpdate (static bake possible). Points/PointsMaterial(sizeAttenuation). MathUtils.damp, Clock
(Timer only in addons). OrbitControls has NO tweening → damp camera.position + controls.target by hand, then controls.update().
mergeGeometries in three/addons/utils/BufferGeometryUtils.js. No three.core.js in r170.

## Data schema v2 (backward compatible)
projects.json entry: {id, title, kind?, category?: "projekt"|"intresse" (missing/unknown→projekt), summary, tech[], url?, year?, slot?}
KINDS: mower, pcb, thermometer, devboard, phone, chip, book, box(fallback); aliases board→pcb, robot→mower.
Placement in code via named anchors; optional `slot` pins an item. Rule: valid free slot > kind's PREFERRED anchor if free
> next free shelf-N > unplaced (guide only). 15 anchors → max 15 placed; main.js warns once if >15 (D4 successor).

## Lanes (disjoint files)
R1 environment — exclusive js/room/scene.js, js/room/env/**
  export const OBJECT_NAMES = ['backwall','desk','monitor','pc','drawers','chair','lamp','window','radiator','shelf','scooter','rug','plant','stringlights','ledstrip','particles'];
  export function buildScene({reducedMotion}) → {group, anchors: Record<AnchorName,Object3D> (origin = surface point
  for item bottom-centre, local +z faces camera, userData.size=[w,h,d]), lights (≤6 PointLight, exactly 1 castShadow),
  background, toneMapping, exposure, update(dt)→needsRender:boolean, animated:boolean (false when reducedMotion)}
  AnchorName = desk-left|desk-mid|desk-right|desk-front|sill|floor-rug|floor-corner|drawers-top|shelf-0..shelf-6 (15)
R2 objects+interaction — exclusive js/room.js, js/room/items.js, js/room/placement.js, js/room/camera.js;
  DELETE js/room/shelf.js, js/room/layout.js
  items.js: KINDS, makeItem(kind) (Group, origin bottom-centre, own materials, aliases, else box)
  placement.js (PURE, no imports): PREFERRED = {mower:'floor-rug', pcb:'desk-front', devboard:'desk-left',
    thermometer:'desk-right', phone:'desk-mid', chip:'shelf-0', book:'shelf-1', box:'shelf-2'}; place(items, anchorNames) → [{id,anchor}]
  camera.js: POSES {overview, desk} (values from design/spec-v2.md); createCameraRig(camera, controls, {reducedMotion})
    → {setView(name), focus(center|null, size), update(dt)→animating, view}; per-pose/focus OrbitControls limits recentred
  room.js: mountRoom(container, projects, {onSelect,onHover,reducedMotion}) → {select(id|null), hover(id|null), setView(name), destroy()}
    select also focuses camera; never calls onSelect. Container attrs: data-items=<placed n>, data-objects=<names>,
    data-view=<view>, data-focus=<id|''>. canvas role=img + aria-label. Shadow bake once after items placed.
    Picking: raycast invisible per-item hitboxes (Box3.setFromObject), click only with matching pointerdown <5px (v1 fix kept).
S shell — exclusive index.html (do NOT change importmap unless CSP hash recomputed), css/style.css, js/main.js, js/cv.js, README.md
  DOM: #room-canvas (full-viewport stage), #room-status, #room-hint, #room-note, #guide (nav) > #project-list,
  #interest-h + #interest-list (hidden when no intresse), list buttons button[type=button][data-project-id][aria-pressed],
  #guide-toggle (mobile, aria-expanded, aria-controls=guide), #view-toggle > button[data-view][aria-pressed] (hidden
  unless data-room=ready), #project-panel (card), #cv-link (a href="#cv"), #cv section (below the room).
  main.js: MAX_ITEMS=15 (warn once "projects: N > 15"); renderGuide splits by category; html data-cv/data-room kept;
  #p=<id> → setSelected + scroll room into view; #cv native scroll.
QA — exclusive tests/**: see contract in the v2 dispatch.

## Perf
InstancedMesh for repeated parts (bulbs, leaves, keys, fins); merge static furniture per material if draw calls >150.
≤6 PointLights; LED strips = emissive MeshBasic boxes; 1 DirectionalLight shadow (≤1024) baked once (autoUpdate=false).
Dust: one Points ≤300 verts, moved by rotating/bobbing the object (no buffer writes).
Loop: continuous only while visible+onscreen+something animating; else render-on-demand (dirty flag).
Reduced motion: no dust, no damping, camera snaps, render-on-demand. DPR≤2, pause hidden/offscreen, destroy() disposes.

## Open risks
Continuous loop slows swiftshader test runs (measure). OrbitControls azimuth/polar clamp around world axes → recentre per pose.
Anchor names are shared text between R1 and R2 — use the exact list above.

## Orchestrator decisions (resolving architect ↔ spec-v2 conflicts) — BINDING
- E1 CV = modal drawer (spec-v2 §5.6), opened by #cv-link / `#cv` hash (S implements open-on-#cv in main.js);
  with no WebGL (data-room=fallback) the CV renders inline. #cv element id stays.
- E2 Anchor NAMES stay the architect's 15 (desk-left|desk-mid|desk-right|desk-front|sill|floor-rug|floor-corner|
  drawers-top|shelf-0..shelf-6). R1 maps them onto spec-v2's zones: shelf-0..2 = wall shelf above the desk,
  shelf-3..6 = bookshelf. PREFERRED follows spec-v2 zones:
  {mower:'floor-rug', pcb:'desk-front', thermometer:'sill', devboard:'shelf-0', chip:'shelf-1', phone:'shelf-3', book:'shelf-4', box:'shelf-5'}.
- E3 No `object` field in data — `kind` selects the object. `slot` optional as specified.
- E4 Visual values (materials, lights, tone mapping ACES 1.0, camera poses/limits, 900 ms tweens) come from design/spec-v2.md.
- E5 Placement overflow (fixes a contract bug: "next free shelf-N" caps placement at ~10): valid free slot > PREFERRED
  if free > next free anchor in OVERFLOW = [shelf-0..shelf-6, drawers-top, desk-left, desk-mid, desk-right, floor-corner,
  sill, desk-front, floor-rug] > unplaced. n=15 → 15 placed; n=16 → 15 placed. placement.js exports OVERFLOW.
