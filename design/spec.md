# Design spec — Event Horizon portfolio

Build to `design/tokens.css` (copy or `@import` it first in `css/style.css`). Reference all values via
`var(--…)`; no raw hex in CSS. 3D hex values (section 7) live in `js/room.js` only.

## 1. Page IA (single page, `index.html`)

```
[skip link] hoppa till innehåll
header    — sticky top bar: "victor ~/" + anchors: cv · rummet · kontakt
#hero     — name, role, photon-ring motif
#cv       — log timeline (about, edu, work, proj, skills)
#rummet   — 3D room canvas + overlay hints + project list (always rendered) + detail panel
#kontakt  — contact log lines (from cv.json)
footer    — "eof · <year>" + github link
```

Landmarks: `<header>`, `<nav aria-label="sidor">`, `<main id="innehall">`, `<footer>`. One `<h1>` (name).
Sections are `<section aria-labelledby>` with `<h2>`. `<html lang="sv">`.

## 2. Layout

| | desktop (>= 900px) | mobile (375px) |
|---|---|---|
| content width | `--content-max` centered, `--gutter` sides | full width, `--gutter` (16px) |
| hero | ~70vh, text left (cols 1–7), ring right | ~56vh, ring behind text at 40% opacity, centered top |
| cv log | 3 cols: `timestamp 14ch` · `tag 8ch` · `body 1fr` | timestamp+tag on one line, body below (stack) |
| room | canvas 16:9, max-height 72vh; list in a column right (280px) | canvas 4:5 (375×469), list below canvas |
| panel | right drawer 420px over canvas, scrim | bottom sheet, max 85vh, scrollable |

Breakpoints: `600px`, `900px`. Body `--fs-base`, `--lh-base`, max line length `--measure`.

## 3. Hero

- Prompt line above name: `victor@eh:~$ whoami` (`--fs-sm`, `--color-text`).
- `<h1>` name: `--fs-hero`, `--fw-bold`, `--color-text-bright`, lowercase, `--lh-tight`.
- Role: `ingenjörsstudent · jönköping university` (`--fs-xl`, `--color-text-strong`). Pull from cv.json if present.
- Blinking caret `▍` after role: 1s step blink; **static** when `--motion-ok: 0`.
- Motif: a square `div` (`min(42vw, 420px)`, mobile `260px`) with `--accretion` layered under `--photon-ring`,
  `aria-hidden="true"`. Optional: slow rotate of a conic highlight on the ring over `--dur-ring`; none under
  reduced motion.
- `--edge-light` 1px rule under the hero (full width, height 1px).
- CTA links (text buttons): `[ läs loggen ]` → #cv, `[ gå in i rummet ]` → #rummet.

## 4. CV as log timeline

Each section opens with a comment header: `# utbildning` (`<h2>`, `--fs-lg`, `--color-text-strong`,
prefixed `#` in `--color-text-muted`, `aria-hidden` on the `#`).

Entries are an `<ol class="log">` of `<li>`:

```
2023-08 → nu     [edu]   jönköping university — civilingenjör …
                         läser: …  (body, --color-text)
2026-01 → 2026-06 [proj] autonom robotgräsklippare — lidar · ros2 · rl
```

- **timestamp col**: `<time datetime>`; format `yyyy-mm` or `yyyy-mm → nu`; `--fs-sm`, `--color-text`,
  tabular. Missing date → `????-??` with tag `[todo]`.
- **tag**: `[edu]` `--tag-edu`, `[work]` `--tag-work`, `[proj]` `--tag-proj`, `[skill]` `--tag-skill`,
  `[mail]` / `[link]` `--tag-contact`, `[todo]` `--tag-todo`. Brackets included in the text; lowercase;
  `--fw-medium`. Color is never the only signal (the word carries meaning).
- **title**: `--fs-md`, `--color-text-strong`; org after ` — `.
- **details**: `--color-text`, optional bullet lines prefixed `  - `.
- Left rail: 1px `--color-border` line through the timestamp column; current item (`→ nu`) gets a 5px
  `--color-accent` dot with `--glow-sm`.
- Row hover (desktop only): bg `--color-surface`, `--dur-fast`. No hover-only info.
- **TODO values**: render literally as `TODO` in `--tag-todo` with a dashed `--color-border-strong`
  underline, so Victor sees them. Never invent content.
- Skills: one log line per group: `[skill] språk: c · vhdl · python · …`.
- About: rendered as `cat om-mig.txt` prompt line + paragraph.
- Entry reveal: fade/translateY 8px over `--dur-slow` once on scroll-in; skip under reduced motion. Content
  must be present in DOM without JS-3D (cv.js only; if cv.js fails, show `<noscript>`/static fallback text
  `loggen kunde inte laddas — se github.com/willevic2002`).

## 5. 3D room section (`#rummet`)

Heading `# rummet` + one-line intro: `mitt skrivbord, återskapat. hyllan ovanför bordet är mina projekt.`

### Canvas
- Wrapper `position: relative`, bg `--color-bg-deep`, `--radius-md`, border `--border-hair`, top edge
  `--edge-light` 1px.
- Size per section 2. DPR `min(devicePixelRatio, 2)`. Resize via ResizeObserver. Pause loop when hidden
  or when canvas off-screen (IntersectionObserver).
- Canvas `<canvas aria-hidden="true" tabindex="-1">` — keyboard users use the list (section 6); the list is
  the accessible equivalent, the canvas is enhancement.
- Camera: start framed on desk + shelf from roughly the photo's viewpoint (behind chair, slightly left).
  OrbitControls: limit polar 55°–95°, azimuth ±50°, zoom 0.7–1.4×, no pan, damping on (off under reduced
  motion; also disable autoRotate).

### Overlay hints (bottom-left, `--fs-sm`, `--color-text` on `rgba(0,0,0,.8)` pill)
- desktop: `dra för att titta runt · klicka på en hylla-sak`
- touch: `dra för att titta runt · tryck på en hylla-sak`
- Fade out after first interaction (`--dur-base`); `aria-hidden` (list is the accessible path).
- Hover tooltip (pointer only): item title near cursor, `--color-surface` bg, `--glow-sm`.

### States
| state | look | copy |
|---|---|---|
| loading | canvas area shows centered ring (`--photon-ring`, 64px) + log line, `aria-live="polite"` | `laddar rummet…` |
| loaded | hints visible | — |
| no WebGL / three.js import failed | hide canvas, show static panel `--color-surface` with ring motif; list stays | `[error] webgl saknas — rummet kan inte visas. projekten finns i listan.` |
| projects.json failed | shelf empty, list replaced | `[error] kunde inte läsa projekten. försök ladda om sidan.` |
| 0 projects | empty shelf rendered; list shows | `hyllan är tom — inga projekt än.` |
| reduced motion | no damping/autorotate/fly-to tweens; camera cuts | — |

## 6. Project list (mirrors the shelf) + detail panel

### List
- `<h3>projekt på hyllan</h3>` + `<ul>`; each item a `<button type="button" aria-haspopup="dialog"
  aria-controls="projekt-panel">` in shelf order (left→right, top row first).
- Row: `[kind]` tag in `--tag-proj` + title + language `· vhdl` in `--color-text`. min-height `--hit-min`.
- Hover/focus on a row highlights the same 3D item (hovered look, section 7) and vice versa — one shared
  `hoveredId` state.

### Detail panel (`<div role="dialog" aria-modal="true" aria-labelledby="projekt-titel" id="projekt-panel">`)
Opens on click of shelf item or list button. Contents, in order:
1. prompt line `$ cat projekt/<id>.md` (`--fs-sm`)
2. `<h3 id="projekt-titel">` title (`--fs-lg`, `--color-text-bright`)
3. meta row: `[språk] vhdl` · `[typ] board`
4. description paragraph (or `TODO` styled per section 4)
5. tags/stack line if present
6. link: `öppna på github ↗` (`target="_blank" rel="noopener"`, with visually hidden `(öppnas i ny flik)`).
   No link → `[privat] ingen publik länk (skolprojekt)` in `--color-text`.
7. close button top-right: `×` with `aria-label="stäng"`, 44×44.

Look: `--color-surface`, `--shadow-panel`, `--radius-lg` (sheet: top corners only), 1px `--edge-light-v`
on the leading edge (drawer) / `--edge-light` on top (sheet). Enter: slide 16px + fade `--dur-base`
`--ease-out`; none under reduced motion.

Focus handling:
- On open: focus the `<h3>` (`tabindex="-1"`) so the title is announced; trap Tab inside the panel.
- Close via close button, `Esc`, or scrim click. On close, return focus to the invoking list button (if
  opened from canvas, focus the matching list button).
- While open, the room camera eases to the selected item (cut under reduced motion); `inert` on rest of page.
- Selecting another item while open swaps content; keep focus on title.

## 7. 3D art direction (for `js/room.js`)

Recognisable as the photo, pushed toward Event Horizon: desaturated ~35%, darker overall, single cool key
light. Scene background `#000000` (void beyond the room). These hex values are 3D-only (lit materials,
not CSS) — they are darkened/desaturated mixes of the palette.

| object | color | material notes |
|---|---|---|
| back wall (navy/slate) | `#1a2026` (blue `#8b9aac` × ~0.2) | rough 0.95, no metal |
| side wall (white) | `#b8b8b8` (≈ fg dimmed) | rough 0.9 |
| floor (light wood) | `#6e6458` (orange `#b09480` desat, dark) | rough 0.8; thin plank lines via geometry seams optional |
| desk frame, drawer unit, radiator, chair | `#c8c8c8` | rough 0.6 |
| desktop (wood) | `#9a8a76` | rough 0.7 |
| desk mat | `#141414` | rough 1 |
| monitors, PC case, keyboard, speaker | `#0a0a0a` | rough 0.4, metal 0.2 |
| monitor screens | `#050505` + emissive `#141414` 0.4 | faint glow |
| second panel red edge | `#b07c7c` | thin strip, emissive 0.3 |
| PC internal glow | emissive `#8aa5a5`, intensity 1.2 | + PointLight `#8aa5a5` 0.6, distance 0.8 m |
| lamp bulb | emissive `#b4ad8c` 0.8 | + small PointLight `#b4ad8c` 0.3 |
| window | emissive `#e0e0e0` 0.5 | curtains `#e0e0e0`, opacity 0.6 |
| vespa model | `#8b9aac` | low-poly body + 2 discs, on sill |
| shelf plank (new, back wall above desk) | `#c8c8c8` | 1–2 rows; second row when > 6 items |

Lights: Hemisphere (`#e0e0e0` / `#000000`, 0.35), Directional key from window side (`#f0f0f0`, 0.9),
plus the two point lights above. Optional thin white line light along the shelf front edge
(a 1-px-high emissive `#f0f0f0` strip) — the "light edge" motif in 3D.

Shelf items (from `kind`): `board` green-ish PCB `#3a4a38` + `#c8c8c8` chips; `chip` `#141414` body,
`#b4ad8c` pins; `robot` `#2a2a2a` deck + `#8ea889` lidar puck; `book` cover `#8b9aac`/`#a48da8`
alternating, pages `#e0e0e0`; `box` fallback `#2a2a2a`. Space evenly, centered; items ≤ 0.18 m tall.

Item states:
- **idle**: as above, emissive 0.
- **hover / list focus**: white rim light — emissive `#f0f0f0` at 0.15 + a back-face-scaled (1.06×)
  outline mesh `#f5f5f5`, `MeshBasicMaterial` opacity 0.5; item lifts 1 cm (`--dur-fast` equivalent 150 ms;
  instant under reduced motion). Cursor `pointer`.
- **selected**: photon-ring halo — a thin `RingGeometry` (inner 0.9, outer 1.0 of item radius) in
  `#f5f5f5`, additive blending, behind the item facing camera, plus soft larger ring opacity 0.15
  (accretion falloff). Optional slow 12 s rotation of the halo; static under reduced motion. Other items
  dim to 70% brightness.

## 8. Focus, interaction, a11y

- Focus ring everywhere: `outline: var(--focus-ring); outline-offset: var(--focus-offset);` on
  `:focus-visible`. Never `outline: none` without replacement. On `--color-surface` the ring is 16.9:1.
- Hit targets >= 44×44 (`--hit-min`) for buttons, nav links, close.
- Links: `--color-accent`, underline 1px offset 3px; hover adds `--glow-sm` text-shadow-free underline
  thickening (no color-only change).
- Skip link visible on focus, top-left, `--color-surface` + `--glow-md`.
- `::selection { background: var(--color-selection); color: var(--color-text-bright); }` (13.17:1).
- Keyboard: Tab order header → hero CTAs → cv (no stops except links) → project list → panel → footer.
- All motion gated by `prefers-reduced-motion` (tokens zero durations; JS checks `--motion-ok` or
  `matchMedia`).

### Contrast (WCAG 2.x, computed)
| fg | bg | ratio | use |
|---|---|---|---|
| `#f5f5f5` | `#050505` | 18.69 | name, panel title |
| `#e0e0e0` | `#050505` | 15.44 | headings |
| `#c8c8c8` | `#050505` | 12.18 | body, timestamps |
| `#c8c8c8` | `#141414` | 11.01 | panel/list body |
| `#f0f0f0` (accent) | `#050505` / `#141414` | 17.88 / 16.17 | links, focus |
| `#f5f5f5` | `#2a2a2a` | 13.17 | selection, hovered row |
| `#8b9aac` edu | `#050505` / `#141414` | 7.10 / 6.42 | tag |
| `#8ea889` work | `#050505` / `#141414` | 7.87 / 7.12 | tag |
| `#8aa5a5` proj | `#050505` / `#141414` | 7.77 / 7.02 | tag |
| `#b4ad8c` skill | `#050505` / `#141414` | 9.02 / 8.16 | tag |
| `#a48da8` contact | `#050505` / `#141414` | 6.75 / 6.10 | tag |
| `#b09480` todo | `#050505` / `#141414` | 7.18 / 6.49 | tag |
| `#b07c7c` error | `#050505` / `#141414` | 5.84 / 5.28 | error lines |
| `#6a6a6a` muted | `#050505` / `#141414` | 3.77 / 3.41 | **non-text / ≥24px only** (borders, `#` prefix) — fails AA for body text |
| `#c8c8c8` | `rgba(0,0,0,.8)` pill over canvas | ≥ 9.16 (worst case: over lit side wall `#b8b8b8`; at 0.6 it drops to 5.30) | overlay hint (pill bg 0.8, not `--scrim`) |

## 9. Microcopy (sv)

| key | text |
|---|---|
| skip | `hoppa till innehåll` |
| nav | `cv` · `rummet` · `kontakt` |
| hero prompt | `victor@eh:~$ whoami` |
| hero cta | `[ läs loggen ]` · `[ gå in i rummet ]` |
| cv sections | `# om mig` · `# utbildning` · `# erfarenhet` · `# projekt` · `# kunskaper` · `# kontakt` |
| current | `nu` |
| todo | `TODO` |
| cv error | `loggen kunde inte laddas — se github.com/willevic2002` |
| room intro | `mitt skrivbord, återskapat. hyllan ovanför bordet är mina projekt.` |
| hint desktop | `dra för att titta runt · klicka på en hylla-sak` |
| hint touch | `dra för att titta runt · tryck på en hylla-sak` |
| loading | `laddar rummet…` |
| no webgl | `[error] webgl saknas — rummet kan inte visas. projekten finns i listan.` |
| projects error | `[error] kunde inte läsa projekten. försök ladda om sidan.` |
| empty | `hyllan är tom — inga projekt än.` |
| list heading | `projekt på hyllan` |
| panel meta | `[språk]` · `[typ]` |
| panel link | `öppna på github ↗` + sr-only `(öppnas i ny flik)` |
| panel private | `[privat] ingen publik länk (skolprojekt)` |
| close | `stäng` (aria-label), `esc` hint in `--fs-xs` |
| footer | `eof · 2026` |
