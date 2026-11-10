// Pure placement rules (no imports): which anchor does each project's object stand on?
export const PREFERRED = {
  mower: 'floor-rug', pcb: 'desk-front', thermometer: 'sill', devboard: 'shelf-0',
  chip: 'shelf-1', phone: 'shelf-3', book: 'shelf-4', box: 'shelf-5',
};
// E5: overflow order once slot and preferred anchor are taken; covers all 15 anchors.
export const OVERFLOW = [
  'shelf-0', 'shelf-1', 'shelf-2', 'shelf-3', 'shelf-4', 'shelf-5', 'shelf-6', 'drawers-top',
  'desk-left', 'desk-mid', 'desk-right', 'floor-corner', 'sill', 'desk-front', 'floor-rug',
];
const ALIASES = { board: 'pcb', robot: 'mower' };

/** Maps aliases and unknown kinds onto a key of PREFERRED (unknown -> 'box'). */
export function canonicalKind(kind) {
  const k = ALIASES[kind] ?? kind;
  return Object.hasOwn(PREFERRED, k) ? k : 'box';
}

/**
 * Rule per item: valid free `slot` > kind's preferred anchor if free > next free anchor in OVERFLOW order > unplaced.
 * Pinned slots are claimed first so an unpinned item can never steal them.
 * Returns only placed items, in input order: [{ id, anchor }].
 */
export function place(items, anchorNames) {
  const valid = new Set(anchorNames);
  const free = new Set(anchorNames);
  const chosen = new Map();
  const claim = (item, anchor) => { free.delete(anchor); chosen.set(item, anchor); };

  for (const item of items) if (item.slot && valid.has(item.slot) && free.has(item.slot)) claim(item, item.slot);
  for (const item of items) {
    if (chosen.has(item)) continue;
    const preferred = PREFERRED[canonicalKind(item.kind)];
    if (free.has(preferred)) claim(item, preferred);
  }
  for (const item of items) {
    if (chosen.has(item)) continue;
    const next = OVERFLOW.find((n) => free.has(n));
    if (next) claim(item, next);
  }
  return items.filter((i) => chosen.has(i)).map((i) => ({ id: i.id, anchor: chosen.get(i) }));
}
