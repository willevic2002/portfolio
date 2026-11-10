# Design spec v2 — "rummet" is the landing (Event Horizon)

Supersedes `design/spec.md` §1–3, §5–7 and §9 where they conflict. v1 §4 (CV log look), §8 (focus ring, skip
link, selection, contrast table) still apply. CSS uses `design/tokens.css` only (v2 adds `--overlay-*`,
`--hint-bg`, `--vignette`, `--guide-w`, `--card-w`, `--cv-w`, `--hit-row`, `--overlay-inset`, `--dur-camera`).
3D hex values (§1.4) live in `js/room/*` only. Orchestrator decision D1 (no webfonts) still stands.

Reference use: `style-reference.png` = concept + quality bar (cut-away room, many small objects, practical
lights, left guide, view toggle, bottom hint). `setup-reference.jpeg` = what must be recognisable: navy wall,
white sit/stand desk with wood top, curved ultrawide, red-edged second panel, black PC with cyan glow, white
5-drawer unit, white mesh chair with headrest, window right with sheer curtains, radiator, light-blue Vespa on
the sill, glass-bulb lamp left on the desk. Nothing purple/orange-saturated, no copied objects.

---

## 1. Room art direction

### 1.1 Mood: "warm island in the void"
- The room is a lit low-poly island floating in pure black (`#000000` clear colour + CSS `--vignette` overlay
  `pointer-events:none`). No ground plane, no sky — only the room.
- **Warm inside (~65 % of light energy):** glass-bulb desk lamp, string lights, wood floor/desk, accretion glow
  from the window. **Cold Event Horizon (~35 %):** razor-thin cold-white LED edges, starlight key, monitor/PC
  glow, the photon-ring rug. Rule of thumb: warm = soft area light, cold = thin lines. Never a cold fill wash.
- Saturation stays low: every colour is a palette hex or a mix of palette hexes (table §1.4). Accent hues
  (red/yellow/orange/green/cyan/blue/magenta) only on small objects so projects read as the "colour" in the room.
- Low-poly: flat shading look via `MeshStandardMaterial({flatShading:true})` on organic shapes (plant, chair
  cushion, curtains); hard-surface boxes use small bevels faked with 1–2 extra segments, not smooth normals.
  Objects are **stylised 1.5–2× real scale** so they read at overview distance (scale noted per object).

### 1.2 Layout plan (metres, Y up, origin = floor centre, right-handed)

```
              back wall z = -1.8 (navy)                       right wall x = +2.0 (white)
  x: -2.0 ---------------------------------------------------- +2.0
      | [lamp] [wallshelf: radar · enchip]  [bookshelf ]      |  corner
      | [desk ===== ultrawide · panel · PC][drawers] [ 4 rows] |  plant
      |  ultrasonic PCB(on desk, front-left)                   |
      |        (chair)                                         || window z -0.9..0.5
      |                                                        || sill: vespa · grillmonitor
      |                 ( photon-ring rug )                    || radiator below
      |                                        [mower]         |
  open (cut-away) side z = +1.8 / x = -2.0  → camera side
```

| element | position / size | notes |
|---|---|---|
| room | x ∈ [-2.0, 2.0], z ∈ [-1.8, 1.8], walls 2.6 high, wall thickness 0.08 | walls: back (z-) and right (x+) only; floor slab 0.10 thick (top at y=0) |
| desk | top 1.6 × 0.8 × 0.03 at y 0.74, x ∈ [-1.40, 0.20], z ∈ [-1.80, -1.00] | white T-legs at x -1.35/0.15, feet run along z |
| drawer unit (5) | 0.36w × 0.58d × 0.70h, x ∈ [-0.16, 0.20], z ∈ [-1.80, -1.22] | under desk right end, 5 drawer seams + cut-out handles |
| desk mat + keyboard | mat 0.9 × 0.4 centred x -0.75, z -1.25 | |
| curved ultrawide | centre x -0.75, z -1.62, screen 1.0w × 0.42h, bottom y 0.86 | open cylinder segment r 1.8, 32° arc |
| second panel | x -0.12, z -1.65, 0.42w × 0.55h portrait-ish, bottom y 0.80 | red edge strip on its right side |
| PC case | 0.24w × 0.46h × 0.44d at x 0.02, z -1.55, on desk | glass side faces −x (towards camera) |
| desk lamp | x -1.28, z -1.62, on desk | glass bulb dome on black base |
| chair | (-0.75, 0, -0.70), yaw 15° | white mesh back + headrest, 5-star base |
| wall shelf | board 1.2 × 0.22 × 0.03, x ∈ [-1.40, -0.20], y 1.55, z ∈ [-1.80, -1.58] | wood top, white brackets, LED edge underneath |
| bookshelf (open, black) | 0.90w × 0.35d × 1.80h, x ∈ [0.55, 1.45], z ∈ [-1.80, -1.45] | boards at y 0.02 / 0.46 / 0.90 / 1.34 / 1.78 → 4 cubbies + top |
| window | in right wall, z ∈ [-0.90, 0.50], y ∈ [0.95, 2.20] | 2 casements, white frame 0.05 |
| windowsill | x ∈ [1.76, 2.0], z ∈ [-1.0, 0.6], y 0.92 | |
| radiator | x 1.94, z ∈ [-0.80, 0.40], y ∈ [0.15, 0.75] | 12 vertical fins (one merged geometry) |
| curtains | two sheer panels hanging at x 1.90, z ∈ [-1.15, -0.85] and [0.45, 0.75], y 0.25–2.40 | 6-fold zig-zag geometry |
| floor plant | pot at (1.70, 0, -1.55) | tall low-poly fiddle-leaf, 1.1 h |
| shelf plant | bookshelf top, x 1.30 | trailing vine down the right side |
| string lights | catenary along back wall top, y 2.42 → sag 2.28, x -1.9 → 1.9, 2 sags; 22 bulbs | `InstancedMesh` |
| rug | disc r 0.90 at (0.30, 0.004, 0.45) | photon ring, §1.5 |
| dust volume | box x[-1.9,1.9] y[0.1,2.5] z[-1.7,1.7] | §1.7 |

### 1.3 Project objects (7) — where + shape language

Placement spreads projects over five zones (desk, wall shelf, bookshelf, sill, floor). Each object gets an
invisible hitbox (its bbox + 15 %) for picking and a named anchor `slot`. Recommended data change (architect
decides): `projects.json` items gain `category: "projekt"|"intresse"`, `object` (model key below; unknown → `box`)
and optional `slot` (else first free slot of the category).

| # | project id | object key / slot | position (base centre) | shape language (what reads at overview) |
|---|---|---|---|---|
| 1 | `robot-mower` | `mower` / `floor-1` | (1.25, 0, 1.05), yaw −35° (nose toward rug) | Husqvarna silhouette: low wedge shell 0.62 × 0.48 × 0.22 (1×), dark grey shell with a **muted orange chassis band** around the bottom, two big rear wheels + small front caster, **red STOP button** disc on top, **LiDAR puck** (cylinder r 0.05 h 0.05) on a short mast with a **cyan emissive ring** that spins 1 rev / 2 s (static under reduced motion). Tiny ROS-style "antenna" stub. |
| 2 | `ultrasonic-array` | `ultrasonic` / `desk-1` | desk (-1.05, 0.77, -1.20), on a wire stand tilted 35° back, facing camera | square PCB 0.20 × 0.20 (2×) dark green, **4×4 grid of silver MEMS-mic squares**, a **centre transducer** (silver cylinder r 0.025 with dark mesh top), gold edge pads, small black FPGA ribbon going off the back. The grid is the identifier. |
| 3 | GrillMonitor (id TBD by orchestrator, e.g. `grillmonitor`) | `grill` / `sill-1` | sill (1.88, 0.92, 0.18), yaw −90° (faces room) | rounded black enclosure 0.10 × 0.07 × 0.04 with a **round "dial" display**: emissive orange arc gauge (270° ring) + yellow dot; a long **steel probe needle** (0.22) laid on the sill joined by a coiled cable; next to it a bare **ESP32-C6 board** (navy-black PCB 0.07 × 0.03, silver shield can, gold meander antenna). Reads as "thermometer + board". |
| 4 | STM32 labs 2024 (id TBD, e.g. `stm32-labs`) | `radar` / `wallshelf-1` | wall shelf (-1.00, 1.58, -1.69) | white-ish dev board 0.14 × 0.08 (2×) with black MCU square + header rows; on it a **blue servo** (SG90 box) carrying an **HC-SR04 "two-eyes" sensor** (blue PCB + 2 silver cylinders). Servo sweeps ±60° over 4 s ease-in-out; a faint green **radar fan** (`CircleGeometry` 120° sector, r 0.35, additive, opacity 0.10) follows it. Reduced motion: static at 0°, fan at 0.06. |
| 5 | `karriarum26` | `map-book` / `bookshelf-3` | bookshelf cubby 3 (y 0.90), centre x 1.00 | closed **book** standing (muted magenta cover, cream pages) with a **folded map** leaning open against it: 3-panel zig-zag (cream paper) with a dark floor-plan grid of rectangles and 4 coloured **pins** (red, cyan, yellow, green) — "career-fair map + checklist". |
| 6 | `enchip` | `dip-chip` / `wallshelf-2` | wall shelf (-0.45, 1.58, -1.69) | oversized **DIP-16 IC** (0.16 long, ~6×) on a small clear-acrylic display stand (`MeshPhysicalMaterial`-free: plain standard, opacity 0.25), black body, 2 rows of 8 bent silver legs, pin-1 dimple, faint white laser line on top. One chip = "enchip". |
| 7 | `elektriska-gr` | `breadboard` / `bookshelf-2` | bookshelf cubby 2 (y 0.46), centre x 1.00, slight 10° yaw | white **breadboard** 0.20 × 0.07 (2×) with red/blue rail stripes and hole-grid seams, **3 LEDs** (red, yellow, green, emissive 0.8) and 4 arched **jumper wires**, small black DIP-8. Placeholder identity: summary is TODO — if the real summary says otherwise, swap the model, keep the slot. |

**Free slots for future "intresse" items** (render decor when empty, real item when filled):
`bookshelf-1` (bottom cubby: 2 storage boxes), `bookshelf-4` (top cubby: book stack), `bookshelf-top`
(beside the shelf plant), `desk-2` (desk right front, x -0.30 z -1.15), `floor-2` (on rug, (0.05, 0, 0.85)).
`box` fallback: `--eh-selection` cube 0.15 with a white LED edge on top.

Vespa (decor, not a project, recognisability): low-poly scooter 0.26 long on sill at (1.88, 0.92, -0.45), light
blue body, black seat, 2 wheel discs, white headlamp emissive 0.3.

### 1.4 Materials & colours (sRGB hex; three converts; `metalness` 0 unless noted)

Mix notation: `mix(a, b, t)` = a·(1−t) + b·t per channel, all inputs palette hexes (computed values shown).

| surface | hex (source) | rough | emissive (colour · intensity) |
|---|---|---|---|
| void / clear colour | `#000000` (darker) | — | — |
| floor slab sides | `#141414` (lighter) | 1.0 | — |
| floor planks (2 alternating, 0.18 wide, along x) | `#615146` mix(orange, darker, .45) · `#54473d` mix(orange, darker, .52) | 0.8 | — |
| back wall (navy) | `#272b30` mix(blue, darker, .72) | 0.95 | — |
| right wall (white, night-lit) | `#929292` mix(fg-light, darker, .35) | 0.9 | — |
| skirting, window frame, radiator | `#e0e0e0` (fg-light) | 0.6 | — |
| desk legs, drawer unit, chair frame/base | `#c8c8c8` (fg) | 0.55 | — |
| chair mesh back/seat | `#e0e0e0` (fg-light) | 0.95, flatShading | — |
| desk top, wall-shelf board | `#b19d84` mix(orange, yellow, .35) | 0.7 | — |
| desk mat, keyboard, monitors, PC case, bookshelf, lamp base | `#141414` (lighter) / keys `#2a2a2a` (selection) | 0.45 (PC 0.25, metal 0.3) | — |
| ultrawide screen | `#050505` (bg) | 0.3 | `#8b9aac` · 0.35 (dim desktop glow) |
| second panel screen | `#050505` | 0.3 | `#8b9aac` · 0.2 |
| second panel red edge | `#b07c7c` (red) | 0.5 | `#b07c7c` · 0.5 |
| PC internals (3 fan rings + strip) | `#8aa5a5` (cyan) | 0.4 | `#8aa5a5` · 1.6 |
| lamp glass bulb | `#e0e0e0`, opacity 0.35 + filament | 0.1 | filament `#b4ad8c` · 2.5 |
| string-light bulbs | `#cbc6b1` mix(yellow, fg-bright, .35) | — | same · 2.0 (`MeshBasicMaterial`, no lighting cost) |
| string-light wire | `#141414` | 1.0 | — |
| curtains | `#e0e0e0`, opacity 0.35, `side: DoubleSide`, `depthWrite:false` | 1.0, flatShading | — |
| plants: leaves (2 tones) | `#5c6d59` mix(green, darker, .35) · `#404c3e` mix(green, darker, .55) | 0.85, flatShading | — |
| plant pots | `#2a2a2a` (selection) | 0.8 | — |
| rug body | `#050505` (bg) | 1.0 | — |
| rug photon ring | `#f5f5f5` (fg-bright) | — | `MeshBasicMaterial` (renders ≈ white after tone map) |
| rug accretion halo | vertex-colour gradient `#b2a086` mix(orange, yellow, .5) → `#000000`, additive, opacity 0.35 | — | — |
| **LED edges** (shelf undersides, bookshelf fronts, cut-away edges, monitor bias strip) | `#f5f5f5` | — | `MeshBasicMaterial`, 0.006–0.01 thick boxes |
| mower shell / band / wheels | `#404040` mix(selection, muted, .35) · band `#b09480` (orange) · `#050505` | 0.5 / 0.6 / 0.9 | — |
| mower STOP button | `#b07c7c` (red) | 0.4 | `#b07c7c` · 0.25 |
| mower LiDAR ring | `#8aa5a5` | — | `#8aa5a5` · 1.5 |
| ultrasonic PCB | `#364034` mix(green, darker, .62) · mics `#c8c8c8` (metal 0.6) · pads `#b4ad8c` (metal 0.7) | 0.6 / 0.35 / 0.3 | — |
| ESP32 PCB | `#2a2e34` mix(blue, darker, .70) · can `#c8c8c8` (metal 0.7) · antenna `#b4ad8c` | 0.6 | — |
| grill dial | `#141414` body · arc `#b09480` · dot `#b4ad8c` | 0.4 | arc `#b09480` · 1.2, dot · 1.5 |
| probe needle | `#c8c8c8` metal 0.8 | 0.25 | — |
| STM32 board | `#e0e0e0` · MCU `#141414` · headers `#2a2a2a` | 0.6 | — |
| servo + HC-SR04 PCB | `#8b9aac` (blue) · transducers `#c8c8c8` metal 0.6 | 0.5 | — |
| radar fan | `#8ea889` (green), additive, opacity 0.10 | — | `MeshBasicMaterial` |
| book cover / pages | `#5a4e5c` mix(magenta, darker, .45) · `#d5d3cb` mix(fg-light, yellow, .25) | 0.8 | — |
| map paper / grid / pins | `#d5d3cb` · `#2a2a2a` · pins `#b07c7c` `#8aa5a5` `#b4ad8c` `#8ea889` | 0.9 | pins · 0.3 |
| DIP chip / legs / stand | `#141414` · `#c8c8c8` metal 0.7 · `#e0e0e0` opacity 0.25 | 0.4 | top line `#f0f0f0` · 0.4 |
| breadboard / rails / LEDs / wires | `#e0e0e0` · `#b07c7c` + `#8b9aac` · LEDs `#b07c7c` `#b4ad8c` `#8ea889` · wires `#b07c7c` `#8b9aac` `#b4ad8c` | 0.7 | LEDs · 0.8 |
| Vespa | `#abb5c2` mix(blue, fg-bright, .30) · seat `#141414` · lamp `#f5f5f5` | 0.45 | lamp · 0.3 |
| window: black hole core / photon ring / accretion disc | `#000000` · `#f5f5f5` · `#b2a086` | — | Basic; disc additive, opacity 0.6 |
| starfield | `#e0e0e0` / 15 % `#b4ad8c` | — | `PointsMaterial` size 1.5 px, no attenuation |

### 1.5 Event Horizon signature elements
1. **Photon-ring rug:** black disc r 0.90 (48 segments), white ring `TorusGeometry(0.62, 0.008)` lying flat at
   y 0.008, accretion halo `RingGeometry(0.62, 0.82)` gradient outward to black, plus a hairline outer ring at
   r 0.88 in `#6a6a6a`. The rug is the room's visual centre; nothing tall stands on it except the slot `floor-2`.
2. **Cold-white LED edges:** under the wall-shelf front, every bookshelf board front, a bias strip behind the
   ultrawide (y 0.9, glowing onto the navy wall), and **all cut-away edges** (top of both walls + floor-slab
   perimeter on the open sides). This outlines the room as a thin white "event horizon" against the void.
3. **Window = night + black hole:** behind the glass (x 2.6, outside the room) a black plane with 220-star
   `Points`, and a small black hole (core r 0.14) at window upper-left: thin `#f5f5f5` photon ring + tilted (75°)
   accretion disc (orange/yellow mix), slow disc rotation 1 rev / 60 s (static under reduced motion).
   The window is the main warm-cold story: warm accretion light spills into the room.
4. **Ambient dust** (§1.7).

### 1.6 Lighting rig (6 point lights max, `decay 2`, intensities = starting values in candela, tune by eye)

| # | light | position | colour | intensity · distance | shadow |
|---|---|---|---|---|---|
| — | HemisphereLight (fill) | — | sky `#8b9aac` / ground `#050505` | 0.35 | no |
| — | DirectionalLight "starlight" key (through window) | from (4.0, 3.2, -0.6) → target (0, 0, -0.4) | `#e0e0e0` | 0.7 | **only caster**: 1024² `PCFSoftShadowMap`, ortho box ±2.4, bias -0.0005; `renderer.shadowMap.autoUpdate=false`, set `needsUpdate=true` once after build (scene is static). Casters: desk, drawers, chair, bookshelf, mower, plants. Animated parts (radar, LiDAR) don't cast. |
| P1 | desk lamp | (-1.28, 1.02, -1.60) | `#b4ad8c` | 1.6 · 3.0 | no |
| P2 | string lights (one for all bulbs) | (0, 2.15, -1.30) | `#cbc6b1` | 2.0 · 4.5 | no |
| P3 | window accretion spill | (1.70, 1.70, -0.20) | `#b09480` | 1.2 · 3.5 | no |
| P4 | PC glow | (-0.12, 1.00, -1.50) | `#8aa5a5` | 0.6 · 1.4 | no |
| P5 | monitor bias | (-0.75, 0.95, -1.70) | `#8b9aac` | 0.5 · 1.4 | no |
| P6 | bookshelf LEDs | (1.00, 1.10, -1.30) | `#f0f0f0` | 0.4 · 1.2 | no |

Renderer: `toneMapping = ACESFilmicToneMapping`, `toneMappingExposure = 1.0` (desk view 1.05),
`outputColorSpace = SRGBColorSpace`, antialias on, DPR `min(devicePixelRatio, 2)`. Extra contact darkness:
one dark blob (`CircleGeometry`, `#000000`, opacity 0.35, radial vertex alpha) under chair, mower, plant pots.
Perf budget: ≤ 120 draw calls (merge static furniture per material; `InstancedMesh` for bulbs, radiator fins,
planks, mic grid, pins/LEDs), ≤ 150 k triangles.

### 1.7 Ambient particles
One `THREE.Points` (single draw call): 260 motes desktop / 120 at width < 600 px, `PointsMaterial` size 0.012,
`sizeAttenuation:true`, additive, `depthWrite:false`, opacity 0.35; 80 % `#e0e0e0`, 20 % `#b4ad8c` (biased
near lamp/window). Motion: rise 0.02 m/s + sine sway 0.01 m @ 0.3 Hz, wrap at the box top. **Reduced motion:
not created at all** (brief: off). Hidden while CV is open (render loop paused anyway).

---

## 2. Camera

All poses: `PerspectiveCamera` fov 38 (desktop) / 46 (portrait, aspect < 1), near 0.05, far 30.

| pose | target | position | notes |
|---|---|---|---|
| **översikt** (landing) | (0.15, 0.85, -0.35) | (-4.10, 3.55, 4.70) | 3/4 elevated from the open corner; whole room + rug visible with ≥ 6 % margin. Fit rule: keep direction, set distance so the room's bounding sphere (r 3.0) fills 92 % of the smaller fov; portrait gets the wider fov. |
| **skrivbord** | (-0.55, 1.05, -1.55) | (-0.55, 1.55, 0.25) | behind the chair like the photo; ultrawide, panel, PC, wall shelf (radar + enchip), lamp and ultrasonic PCB all in frame. Exposure 1.05. |
| **object focus** | object bbox centre | target + `dir · d` | `dir` = normalize(0.5·overviewDir + 0.5·slotNormal) where slotNormal is the surface's into-room normal (back wall (0,0,1), sill (−1,0,0), floor → use overviewDir); `d = max(0.55, 1.6 · bboxRadius / tan(fov/2))`. Clamp position to x ≤ 1.80, z ≥ -1.60, y ∈ [0.45, 2.40] so the camera never enters a wall. |

**Card offset:** when the project card is open, call `camera.setViewOffset(...)` so the focused object
centres in the *visible* area: desktop shift view centre left by `(--card-w + 2·--overlay-inset)/2`; mobile
sheet shift up by half the sheet height. Clear on close.

**OrbitControls:** `enablePan=false`, `enableDamping = !reducedMotion` (factor 0.08), `rotateSpeed 0.6`,
`zoomSpeed 0.8`. Limits are set per mode (relative to the pose's own target/distance d₀):

| mode | minPolar–maxPolar | azimuth (world) | distance |
|---|---|---|---|
| översikt | 0.70–1.22 rad (40°–70°) | −1.30 to −0.20 rad (camera stays on the open quadrant) | 0.55·d₀ – 1.15·d₀ |
| skrivbord | 1.05–1.55 rad | −0.45 to +0.35 rad | 0.7 – 2.2 m |
| object focus | 0.80–1.50 rad | pose azimuth ± 0.6 rad | 0.6·d – 1.6·d |

Wheel zoom only acts over the canvas (`touch-action:none` on canvas only, overlays keep normal scrolling).

**Transitions:** tween camera position + controls.target together over `--dur-camera` (900 ms),
`easeInOutCubic`; FOV/exposure lerp alongside. Controls disabled during the tween; any pointerdown/wheel
cancels it and hands control back from the current pose. **Reduced motion: instant cut** (set pose, `update()`,
render once) — no tween, no damping, no autorotate. Never autorotate in any mode.

---

## 3. Page structure (DOM, z-order)

```
<a.skip> hoppa till innehåll
<main id="innehall">
  <h1 class="sr-only">victor karlsson — portfolio</h1>        (name from cv.json; visible name lives in guide header)
  #stage   (position:fixed; inset 0)  canvas (aria-hidden, tabindex -1) + vignette + #room-status + hover label
  #guide   <nav aria-label="guide">  (left panel / bottom sheet)
  #views   <div role="group" aria-label="vy">  (top-right toggle)
  #card    <aside aria-labelledby="card-title">  (project card, non-modal per D2)
  #hint    bottom hint (aria-hidden)
  #cv      <section aria-labelledby="cv-h">  (drawer, §5.6)
</main>
```
`html[data-room=loading|ready|fallback]`, `html[data-view=oversikt|skrivbord|cv]` (shell writes both).
Header/topbar and footer from v1 are removed; GitHub link moves to the guide footer and the CV.

---

## 4. Interaction model

- **Shared state:** `hoveredId`, `selectedId`, `view`. Hovering a guide row glows its object and vice versa.
- **Object hover (pointer: fine only):** rim glow = v1 hover look (emissive `#f0f0f0` 0.15 + 1.06× back-face
  outline `#f5f5f5` opacity 0.5) + 1 cm lift over 150 ms (instant under reduced motion), cursor `pointer`.
  **Label** (DOM, not canvas): pill anchored at the object's projected bbox top-centre, 8 px above, never
  following the cursor; content `title` + `· projekt` (or `· intresse`); `--overlay-tip`, `--fs-sm`,
  `--color-text-bright`, `--radius-pill`, `--glow-sm`, `aria-hidden` (the guide is the accessible path).
- **Click / tap object** (pointer moved < 5 px): `selectedId = id` → camera tween to object focus pose → card
  opens. Selected object keeps rim glow + v1 photon-ring halo; others unchanged (no dimming — keeps it cosy).
  Click on empty space / Esc → close card, camera returns to the pose active before (översikt or skrivbord).
- **Guide row click/Enter:** same as object click, then focus moves to the card heading.
- **Touch:** first tap selects (no hover state on coarse pointers); label is skipped, the card shows the title.
- **Deep links:** `#p=<id>` preselects (v1); `#skrivbord` starts in desk pose; `#cv` opens the CV drawer.
  Use `history.replaceState` for changes.

---

## 5. UI overlay

All overlay panels: `--overlay-bg`, `--shadow-panel`, `--radius-lg`, 1 px `--edge-light` along the top edge,
body `--fs-base` (mono), text `--color-text`. No `backdrop-filter` dependency (contrast is computed without it;
add `blur(8px)` as progressive enhancement only).

### 5.1 Guide panel (left) — desktop ≥ 900 px
- Fixed `top/left: --overlay-inset`, width `--guide-w`, `max-height: calc(100dvh - 2·--overlay-inset - 48px)`,
  internal scroll (`overscroll-behavior: contain`).
- Header: name `victor karlsson` (`--fs-md`, `--fw-bold`, `--color-text-bright`, lowercase) + role line
  `ingenjörsstudent · jönköping university` (`--fs-sm`, `--color-text`), both from cv.json.
- Toggle button **above** the panel (like the reference): `dölj guide` / `visa guide`, `aria-expanded`,
  `aria-controls="guide-list"`, pill, height `--hit-row` (fine) / `--hit-min` (coarse). Hidden state persists in
  `sessionStorage`. Hiding = `hidden` on the list (no animation needed; fade `--dur-base` if motion ok).
- Sections: label `# projekt` / `# intressen` as `<h2>` (`--fs-xs`, `--fw-bold`, `--ls-label`, uppercase OFF,
  `--color-text`; the `#` in `--color-text-muted`, `aria-hidden`). **`# intressen` is rendered only when there is
  ≥ 1 interest item.**
- Rows: `<button type="button" data-project-id aria-pressed>` full-width, `min-height: --hit-row`
  (`@media (pointer: coarse)` → `--hit-min`), padding `--space-2 --space-3`, `--fs-sm`, left-aligned title, year
  right-aligned in `--color-text` if present. States: hover/`hoveredId` → bg `--color-surface-hover`;
  `aria-pressed=true` → `--color-text-bright` + 2 px `--color-accent` inset bar on the left; focus →
  `--focus-ring` (offset −2 px inside the panel so it is not clipped).
- Footer row: `github ↗` link (`https://github.com/willevic2002`, sr-only `(öppnas i ny flik)`).
- Order = data order (curated), not room position.

### 5.2 View toggle (top-right)
- Fixed `top/right: --overlay-inset`. Segmented pill on `--overlay-bg`: `översikt` · `skrivbord` · `cv`.
  `role="group" aria-label="vy"`, each a `<button aria-pressed>`; height `--hit-row` / coarse `--hit-min`.
- Active segment: bg `--color-selection`, text `--color-text-bright` (13.17:1) + 1 px inner `--color-accent`
  ring at 40 % (not colour-only: `aria-pressed` + ring). Inactive: `--color-text` on `--overlay-bg` (≥ 9.51:1).
- översikt/skrivbord: camera tween (§2); closing an open card first. cv: opens the CV drawer (§5.6).
  Keyboard shortcuts: none (avoid conflicts) — Tab order is enough.

### 5.3 Project card
- **Docks right** on desktop: fixed `right: --overlay-inset`, `top: calc(--overlay-inset + 52px)` (below the
  toggle), width `--card-w`, `max-height: calc(100dvh - 120px)`, internal scroll. Enter: fade + 16 px slide
  from right, `--dur-base` `--ease-out`; none under reduced motion.
- Non-modal `aside` (D2): no focus trap, room stays interactive (orbiting around the focused object is fine).
- Contents in order: (1) prompt `$ cat projekt/<id>.md` (`--fs-sm`, `--color-text`); (2) `<h2 id="card-title"
  tabindex="-1">` title (`--fs-lg`, `--color-text-bright`); (3) meta: `[projekt]`/`[intresse]` tag in
  `--tag-proj`/`--tag-skill` + `· 2026` year; (4) summary (TODO rendered per v1 §4); (5) tech line
  `vhdl · fpga · python` (`--fs-sm`); (6) link `öppna på github ↗` + sr-only `(öppnas i ny flik)`, or
  `[privat] ingen publik länk` in `--color-text`; (7) close `×` top-right, `aria-label="stäng"`, 44×44, with
  `esc` hint in `--fs-xs` `--color-text` beside it on pointer:fine.
- Focus: opened from guide → focus `#card-title`. Opened from canvas → do NOT steal focus from the canvas
  context (screen readers get it via `aria-live="polite"` on a visually hidden "visar: <title>" line).
  Close (×, Esc anywhere, empty-space click) → focus the matching guide row; if the guide is hidden → the
  `visa guide` toggle. Selecting another item swaps content in place, focus stays on the title.

### 5.4 Bottom hint
Bottom-left `--overlay-inset` (desktop) / bottom-centre above the guide button (mobile). `--hint-bg` pill,
`--fs-sm`, `--color-text`, `aria-hidden`. Fades out after first drag or select (`--dur-base`), shown again after
reload. Copy §7.

### 5.5 States
| state | look | copy (sv) |
|---|---|---|
| loading (`data-room=loading`) | void + centred 64 px `--photon-ring` motif + status line below, `role=status`; guide + toggle already usable (cards open, camera ignored) | `laddar rummet…` |
| ready | canvas fades in over `--dur-slow` (instant under reduced motion), hint appears | — |
| no WebGL / import failed (`data-room=fallback`) | no fixed stage: page becomes a normal scrolling document — static 160 px ring motif + error line, guide becomes an in-flow list (max 640 px, centred), card renders inline under the list, **CV renders inline below** (not a drawer); view toggle hides `översikt`/`skrivbord`, keeps `cv` as an anchor link | `[error] webgl saknas — rummet kan inte visas. projekten finns i guiden.` |
| projects.json failed | guide shows error row, room renders without project objects (decor only) | `[error] kunde inte läsa projekten. försök ladda om sidan.` |
| 0 projects | guide shows empty line | `inga projekt än.` |
| cv.json failed | CV drawer shows v1 error line | `loggen kunde inte laddas — se github.com/willevic2002` |

### 5.6 CV presentation — decision: **drawer overlay** (not a section below)
Why: (1) the room is a fixed full-viewport stage whose canvas owns wheel/drag (zoom/orbit); a scroll section
below would fight it (wheel over the canvas never scrolls the page) and break the "room is the page" concept;
(2) the toggle treats cv as a third *view* — a drawer keeps översikt · skrivbord · cv symmetrical; (3) the room
stays visible, dimmed, as context; (4) the fallback still gets a plain readable document (§5.5) because without
WebGL there is no stage to overlay.
- `<section id="cv">` from the right, width `--cv-w`, full height, `--color-bg` (opaque — long reading, best
  contrast), 1 px `--edge-light-v` on its left edge, scrim `--scrim` over the room. Content = v1 CV log (spec.md
  §4) unchanged, max `--measure`, internal scroll, padding `--space-6`.
- Header row: prompt `victor@eh:~$ cat cv.log`, `<h2 id="cv-h" tabindex="-1">cv</h2>`, close `×` (44×44,
  `aria-label="stäng cv"`).
- Behaves as a **modal**: on open set `inert` on stage, guide, card, hint; focus `#cv-h`; pause the render loop.
  Close via ×, Esc, scrim click, or toggling `översikt`/`skrivbord` → remove `inert`, focus the `cv` toggle,
  restore previous view, `replaceState` hash removal. Enter: slide 24 px + fade `--dur-base`; none under
  reduced motion. `#cv` on load opens it directly (no animation).
- Mobile: full-screen (width 100 %, no radius), close button sticky at top.

### 5.7 Mobile (< 600 px, verified at 375 × 812)
- Stage stays full-viewport; portrait fov 46; overview fit rule handles the narrow aspect.
- Guide collapses to a **`guide` button** bottom-left (pill, `--hit-min` tall, `aria-expanded`,
  `aria-controls="guide-sheet"`). Opens a **bottom sheet**: full width, `max-height: 70dvh`, top radius
  `--radius-lg`, `--edge-light` top, grab bar (decorative), close `×` 44×44. Sheet is modal: `inert` on the rest,
  focus first row, Esc / × / scrim closes and returns focus to the `guide` button.
- Selecting an item closes the guide sheet and opens the **card as a bottom sheet** (`max-height: 55dvh` so the
  object stays visible above it; view offset per §2). Only one sheet at a time.
- View toggle stays top-right (≈ 220 px wide at `--fs-sm`, fits 375 px with the guide button below).
- Hint sits bottom-centre above the guide button, one line, shortened copy (§7); hidden while a sheet is open.
- Safe areas: bottom offsets use `max(--overlay-inset, env(safe-area-inset-bottom))`.
- 600–899 px: desktop layout with guide width 220 px and card `min(--card-w, 46vw)`.

### 5.8 Contrast (new pairs; worst case = panel alpha composited over a `#f5f5f5` scene pixel — `#222222`, `#292929`, `#313131` are those computed composites, not colours to use)
| fg | bg | ratio | use |
|---|---|---|---|
| `#c8c8c8` fg | `--overlay-bg` worst `#222222` / opaque `#141414` | 9.51 / 11.01 | guide rows, card body, toggle |
| `#f5f5f5` fg-bright | `#222222` / `#2a2a2a` | ≥ 13.17 | active row, active toggle segment, card title |
| `#f0f0f0` accent (focus ring, links) | `#222222` | 13.96 | focus ring + links on overlays |
| `#8aa5a5` cyan `[projekt]` | `#222222` | 6.07 | card tag |
| `#b4ad8c` yellow `[intresse]` | `#222222` | 7.04 | card tag |
| `#b09480` orange (TODO) / `#8b9aac` blue / `#a48da8` magenta | `#222222` | 5.60 / 5.54 / 5.27 | TODO, misc tags |
| `#b07c7c` red `[error]` | `#222222` | 4.56 | error lines on overlays (AA) |
| `#f5f5f5` | `--overlay-tip` worst `#292929` | 13.34 | hover label |
| `#c8c8c8` | `--hint-bg` worst `#313131` | 7.78 | bottom hint |
| `#6a6a6a` muted | `#222222` | 2.65 → **decorative only** (`#` prefixes, grab bar) | never text |
| CV drawer text | `#050505` opaque | per v1 table (≥ 5.84) | CV |

---

## 6. Accessibility checklist (build + review gate)
- Every room object is reachable via a guide `<button>`; canvas is `aria-hidden` + `tabindex=-1`.
- Tab order: skip link → guide toggle → guide rows → github link → view toggle → card (when open) → (CV when open,
  everything else `inert`).
- Esc priority: CV drawer → mobile sheet → card. One Esc closes one layer.
- Focus visible on every control (`--focus-ring`), never clipped by panel overflow.
- Reduced motion: no camera tweens (instant cut), no damping, no dust, no servo/LiDAR/disc rotation, no panel
  slides; hover lift instant. Read `matchMedia('(prefers-reduced-motion: reduce)')` live (listen for `change`).
- Pause rendering when `document.hidden`, when CV drawer is open, and render-on-demand when idle under reduced
  motion (nothing animates → render only on input/resize).
- Text never below `--fs-xs` (12 px) and only for meta; zoom to 200 % keeps panels usable (they scroll).
- `lang="sv"`; all copy lowercase per v1 voice.

## 7. Microcopy (sv)
| key | text |
|---|---|
| skip | `hoppa till innehåll` |
| guide toggle | `dölj guide` / `visa guide` |
| guide (mobile button) | `guide` |
| guide sections | `# projekt` · `# intressen` |
| guide footer | `github ↗` |
| view toggle | `översikt` · `skrivbord` · `cv` (group label `vy`) |
| hint desktop | `dra för att titta runt · klicka på ett föremål` |
| hint touch | `dra för att titta runt · tryck på ett föremål` |
| hint mobile short | `dra · tryck på ett föremål` |
| hover label | `<titel> · projekt` / `<titel> · intresse` |
| card prompt | `$ cat projekt/<id>.md` |
| card tags | `[projekt]` · `[intresse]` |
| card link | `öppna på github ↗` + sr-only `(öppnas i ny flik)` |
| card private | `[privat] ingen publik länk` |
| card live region | `visar: <titel>` |
| close | `stäng` (aria-label) · `stäng cv` · `esc` hint |
| cv header | `victor@eh:~$ cat cv.log` · `cv` |
| loading | `laddar rummet…` |
| no webgl | `[error] webgl saknas — rummet kan inte visas. projekten finns i guiden.` |
| projects error | `[error] kunde inte läsa projekten. försök ladda om sidan.` |
| empty | `inga projekt än.` |
| cv error | `loggen kunde inte laddas — se github.com/willevic2002` |
