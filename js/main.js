import { renderCV, renderProjectList, renderProjectPanel } from './cv.js';

const MAX_ITEMS = 15;
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 599px)');

const panel = $('project-panel');
const cv = $('cv');
const guide = $('guide');
const guideToggle = $('guide-toggle');
const lists = [$('project-list'), $('interest-list')];
// While a mobile sheet is open everything behind it is inert (the guide itself is not).
const SHEET_BEHIND = ['stage', 'views', 'room-hint', 'project-panel'];

let projects = [];
let selectedId = null;
let trigger = null; // guide button that opened the card
let room = null;
let view = 'overview';
let cvOpen = false;
let guideOpen = true;

export function hasWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

const inline = () => root.dataset.room === 'fallback';
const byId = (id) => projects.find((p) => p.id === id) ?? null;
const rows = () => lists.flatMap((l) => [...l.querySelectorAll('button')]);
const buttonFor = (id) => rows().find((b) => b.dataset.projectId === id) ?? null;
const visible = (el) => !!el && el.getClientRects().length > 0;

async function loadJSON(path) {
  const res = await fetch(new URL(path, import.meta.url));
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/* ---------- guide (desktop panel / mobile bottom sheet) ---------- */

function setGuide(open) {
  guideOpen = open || inline();
  guide.hidden = !guideOpen;
  guideToggle.setAttribute('aria-expanded', String(guideOpen));
  guideToggle.querySelector('.t-desk').textContent = guideOpen ? 'dölj guide' : 'visa guide';
  const sheet = guideOpen && mobile.matches && !inline();
  $('scrim').hidden = !sheet;
  for (const id of SHEET_BEHIND) $(id).toggleAttribute('inert', sheet);
  if (!mobile.matches && !inline()) { try { sessionStorage.setItem('guide', open ? '1' : '0'); } catch { /* private mode */ } }
}

function resetGuide() {
  let stored = null;
  try { stored = sessionStorage.getItem('guide'); } catch { /* private mode */ }
  setGuide(mobile.matches ? false : stored !== '0');
}

function closeSheet({ focus = true } = {}) {
  setGuide(false);
  if (focus) guideToggle.focus();
}

guideToggle.addEventListener('click', () => {
  setGuide(!guideOpen);
  if (guideOpen && mobile.matches) rows()[0]?.focus();
});
$('guide-close').addEventListener('click', () => closeSheet());
$('scrim').addEventListener('click', () => closeSheet());
mobile.addEventListener('change', resetGuide);

/* ---------- selection / card ---------- */

function setSelected(id, { focusPanel = false, source = 'list', restoreFocus = true } = {}) {
  if (id !== null && !byId(id)) id = null;
  const prev = selectedId;
  selectedId = id;
  for (const b of rows()) b.setAttribute('aria-pressed', String(b.dataset.projectId === id));
  renderProjectPanel(panel, byId(id));
  history.replaceState(null, '', id ? `#p=${encodeURIComponent(id)}` : location.pathname + location.search);
  if (source !== 'room') room?.select(id);
  if (id) $('room-hint').classList.add('gone');
  if (id && focusPanel) $('project-title')?.focus();
  if (!id && prev && restoreFocus) {
    const row = trigger?.dataset.projectId === prev ? trigger : buttonFor(prev);
    (visible(row) ? row : guideToggle).focus();
  }
}

function pick(id, btn) {
  trigger = btn;
  if (mobile.matches && !inline()) setGuide(false); // one sheet at a time
  setSelected(id, { focusPanel: true });
}

panel.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) setSelected(null); });

/* ---------- views ---------- */

function setView(next) {
  view = next;
  if (!cvOpen) root.dataset.view = view;
  for (const b of $('view-toggle').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
  room?.setView?.(view);
}

$('view-toggle').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]');
  if (!b) return;
  if (selectedId) setSelected(null, { restoreFocus: false });
  setView(b.dataset.view);
});

/* ---------- cv drawer (modal; inline document when there is no WebGL) ---------- */

function openCV({ initial = false } = {}) {
  if (cvOpen || inline()) return;
  cvOpen = true;
  cv.classList.toggle('no-anim', initial);
  cv.hidden = false;
  $('cv-scrim').hidden = false;
  $('app').inert = true;
  root.dataset.view = 'cv';
  if (location.hash !== '#cv') history.replaceState(null, '', '#cv');
  $('cv-h').focus();
}

function closeCV({ restoreFocus = true, clearHash = true } = {}) {
  if (!cvOpen) return;
  cvOpen = false;
  cv.hidden = true;
  $('cv-scrim').hidden = true;
  $('app').inert = false;
  root.dataset.view = view;
  if (clearHash && location.hash === '#cv') history.replaceState(null, '', location.pathname + location.search);
  if (restoreFocus) $('cv-link').focus();
}

$('cv-close').addEventListener('click', () => closeCV());
$('cv-scrim').addEventListener('click', () => closeCV());

// inert on #app already confines focus; this wraps Tab so it cycles inside the drawer instead of leaving the page.
cv.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || !cvOpen) return;
  const f = [...cv.querySelectorAll('a[href], button:not([disabled])')].filter(visible);
  if (!f.length) return;
  const [first, last] = [f[0], f[f.length - 1]];
  const at = document.activeElement;
  if (e.shiftKey && (at === first || at === $('cv-h'))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
});

// Esc closes one layer: cv drawer, then mobile sheet, then card.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (cvOpen) closeCV();
  else if (guideOpen && mobile.matches && !inline()) closeSheet();
  else if (selectedId) setSelected(null);
});

/* ---------- room ---------- */

// Hover only toggles a class: re-rendering the aria-live card would spam screen readers and drop focus.
function onHover(id) {
  for (const b of document.querySelectorAll('.glist .is-hover')) b.classList.remove('is-hover');
  if (id) buttonFor(id)?.classList.add('is-hover');
}
const hoverRoom = (id) => room?.hover?.(id);

function setRoomState(state, note) {
  root.dataset.room = state;
  $('room-status').hidden = state !== 'loading';
  $('room-hint').hidden = state !== 'ready';
  $('room-note').hidden = state !== 'fallback';
  $('view-toggle').hidden = state !== 'ready';
  if (note) $('room-note').textContent = `[error] ${note}`;
  if (state === 'fallback') {
    closeCV({ restoreFocus: false });
    $('cv-scrim').hidden = true;
    cv.hidden = false;
    cv.removeAttribute('role');
    cv.removeAttribute('aria-modal');
    $('app').inert = false;
    setGuide(true);
  }
}

async function mountRoomSafely() {
  if (inline()) return;
  try {
    const { mountRoom } = await import('./room.js');
    room = await mountRoom($('room-canvas'), projects.slice(0, MAX_ITEMS), {
      onSelect: (id) => { trigger = buttonFor(id); setSelected(id, { source: 'room' }); },
      onHover,
      reducedMotion,
    });
    setRoomState('ready');
    $('room-canvas').addEventListener('pointerdown', () => $('room-hint').classList.add('gone'), { once: true });
    if (view !== 'overview') room.setView?.(view);
    if (selectedId) room.select(selectedId);
  } catch {
    room = null;
    setRoomState('fallback', '3d-rummet kunde inte laddas — projekten finns i guiden.');
  }
}

/* ---------- data ---------- */

async function initCV() {
  try {
    renderCV($('cv-body'), await loadJSON('../data/cv.json'));
    root.dataset.cv = 'ready';
  } catch {
    const p = document.createElement('p');
    p.className = 'notice';
    p.textContent = 'loggen kunde inte laddas — se github.com/willevic2002';
    $('cv-body').replaceChildren(p);
    root.dataset.cv = 'error';
  }
}

function renderGuide(items) {
  const isInterest = (p) => p.category === 'intresse';
  const mine = items.filter(isInterest);
  renderProjectList($('project-list'), items.filter((p) => !isInterest(p)), pick, hoverRoom);
  renderProjectList($('interest-list'), mine, pick, hoverRoom);
  $('interest-h').hidden = $('interest-list').hidden = !mine.length;
}

async function initProjects() {
  try {
    const data = await loadJSON('../data/projects.json');
    if (!Array.isArray(data)) throw new Error('projects.json is not an array');
    const seen = new Set();
    projects = data.filter((p) => {
      const ok = typeof p?.id === 'string' && /^[a-z0-9-]+$/.test(p.id) && !seen.has(p.id);
      if (ok) seen.add(p.id);
      return ok;
    });
    // Every valid item goes in the guide; only the first MAX_ITEMS get a place in the room (mountRoom).
    if (projects.length > MAX_ITEMS) console.warn(`projects: ${projects.length} > ${MAX_ITEMS}`);
    renderGuide(projects);
  } catch {
    projects = [];
    const li = document.createElement('li');
    li.className = 'notice';
    li.textContent = '[error] kunde inte läsa projekten. försök ladda om sidan.';
    $('project-list').replaceChildren(li);
  }
  window.__room = { items: Math.min(projects.length, MAX_ITEMS) };
}

/* ---------- deep links: #p=<id>, #cv, #skrivbord ---------- */

function fromHash() {
  const h = location.hash;
  if (h === '#cv') return openCV();
  if (cvOpen) closeCV({ restoreFocus: false, clearHash: false });
  if (h === '#skrivbord') return setView('desk');
  const m = h.match(/^#p=(.+)$/);
  let id = null;
  try { id = m && decodeURIComponent(m[1]); } catch { return; }
  if (!id || id === selectedId || !byId(id)) return;
  setSelected(id);
  if (inline()) panel.scrollIntoView({ block: 'nearest' });
}
addEventListener('hashchange', fromHash);

/* ---------- boot ---------- */

setRoomState(hasWebGL2() ? 'loading' : 'fallback', 'webgl saknas — rummet kan inte visas. projekten finns i guiden.');
root.dataset.view = view;
resetGuide();
await Promise.all([initCV(), initProjects()]);
if (location.hash === '#cv') openCV({ initial: true }); else fromHash();
await mountRoomSafely();
