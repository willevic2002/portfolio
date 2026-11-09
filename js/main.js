import { renderCV, renderProjectList, renderProjectPanel } from './cv.js';

const MAX_SHELF = 12;
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const list = $('project-list');
const panel = $('project-panel');
let projects = [];
let selectedId = null;
let trigger = null; // list button that opened the panel
let room = null;

export function hasWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

const byId = (id) => projects.find((p) => p.id === id) ?? null;
const buttonFor = (id) => list.querySelector(`[data-project-id="${CSS.escape(id ?? '')}"]`);

async function loadJSON(path) {
  const res = await fetch(new URL(path, import.meta.url));
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function showPanel(id) {
  renderProjectPanel(panel, byId(id));
}

function setSelected(id, { focusPanel = false, source = 'list' } = {}) {
  if (id !== null && !byId(id)) id = null;
  const prev = selectedId;
  selectedId = id;
  for (const b of list.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.projectId === id));
  showPanel(id);
  history.replaceState(null, '', id ? `#p=${encodeURIComponent(id)}` : location.pathname + location.search);
  if (source !== 'room') room?.select(id);
  if (id && focusPanel) $('project-title')?.focus();
  if (!id && prev) (trigger?.isConnected && trigger.dataset.projectId === prev ? trigger : buttonFor(prev))?.focus();
}

function pick(id, btn) {
  trigger = btn;
  setSelected(id, { focusPanel: true });
}

panel.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) setSelected(null); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && selectedId) setSelected(null); });

// Hover only toggles a class: re-rendering the aria-live panel would spam screen readers and drop focus.
function onHover(id) {
  for (const b of list.querySelectorAll('.is-hover')) b.classList.remove('is-hover');
  if (id) buttonFor(id)?.classList.add('is-hover');
}
const hoverRoom = (id) => room?.hover?.(id);

function setRoomState(state, note) {
  root.dataset.room = state;
  $('room-status').hidden = state !== 'loading';
  $('room-hint').hidden = state !== 'ready';
  $('room-note').hidden = state !== 'fallback';
  if (note) $('room-note').textContent = `[error] ${note}`;
}

async function mountRoomSafely() {
  if (!hasWebGL2()) return setRoomState('fallback', 'webgl saknas — rummet kan inte visas. projekten finns i listan.');
  try {
    const { mountRoom } = await import('./room.js');
    room = await mountRoom($('room-canvas'), projects.slice(0, MAX_SHELF), {
      onSelect: (id) => { trigger = buttonFor(id); setSelected(id, { source: 'room' }); },
      onHover,
      reducedMotion,
    });
    setRoomState('ready');
    $('room-canvas').addEventListener('pointerdown', () => $('room-hint').classList.add('gone'), { once: true });
    if (selectedId) room.select(selectedId);
  } catch (err) {
    room = null;
    setRoomState('fallback', '3d-rummet kunde inte laddas — projekten finns i listan.');
  }
}

async function initCV() {
  try {
    const cv = await loadJSON('../data/cv.json');
    renderCV($('cv'), cv);
    root.dataset.cv = 'ready';
  } catch {
    const p = document.createElement('p');
    p.className = 'notice';
    p.textContent = 'loggen kunde inte laddas — se github.com/willevic2002';
    $('cv').replaceChildren(p);
    root.dataset.cv = 'error';
  }
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
    // D4: every valid project goes in the list; only the first MAX_SHELF go on the shelf (mountRoom).
    if (projects.length > MAX_SHELF) console.warn(`projects: ${projects.length} > ${MAX_SHELF}, only the first ${MAX_SHELF} go on the shelf`);
    renderProjectList(list, projects, pick, hoverRoom);
  } catch {
    projects = [];
    const li = document.createElement('li');
    li.className = 'notice';
    li.textContent = '[error] kunde inte läsa projekten. försök ladda om sidan.';
    list.replaceChildren(li);
  }
  window.__room = { items: Math.min(projects.length, MAX_SHELF) };
  fromHash(false);
}

function fromHash(smooth) {
  const m = location.hash.match(/^#p=(.+)$/);
  let id = null;
  try { id = m && decodeURIComponent(m[1]); } catch { return; }
  if (!id || id === selectedId || !byId(id)) return;
  setSelected(id);
  $('rummet').scrollIntoView({ block: 'start', behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
}
addEventListener('hashchange', () => fromHash(true));

setRoomState('loading');
await Promise.all([initCV(), initProjects()]);
await mountRoomSafely();
