# Brief — personal portfolio / CV site (shared context for every agent)

## What
A personal GitHub Pages site for Victor (GitHub: `willevic2002`), Swedish engineering student at
Jönköping University (JU). Two parts:
1. **CV** — styled like a log / terminal timeline ("loggar som ett CV"): about, education, experience,
   skills, contact. Event Horizon theme.
2. **3D room** — an interactive Three.js recreation of Victor's real desk setup (reference photo:
   `design/setup-reference.jpeg` — open it with the Read tool). A **wall shelf** in the room holds his
   projects as distinct 3D items; hovering/clicking an item opens a panel with the project's info + link.

## Hard constraints
- **Static site, no build step.** Plain HTML/CSS/ES modules. Three.js loaded via `<script type="importmap">`
  from `https://cdn.jsdelivr.net/npm/three@0.170.0/...` (pinned exact version, also addons for OrbitControls).
  No npm runtime deps. Must work when served from a sub-path (`https://willevic2002.github.io/<repo>/`) →
  all asset paths relative.
- **Content is data:** `data/cv.json` and `data/projects.json`. Adding a project = adding one JSON object.
  Items on the shelf are generated from `projects.json` (item shape chosen by a `kind` field, e.g.
  `chip`, `board`, `robot`, `book`, `box`, fallback `box`). Shelf must handle 1–12 items (add a second
  shelf row if needed).
- **No fabricated CV facts.** Only what's in `data/cv.json`; unknown fields are clearly marked `TODO`
  placeholders for Victor to fill.
- Accessibility: the CV must be fully readable without WebGL/JS-3D; the 3D room needs a non-WebGL fallback
  (list of projects) and keyboard access to project items (a visible list/buttons mirroring the shelf).
  Respect `prefers-reduced-motion`.
- Performance: procedural low-poly geometry only (no downloaded models/textures), target smooth on a laptop
  iGPU, `devicePixelRatio` capped at 2, render loop paused when the tab is hidden.
- Mobile: works at 375px wide (room canvas shrinks; CV stacks).
- Swedish UI text by default (Victor is Swedish); English fine for code.

## Event Horizon theme (Victor's own desktop theme — black-hole aesthetic)
Palette (from his Omarchy theme `colors.toml`):
background `#050505`, darker `#000000`, lighter `#141414`, selection `#2a2a2a`, muted `#6a6a6a`,
foreground `#c8c8c8`, light fg `#e0e0e0`, bright fg `#f5f5f5`, accent `#f0f0f0`.
Muted accents: red `#b07c7c`, yellow `#b4ad8c`, orange `#b09480`, green `#8ea889`, cyan `#8aa5a5`,
blue `#8b9aac`, magenta `#a48da8`.
Motifs: void-black, a white photon ring / thin white gradient light-edge, accretion-disk glow, lowercase
labels, monochrome with very sparse muted color. Monospace type.

## The room (from the photo)
Dark navy/slate painted back wall, white side wall, light wood-look floor. White sit/stand desk
(IKEA Bekant-like) with light wood top, large dark desk mat, keyboard. Curved ultrawide monitor (black),
a second dark monitor/panel with a red edge behind it on the right, black PC case with glass side and
cyan/blue internal glow, small speaker. White 5-drawer unit (IKEA Alex-like) under the right end of the
desk. White ergonomic mesh office chair with headrest. Small glass/edison lamp on the left of the desk.
Window on the right wall with sheer white curtains, white radiator below, windowsill with a light-blue
scooter (Vespa) model and small items. The shelf with projects is new — mount it on the dark back wall
above the desk.

## Projects (initial `projects.json`)
- `ultrasonic-array` (VHDL) — self-built 3D ultrasonic sensor: 40 kHz transmitter + 16 PDM MEMS mics,
  chirp + matched filter + beamforming on FPGA. https://github.com/willevic2002/ultrasonic-array — kind `board`
- `Karriarum26` (HTML) — checklist + map for the Karriärum 2026 career fair, filter per programme, PWA.
  https://github.com/willevic2002/Karriarum26 — kind `book`
- `enchip` (C) — https://github.com/willevic2002/enchip — kind `chip` (description TODO)
- `Elektriska-gr` (C) — https://github.com/willevic2002/Elektriska-gr — kind `chip` (description TODO)
- Autonomous robot mower (school team project, SEPM 2026): LiDAR + ROS2 + RL, iOS app, backend —
  no public link — kind `robot`

## Repo layout (contract-level; architect may refine)
```
index.html          CV + room page shell
css/style.css       theme + CV styles
js/room.js          Three.js scene (room, furniture, shelf, items, interaction)
js/cv.js            renders data/cv.json + project list fallback
data/cv.json  data/projects.json
tests/              smoke tests
README.md           how to add a project / deploy to Pages
```
