# Brief v2 — room-first redesign (shared context for every agent)

v1 is live at https://willevic2002.github.io/portfolio/ (read docs/BRIEF.md, docs/architecture.md, docs/requirements.md
for what exists; tests in tests/ are green). v2 changes the CONCEPT, keeps the stack and constraints.

## What Victor wants (his words: "tänkte mer såhär")
Style reference: `design/style-reference.png` (Read it) — a portfolio by another student: the 3D room IS the landing
page, full-viewport; a stylised, cosy, low-poly room seen from a 3/4 elevated angle (cut-away corner room: floor +
two walls), lots of small objects, each object = a project or an interest; warm practical lights (string lights,
LED strips under shelves, lamp), a rug, plants; a left "guide" panel listing PROJECTS and INTERESTS (click a name →
camera focuses that object + opens its card); top-right view toggle (Standard / Desk); bottom hint
"drag to look around · click an object".
**Take the concept and quality bar, NOT the look:** do not copy that site's purple/orange palette, its specific
objects or layout. v2 must be Victor's own: the Event Horizon theme (docs/BRIEF.md palette: void black, white
photon-ring light edges, monochrome with sparse muted accents) and Victor's real desk setup (design/setup-reference.jpeg:
navy wall, white sit/stand desk with wood top, curved ultrawide, red-edged second panel, black PC with cyan glow,
white 5-drawer unit, white mesh chair, window with sheer curtains + radiator + light-blue Vespa model on the sill).
Event-Horizon twist ideas (designer decides): the rug is a black disc with a white photon ring; LED strips are
cold-white light edges; window shows a starfield / a small black hole with accretion glow instead of daylight;
ambient floating dust motes (off under reduced motion).

## Content
- CV is now real: data/cv.json (filled from Victor's PDF CV; phone number deliberately NOT published).
- The CV stays on the site but is no longer the landing: reachable via a "cv" button/toggle (overlay/drawer or a
  section below the room — designer/architect decide) + `#cv` deep link, still log/terminal style, still readable
  with no WebGL/JS-3D.
- Items: data/projects.json becomes the list of room objects with `category: "projekt" | "intresse"`.
  Interests: none provided yet → category supported, guide shows the "intressen" header only when non-empty.
- Projects (initial): ultrasonic-array (FPGA PCB), robot mower (Husqvarna LiDAR/ROS2/RL school team project),
  GrillMonitor (ESP32-C6 WiFi grill thermometer, own KiCad PCB, ESP-IDF, Flutter app, MQTT — private repo, no url),
  STM32 labs 2024 (radar w/ HC-SR04 + servo, traffic light, electronic dice, digital clock), Karriarum26 (PWA),
  enchip (C, TODO summary), Elektriska-gr (C, TODO summary). Each gets a distinct, recognisable procedural object
  placed somewhere sensible in the room (desk, shelves, floor, windowsill), not all on one shelf.

## Keep (hard constraints from v1)
Static, no build step, three@0.170.0 via importmap (CSP hash must be recomputed if the importmap changes),
relative paths (sub-path /portfolio/), procedural geometry only (no model/texture downloads), WebGL2 check +
non-WebGL fallback (guide list + CV fully usable), keyboard access (guide entries are buttons; Esc closes card),
prefers-reduced-motion (no motion, no camera tweens), DPR ≤ 2, pause when hidden, 375px mobile works (guide
collapses to a "guide" button / bottom sheet), Swedish UI, textContent only, https-only links, zero console output,
tests/run.sh must stay green (update tests for the new structure, don't delete coverage).
Performance: target 60 fps on a laptop iGPU — use instancing/merged geometry for repeated parts (string-light
bulbs, dust), no shadows from more than one light (or baked-looking fake shadows), cap point lights (~6).
