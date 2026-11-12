import * as THREE from 'three';
import { C, named, merge, rng } from './env/kit.js';
import { buildShell, buildRug, buildStringLights, buildPrint } from './env/shell.js';
import { buildDesk, buildMonitor, buildPc, buildDrawers, buildChair, buildLamp } from './env/furniture.js';
import { buildWindow, buildRadiator, buildScooter } from './env/window.js';
import { buildShelves, BOARDS, TOP } from './env/shelves.js';
import { buildPlant, buildVine } from './env/plants.js';

// R1 environment: procedural cut-away room, metres, Y up. Art direction: design/spec-v2.md.
export const OBJECT_NAMES = ['backwall', 'desk', 'monitor', 'pc', 'drawers', 'chair', 'lamp', 'window', 'radiator', 'shelf', 'scooter', 'rug', 'plant', 'stringlights', 'ledstrip', 'particles'];

/** [name, x, y, z, yaw, [w,h,d]] — origin = surface point for an item's bottom-centre; local +z faces the camera/room. */
const FLOOR_YAW = -0.6;
const ANCHORS = [
  ['desk-left', -1.22, 0.755, -1.3, 0, [0.18, 0.2, 0.18]],
  ['desk-mid', -0.27, 0.759, -1.18, 0, [0.2, 0.2, 0.16]],
  ['desk-right', 0.05, 0.755, -1.15, 0, [0.2, 0.2, 0.2]],
  ['desk-front', -1.04, 0.759, -1.12, 0, [0.22, 0.22, 0.2]],
  ['sill', 1.88, 0.92, 0.15, -Math.PI / 2, [0.2, 0.15, 0.2]],
  ['floor-rug', 1.25, 0, 1.05, FLOOR_YAW, [0.7, 0.3, 0.7]],
  ['floor-corner', 1.5, 0, -0.95, FLOOR_YAW, [0.4, 0.4, 0.4]],
  ['drawers-top', 0.0, 0.755, -1.5, 0, [0.26, 0.2, 0.3]], // name kept for saved slots; the PC now sits on the drawers, so this is the freed desk corner
  ['shelf-0', -1.05, TOP.wall, -1.69, 0, [0.3, 0.2, 0.18]],
  ['shelf-1', -0.7, TOP.wall, -1.69, 0, [0.3, 0.2, 0.18]],
  ['shelf-2', -0.5, TOP.wall, -1.69, 0, [0.2, 0.2, 0.18]],
  ['shelf-3', 1.0, BOARDS[2] + 0.015, -1.62, 0, [0.3, 0.34, 0.25]],
  ['shelf-4', 1.0, BOARDS[1] + 0.015, -1.62, 0, [0.3, 0.34, 0.25]],
  ['shelf-5', 1.0, BOARDS[0] + 0.015, -1.62, 0, [0.3, 0.34, 0.25]],
  ['shelf-6', 0.88, TOP.book, -1.62, 0, [0.3, 0.3, 0.25]],
];

function buildLights(group) {
  const point = (color, intensity, distance, x, y, z, name) => {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.set(x, y, z);
    l.name = name;
    return l;
  };
  const key = new THREE.DirectionalLight(C.light, 1.3);
  key.name = 'starlight';
  key.position.set(4, 4.2, -0.6);
  key.target.position.set(0, 0, -0.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02; // removes striping (acne) on the floor planks
  Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 12 });
  const fill = new THREE.HemisphereLight(0xc4b8a8, 0x1a1612, 1.1);
  fill.name = 'fill';
  group.add(key.target);
  const lights = [
    fill, key,
    point(C.yellow, 1.6, 3.0, -1.35, 1.02, -1.5, 'lamp-light'),
    point(C.bulb, 3.0, 4.5, 0, 2.15, -1.3, 'string-light'),
    point(C.orange, 1.8, 3.5, 1.7, 1.7, -0.2, 'window-spill'),
    point(C.cyan, 0.7, 1.4, -0.12, 1.0, -1.5, 'pc-glow'),
    point(C.blue, 0.6, 1.4, -0.8, 0.95, -1.7, 'monitor-bias'),
    point(0xf0f0f0, 0.5, 1.2, 1.0, 1.1, -1.3, 'bookshelf-leds'),
  ];
  group.add(...lights);
  return lights;
}

/** Dust motes: one Points, never written to — animated by moving the object (cheap). */
function buildParticles(group) {
  const r = rng(99);
  const n = 240, pos = [], col = [];
  const a = new THREE.Color(C.light), b = new THREE.Color(C.yellow);
  for (let i = 0; i < n; i++) {
    const warm = r() < 0.2;
    pos.push(-1.9 + r() * 3.8, -1.2 + r() * 2.4, -1.7 + r() * 3.4);
    const c = warm ? b : a;
    col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.022, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.name = 'particles';
  pts.position.y = 1.3;
  pts.frustumCulled = false;
  group.add(pts);
  return pts;
}

export function buildScene({ reducedMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'room';
  const led = named('ledstrip', group);

  buildShell(group, led);
  buildRug(group);
  buildStringLights(group);
  buildPrint(group);
  buildDesk(group);
  buildMonitor(group, led);
  buildPc(group);
  buildDrawers(group);
  buildChair(group);
  buildLamp(group);
  const windowFx = buildWindow(group, { reducedMotion });
  buildRadiator(group);
  buildScooter(group);
  buildShelves(group, led);
  buildPlant(group);
  buildVine(group, TOP.book);
  merge(led, { receive: false });

  const anchors = {};
  for (const [name, x, y, z, yaw, size] of ANCHORS) {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    o.rotation.y = yaw;
    o.userData.size = size;
    group.add(o);
    anchors[name] = o;
  }

  const lights = buildLights(group);
  const dust = reducedMotion ? null : buildParticles(group);

  let t = 0;
  const animated = !reducedMotion;
  return {
    group,
    anchors,
    lights,
    background: new THREE.Color(C.void),
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.0,
    animated,
    update(dt) {
      if (!animated) return false;
      t += dt;
      dust.position.y = 1.3 + Math.sin(t * 0.3) * 0.04;
      dust.rotation.y = Math.sin(t * 0.07) * 0.06;
      windowFx.update?.(dt);
      return true;
    },
  };
}
