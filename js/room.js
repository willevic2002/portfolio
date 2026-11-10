import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJECT_NAMES, buildScene } from './room/scene.js';
import { makeItem } from './room/items.js';
import { place } from './room/placement.js';
import { createCameraRig } from './room/camera.js';

const CLICK_THRESHOLD_PX = 5;
const MAX_FIT_SCALE = 1.6; // objects may grow a little to fill their anchor, never beyond this
const HITBOX_PAD = 1.15;
const LIFT_M = 0.01;
const GLOW = { hover: 0.15, selected: 0.25 };
const ARIA_LABEL = 'Interaktivt 3D-rum: Victors skrivbord och rum där projekten står som föremål. Projekten finns även i listan.';

export async function mountRoom(container, projects, { onSelect = () => {}, onHover = () => {}, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  try {
    return setup(renderer, container, projects, { onSelect, onHover, reducedMotion });
  } catch (err) {
    renderer.dispose();
    throw err;
  }
}

/** World-space bounds of an object, ignoring parts flagged userData.noHit (radar fan, outlines). */
function boundsOf(root) {
  const box = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  const walk = (o) => {
    if (o.userData.noHit) return;
    if (o.isMesh) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    }
    o.children.forEach(walk);
  };
  walk(root);
  return box;
}

function meshesOf(root, { skipAnimatedShadow = false } = {}) {
  const out = [];
  const walk = (o, inherited) => {
    if (o.userData.noHit) return;
    const noShadow = inherited || Boolean(o.userData.noShadow);
    if (o.isMesh) out.push({ mesh: o, noShadow });
    o.children.forEach((c) => walk(c, noShadow));
  };
  walk(root, false);
  return skipAnimatedShadow ? out.filter((m) => !m.noShadow) : out;
}

/** Back-face hull outline: sibling mesh per part, inflated by an absolute `width` around its own centre. */
function createOutline(item, material) {
  const parts = meshesOf(item)
    .map(({ mesh }) => mesh)
    .filter((m) => m.material.opacity >= 0.9 && !m.material.isMeshBasicMaterial);
  const outlines = parts.map((mesh) => {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const o = new THREE.Mesh(mesh.geometry, material);
    o.matrixAutoUpdate = false;
    o.visible = false;
    o.userData.noHit = true;
    mesh.parent.add(o);
    return { o, mesh, centre: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
  });
  const m = new THREE.Matrix4();
  const t = new THREE.Matrix4();
  const s = new THREE.Matrix4();
  return {
    setVisible(v) { outlines.forEach(({ o }) => { o.visible = v; }); },
    setWidth(width) { // width in item-local metres
      for (const { o, mesh, centre, size } of outlines) {
        s.makeScale(...[size.x, size.y, size.z].map((v) => (v > 1e-6 ? (v + 2 * width) / v : 1)));
        m.copy(mesh.matrix).multiply(t.makeTranslation(centre.x, centre.y, centre.z)).multiply(s).multiply(t.makeTranslation(-centre.x, -centre.y, -centre.z));
        o.matrix.copy(m);
      }
    },
  };
}

/** Rim glow: lifts emissive on every lit material, keeping already-glowing colours. */
function createGlow(item) {
  const mats = new Map();
  for (const { mesh } of meshesOf(item)) {
    const m = mesh.material;
    if (m.emissive && !mats.has(m)) mats.set(m, { color: m.emissive.clone(), intensity: m.emissiveIntensity });
  }
  return (level) => {
    for (const [m, base] of mats) {
      if (!level) { m.emissive.copy(base.color); m.emissiveIntensity = base.intensity; } else if (base.intensity > 0) {
        m.emissive.copy(base.color);
        m.emissiveIntensity = base.intensity + level * 2;
      } else {
        m.emissive.set(0xf0f0f0);
        m.emissiveIntensity = level;
      }
    }
  };
}

function createLabel(container) {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'absolute', left: '0', top: '0', pointerEvents: 'none', whiteSpace: 'nowrap', opacity: '0',
    padding: '0.25rem 0.7rem', font: 'inherit', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--color-text-bright, #f5f5f5)',
    background: 'var(--overlay-tip, rgba(5,5,5,0.85))', borderRadius: 'var(--radius-pill, 999px)',
    boxShadow: 'var(--glow-sm, 0 0 8px rgba(245,245,245,0.25))', willChange: 'transform',
  });
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(el);
  return el;
}

function setup(renderer, container, projects, { onSelect, onHover, reducedMotion }) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', ARIA_LABEL);
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
  container.appendChild(canvas);

  /* ---- scene (R1) ---- */
  const built = buildScene({ reducedMotion });
  const scene = new THREE.Scene();
  scene.background = built.background ?? new THREE.Color(0x000000);
  renderer.toneMapping = built.toneMapping ?? THREE.ACESFilmicToneMapping;
  const baseExposure = built.exposure ?? 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene.add(built.group);
  const lights = Array.isArray(built.lights) ? built.lights : Object.values(built.lights ?? {});
  for (const light of lights) {
    if (!light.parent) scene.add(light);
    if (light.target && !light.target.parent) scene.add(light.target);
  }

  /* ---- camera ---- */
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 30);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enablePan: false, enableDamping: !reducedMotion, dampingFactor: 0.08, rotateSpeed: 0.6, zoomSpeed: 0.8 });
  const rig = createCameraRig(camera, controls, { reducedMotion });

  /* ---- items ---- */
  scene.updateMatrixWorld(true);
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5f5, side: THREE.BackSide, transparent: true, opacity: 0.5, depthWrite: false });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.9, depthWrite: false });
  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xb2a086, transparent: true, opacity: 0.35, depthWrite: false });
  const byId = new Map();
  const hitboxes = [];
  const hitGeometry = new THREE.BoxGeometry(1, 1, 1);
  const hitMaterial = new THREE.MeshBasicMaterial();
  const titles = new Map(projects.map((p) => [p.id, p]));

  for (const { id, anchor: anchorName } of place(projects, Object.keys(built.anchors))) {
    const anchor = built.anchors[anchorName];
    const project = titles.get(id);
    const item = makeItem(project.kind, { reducedMotion });
    const natural = boundsOf(item).getSize(new THREE.Vector3());
    const [sw, sh, sd] = anchor.userData.size ?? [Infinity, Infinity, Infinity];
    const fit = Math.min(MAX_FIT_SCALE, sw / natural.x, sh / natural.y, sd / natural.z);
    item.scale.setScalar(Number.isFinite(fit) && fit > 0 ? fit : 1);
    anchor.add(item);
    scene.updateMatrixWorld(true);

    for (const { mesh, noShadow } of meshesOf(item)) {
      const solid = mesh.material.opacity >= 0.9 && !mesh.material.isMeshBasicMaterial;
      mesh.castShadow = solid && !noShadow;
      mesh.receiveShadow = solid;
    }
    const box = boundsOf(item);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.visible = false; // raycaster ignores .visible, renderer skips it
    hit.scale.copy(size).multiplyScalar(HITBOX_PAD);
    built.group.worldToLocal(hit.position.copy(centre));
    hit.userData.projectId = id;
    built.group.add(hit);
    hitboxes.push(hit);

    const normal = anchorName.startsWith('floor') ? null : new THREE.Vector3(0, 0, 1).transformDirection(anchor.matrixWorld);
    byId.set(id, {
      id, item, project, hit, centre, normal, radius: size.length() / 2, top: new THREE.Vector3(centre.x, box.max.y, centre.z),
      baseY: item.position.y, lift: 0, outline: createOutline(item, outlineMaterial), glow: createGlow(item),
    });
  }
  renderer.shadowMap.needsUpdate = true; // scene is static: bake once (animated parts are noShadow)
  const animatedItems = [...byId.values()].filter((e) => e.item.userData.tick);
  const ring = new THREE.Group();
  ring.visible = false;
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 72), ringMaterial), new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.05, 6, 72), haloMaterial));
  scene.add(ring);

  const present = new Set();
  scene.traverse((o) => o.name && present.add(o.name));
  container.dataset.items = String(byId.size);
  container.dataset.objects = OBJECT_NAMES.filter((n) => present.has(n)).join(',');

  /* ---- state ---- */
  const label = createLabel(container);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  let pointerInside = false;
  let pointerDirty = false;
  let hoveredId = null; // from the canvas
  let guideHoverId = null; // from the guide list
  let selectedId = null;
  let down = null;
  let dirty = true;
  let visible = !document.hidden;
  let onScreen = true;
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  const fine = window.matchMedia?.('(pointer: fine)');

  const syncDataset = () => {
    container.dataset.view = rig.view;
    container.dataset.focus = rig.focused && selectedId ? selectedId : '';
  };
  const activeHover = () => hoveredId ?? guideHoverId;
  const request = () => { dirty = true; schedule(); };

  function applyHighlights() {
    for (const e of byId.values()) {
      const selected = e.id === selectedId;
      const on = selected || e.id === activeHover();
      e.glow(selected ? GLOW.selected : on ? GLOW.hover : 0);
      e.outline.setVisible(on);
      e.liftTarget = e.id === activeHover() ? LIFT_M : 0;
    }
    ring.visible = Boolean(selectedId);
    if (selectedId) {
      const e = byId.get(selectedId);
      ring.position.copy(e.centre);
      ring.scale.setScalar(e.radius * 1.05);
    }
    const hov = byId.get(activeHover());
    label.textContent = hov ? `${hov.project.title} · ${hov.project.category === 'intresse' ? 'intresse' : 'projekt'}` : '';
    if (!hov) label.style.opacity = '0';
    request();
  }

  function select(id) {
    const next = byId.has(id) ? id : null;
    if (next === selectedId) return;
    selectedId = next;
    const e = byId.get(next);
    if (e) rig.focus(e.centre, e.radius, e.normal); else rig.focus(null);
    syncDataset();
    applyHighlights();
  }

  /* ---- picking ---- */
  const toNdc = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const pickAt = () => {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(hitboxes, false)[0]?.object.userData.projectId ?? null;
  };

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight || Math.round((w * 9) / 16));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rig.setAspect(camera.aspect);
    request();
  };

  function placeLabel() {
    const hov = byId.get(activeHover());
    if (!hov || (fine && !fine.matches)) return;
    tmp.copy(hov.top).project(camera);
    const x = ((tmp.x + 1) / 2) * container.clientWidth;
    const y = ((1 - tmp.y) / 2) * container.clientHeight;
    label.style.transform = `translate(${x}px, ${y - 8}px) translate(-50%, -100%)`;
    label.style.opacity = tmp.z < 1 ? '1' : '0';
  }

  /* ---- loop: continuous only while something moves; otherwise on demand ---- */
  const tick = (now) => {
    frame = 0;
    if (!visible || !onScreen) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    elapsed += dt;
    let moving = rig.update(dt);
    if (built.animated && built.update?.(dt)) moving = true;
    if (animatedItems.length) {
      for (const e of animatedItems) e.item.userData.tick(elapsed);
      moving = true;
    }
    for (const e of byId.values()) { // 1 cm hover lift over ~150 ms (instant under reduced motion)
      const target = e.liftTarget ?? 0;
      if (e.lift === target) continue;
      e.lift = reducedMotion ? target : THREE.MathUtils.damp(e.lift, target, 20, dt);
      if (Math.abs(e.lift - target) < 1e-4) e.lift = target;
      e.item.position.y = e.baseY + e.lift / e.item.parent.scale.y;
      moving = true;
    }
    if (pointerDirty) {
      pointerDirty = false;
      const id = pointerInside && !down && !rig.tweening ? pickAt() : null;
      if (id !== hoveredId) {
        hoveredId = id;
        canvas.style.cursor = id ? 'pointer' : '';
        onHover(id);
        applyHighlights();
      }
    }
    if (moving || dirty) {
      dirty = false;
      renderer.toneMappingExposure = baseExposure * rig.exposureScale;
      if (selectedId) ring.quaternion.copy(camera.quaternion);
      const hov = byId.get(activeHover());
      if (hov) hov.outline.setWidth(THREE.MathUtils.clamp(camera.position.distanceTo(hov.centre) * 0.004, 0.0015, 0.014) / hov.item.scale.x);
      const sel = byId.get(selectedId);
      if (sel && sel !== hov) sel.outline.setWidth(THREE.MathUtils.clamp(camera.position.distanceTo(sel.centre) * 0.004, 0.0015, 0.014) / sel.item.scale.x);
      renderer.render(scene, camera);
      placeLabel();
    }
    if (moving) schedule();
  };
  function schedule() { if (!frame && visible && onScreen) frame = requestAnimationFrame(tick); }

  const listeners = [
    ['pointermove', (e) => {
      if (e.pointerType === 'touch') return; // no hover on touch
      toNdc(e); pointerInside = true; pointerDirty = true; schedule();
    }],
    ['pointerleave', () => { down = null; pointerInside = false; pointerDirty = true; schedule(); }],
    ['pointerdown', (e) => { down = { id: e.pointerId, x: e.clientX, y: e.clientY }; }],
    ['pointercancel', () => { down = null; }],
    ['pointerup', (e) => {
      const d = down;
      down = null;
      // ignore ups without a matching down (pinch, press outside + release over item)
      if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) >= CLICK_THRESHOLD_PX) return;
      toNdc(e);
      const id = pickAt();
      if (!id && !selectedId) return;
      select(id);
      onSelect(id);
    }],
  ];
  listeners.forEach(([type, fn]) => canvas.addEventListener(type, fn));
  // Capture so the tween is cancelled (and controls re-enabled) before OrbitControls sees the gesture.
  const cancelTween = () => rig.cancel();
  ['pointerdown', 'wheel'].forEach((type) => canvas.addEventListener(type, cancelTween, { capture: true, passive: true }));
  controls.addEventListener('change', request);

  const onVisibility = () => { visible = !document.hidden; last = 0; request(); };
  document.addEventListener('visibilitychange', onVisibility);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; last = 0; request(); });
  intersection.observe(container);

  rig.setView('overview', true);
  resize();
  syncDataset();
  if (visible) { renderer.toneMappingExposure = baseExposure; renderer.render(scene, camera); dirty = false; } // hidden: first visibilitychange renders
  schedule();

  return {
    select,
    hover(id) {
      guideHoverId = byId.has(id) ? id : null;
      applyHighlights();
    },
    setView(name) {
      rig.setView(name);
      syncDataset();
      request();
    },
    destroy() {
      cancelAnimationFrame(frame);
      visible = false;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      listeners.forEach(([type, fn]) => canvas.removeEventListener(type, fn));
      ['pointerdown', 'wheel'].forEach((type) => canvas.removeEventListener(type, cancelTween, { capture: true }));
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [o.material].flat().forEach((m) => m?.dispose());
      });
      label.remove();
      renderer.dispose();
      canvas.remove();
    },
  };
}
