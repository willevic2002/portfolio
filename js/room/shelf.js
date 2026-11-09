import * as THREE from 'three';
import { makeItem } from './items.js';
import { layoutShelf, SHELF_WIDTH, SHELF_CENTER_X } from './layout.js';

export const MAX_ITEMS = 12;
const BOARD_Z = -1.6 + 0.11;
const S = 1.7; // max item scale; clamped so neighbours never overlap
const HOVER_GLOW = 0.25;
const SELECTED_GLOW = 0.4;

function setGlow(group, intensity) {
  group.traverse((o) => {
    const m = o.isMesh && o.material;
    if (!m || !m.emissive) return;
    m.userData.base ??= { color: m.emissive.clone(), intensity: m.emissiveIntensity };
    if (intensity) {
      m.emissive.set(0xf0f0f0);
      m.emissiveIntensity = intensity;
    } else {
      m.emissive.copy(m.userData.base.color);
      m.emissiveIntensity = m.userData.base.intensity;
    }
  });
}

/** Builds the wall shelf. Returns { group, hitboxes, setHover, setSelected } (ids or null). */
export function createShelf(projects) {
  const shown = projects.slice(0, MAX_ITEMS);
  const { rows, slots } = layoutShelf(shown.length);

  const group = new THREE.Group();
  group.name = 'shelf';
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.6 });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
  const rowY = [...new Set(slots.map((s) => s.y))];
  for (let r = 0; r < rows; r++) {
    const y = rowY[r] ?? 1.35 + 0.5 * r;
    const board = new THREE.Mesh(new THREE.BoxGeometry(SHELF_WIDTH, 0.03, 0.3), boardMat);
    board.position.set(SHELF_CENTER_X, y - 0.015, BOARD_Z);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(SHELF_WIDTH, 0.004, 0.004), edgeMat);
    edge.position.set(SHELF_CENTER_X, y - 0.03, BOARD_Z + 0.15);
    group.add(board, edge);
  }

  const slotW = SHELF_WIDTH / Math.ceil(shown.length / rows || 1);
  const sc = Math.min(S, (slotW * 0.94) / 0.2); // item/hitbox/ring all <= 94% of slot width
  const hitGeo = new THREE.BoxGeometry(0.2 * sc, 0.22 * sc, 0.18 * sc);
  const hitboxes = [];
  const byId = new Map();
  shown.forEach((project, i) => {
    const { x, y } = slots[i];
    const item = makeItem(project.kind);
    item.position.set(x, y, BOARD_Z);
    item.scale.setScalar(sc);
    const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial());
    hit.visible = false; // raycaster ignores .visible, renderer skips it
    hit.position.set(x, y + 0.11 * sc, BOARD_Z);
    hit.userData.projectId = project.id;
    group.add(item, hit);
    hitboxes.push(hit);
    byId.set(project.id, { item, hit, slot: slots[i] });
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1 * sc, 0.0035, 8, 64), new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }));
  ring.visible = false;
  group.add(ring);

  let hovered = null;
  let selected = null;
  const refresh = () => {
    for (const [id, { item }] of byId) setGlow(item, id === selected ? SELECTED_GLOW : id === hovered ? HOVER_GLOW : 0);
    const sel = byId.get(selected);
    ring.visible = Boolean(sel);
    if (sel) ring.position.set(sel.slot.x, sel.slot.y + 0.1 * sc, BOARD_Z - 0.05);
  };

  return {
    group,
    hitboxes,
    count: shown.length,
    setHover(id) { hovered = id; refresh(); },
    setSelected(id) { selected = byId.has(id) ? id : null; refresh(); },
  };
}
