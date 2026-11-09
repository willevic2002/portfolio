import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom, OBJECT_NAMES } from './room/scene.js';
import { createShelf } from './room/shelf.js';

const CLICK_THRESHOLD_PX = 5;
const ARIA_LABEL = 'Interaktivt 3D-rum: Victors skrivbord med en hylla där projekten står. Projekten finns även i listan bredvid.';

export async function mountRoom(container, projects, { onSelect = () => {}, onHover = () => {}, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  try {
    return setup(renderer, container, projects, { onSelect, onHover, reducedMotion });
  } catch (err) {
    renderer.dispose();
    throw err;
  }
}

function setup(renderer, container, projects, { onSelect, onHover, reducedMotion }) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', ARIA_LABEL);
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
  container.appendChild(canvas);

  const scene = buildRoom();
  const shelf = createShelf(projects);
  scene.add(shelf.group);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 20);
  camera.position.set(0.1, 1.4, 0.55);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.2, 1.05, -1.0);
  Object.assign(controls, {
    enablePan: false, minDistance: 0.6, maxDistance: 2.4,
    minPolarAngle: 1.0, maxPolarAngle: 1.75, minAzimuthAngle: -0.75, maxAzimuthAngle: 0.9,
    enableDamping: !reducedMotion,
  });
  controls.update();

  const present = new Set();
  scene.traverse((o) => o.name && present.add(o.name));
  container.dataset.items = String(shelf.count);
  container.dataset.objects = OBJECT_NAMES.filter((n) => present.has(n)).join(',');

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerInside = false;
  let pointerDirty = false;
  let hoveredId = null;
  let down = null;
  let dirty = true;
  let visible = !document.hidden;
  let onScreen = true;
  let frame = 0;

  const pickAt = () => {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(shelf.hitboxes, false)[0]?.object.userData.projectId ?? null;
  };
  const toNdc = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight || Math.round((w * 9) / 16));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const tick = () => {
    frame = 0;
    if (!visible || !onScreen) return;
    if (controls.update()) dirty = true;
    if (pointerDirty) {
      pointerDirty = false;
      const id = pointerInside && !down ? pickAt() : null;
      if (id !== hoveredId) {
        hoveredId = id;
        shelf.setHover(id);
        canvas.style.cursor = id ? 'pointer' : '';
        onHover(id);
        dirty = true;
      }
    }
    if (dirty) {
      dirty = false;
      renderer.render(scene, camera);
    }
    schedule();
  };
  const schedule = () => { if (!frame && visible && onScreen) frame = requestAnimationFrame(tick); };

  const listeners = [
    ['pointermove', (e) => { toNdc(e); pointerInside = true; pointerDirty = true; schedule(); }],
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
      if (!id) return;
      shelf.setSelected(id);
      dirty = true;
      schedule();
      onSelect(id);
    }],
  ];
  listeners.forEach(([type, fn]) => canvas.addEventListener(type, fn));
  controls.addEventListener('change', () => { dirty = true; schedule(); });

  const onVisibility = () => { visible = !document.hidden; dirty = true; schedule(); };
  document.addEventListener('visibilitychange', onVisibility);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; dirty = true; schedule(); });
  intersection.observe(container);

  resize();
  if (visible) { renderer.render(scene, camera); dirty = false; } // hidden: first visibilitychange renders
  schedule();

  return {
    select(id) {
      shelf.setSelected(id);
      dirty = true;
      schedule();
    },
    hover(id) {
      shelf.setHover(id);
      dirty = true;
      schedule();
    },
    destroy() {
      cancelAnimationFrame(frame);
      visible = false;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      listeners.forEach(([type, fn]) => canvas.removeEventListener(type, fn));
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [o.material].flat().forEach((m) => m?.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
