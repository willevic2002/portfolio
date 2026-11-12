import * as THREE from 'three';
import { C, mat, basic, box, cyl, ball, named, merge, instances, glowPlane, blob } from './kit.js';

const DESK_TOP = 0.755; // desk surface height; anchors and desk items sit on it

/** White sit/stand desk (wood top), mat, keyboard (instanced keys), mouse. */
export function buildDesk(root) {
  const g = named('desk', root);
  const white = mat(C.fg, { rough: 0.55 });
  const wood = mat(C.wood, { rough: 0.7 });
  box(g, 1.6, 0.03, 0.8, wood, -0.6, 0.74, -1.4, 0.006);
  box(g, 1.58, 0.012, 0.02, mat(0x9d8a72, { rough: 0.7 }), -0.6, 0.716, -1.011, 0.002); // front edge band
  for (const x of [-1.35, 0.15]) {
    box(g, 0.055, 0.68, 0.055, white, x, 0.37, -1.4);
    box(g, 0.065, 0.032, 0.72, white, x, 0.016, -1.4);
    box(g, 0.05, 0.02, 0.2, white, x, 0.7, -1.4);
  }
  box(g, 1.5, 0.045, 0.05, white, -0.6, 0.685, -1.4);
  box(g, 0.1, 0.03, 0.05, mat(C.dark, { rough: 0.5 }), -0.35, 0.715, -1.08); // sit/stand control
  const black = mat(C.dark, { rough: 0.45 });
  box(g, 0.9, 0.004, 0.4, mat(C.bg, { rough: 1 }), -0.75, DESK_TOP + 0.002, -1.25, 0); // desk mat
  box(g, 0.44, 0.018, 0.15, black, -0.65, DESK_TOP + 0.013, -1.25, 0.004); // keyboard
  box(g, 0.05, 0.022, 0.085, black, -0.34, DESK_TOP + 0.015, -1.25, 0.008); // mouse
  const keys = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) {
    keys.push({ x: -0.65 - 0.19 + c * 0.0292, y: DESK_TOP + 0.024, z: -1.25 - 0.045 + r * 0.03, color: (r + c) % 5 === 0 ? 0x4a4a4a : C.sel });
  }
  g.add(instances(new THREE.BoxGeometry(0.025, 0.008, 0.025), mat(0xffffff, { rough: 0.5 }), keys));
  merge(g, { cast: true });
  return g;
}

/** Curved ultrawide (cylinder segment), stand, bias light. */
export function buildMonitor(root, led) {
  const g = named('monitor', root);
  const black = mat(C.dark, { rough: 0.45 });
  const R = 1.8, arc = (32 * Math.PI) / 180, cx = -0.82, cz = -1.62;
  const curve = (r, h, material, y) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true, Math.PI - arc / 2, arc), material);
    m.position.set(cx, y, cz + R);
    g.add(m);
  };
  curve(R + 0.014, 0.436, mat(C.dark, { rough: 0.4, metal: 0.2, side: THREE.DoubleSide }), 1.07); // bezel
  curve(R - 0.002, 0.41, mat(C.bg, { rough: 0.3, emissive: C.blue, glow: 0.35, side: THREE.BackSide }), 1.07); // screen
  box(g, 0.06, 0.17, 0.035, black, cx, 0.84, cz - 0.04);
  box(g, 0.3, 0.012, 0.19, black, cx, DESK_TOP + 0.006, cz + 0.02);

  box(led, 0.95, 0.006, 0.01, basic(C.bright), cx, 0.84, -1.79, 0); // bias strip behind the screen
  const glow = glowPlane(1.9, 0.9, C.blue, 0.4);
  glow.position.set(cx, 0.98, -1.796);
  g.add(glow);
  merge(g, { cast: true });
  return g;
}

/** Black PC on top of the drawer unit, tempered-glass side (towards -x / the camera) and cyan fan rings. */
export function buildPc(root) {
  const g = named('pc', root);
  const case_ = mat(C.dark, { rough: 0.25, metal: 0.3 });
  const x0 = 0.26, x1 = 0.48, cy = 0.985, cz = -1.55;
  box(g, x1 - x0, 0.46, 0.44, case_, (x0 + x1) / 2, cy, cz, 0.008);
  box(g, 0.22, 0.012, 0.44, mat(C.sel, { rough: 0.5 }), (x0 + x1) / 2, cy - 0.236, cz, 0.003); // base
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.42), mat(0x061012, { rough: 0.1, metal: 0.4 }));
  glass.rotation.y = -Math.PI / 2;
  glass.position.set(x0 - 0.0015, cy, cz);
  g.add(glass);
  const cyan = mat(C.cyan, { rough: 0.4, emissive: C.cyan, glow: 1.6 });
  const fans = [0.1, 0, -0.1].map((dy) => ({ x: x0 - 0.004, y: cy + dy + 0.02, z: cz + 0.13, ry: Math.PI / 2 }));
  g.add(instances(new THREE.TorusGeometry(0.036, 0.0055, 6, 24), cyan, fans));
  g.add(instances(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 10), cyan, fans.map((f) => ({ ...f, ry: 0, rz: Math.PI / 2 }))));
  box(g, 0.006, 0.34, 0.012, cyan, x0 - 0.004, cy, cz - 0.16, 0); // vertical RGB strip
  box(g, 0.1, 0.05, 0.26, mat(0x0c0c0c, { rough: 0.4, metal: 0.5 }), 0.09, cy - 0.1, cz - 0.07, 0.004); // GPU
  box(g, 0.004, 0.01, 0.26, cyan, x0 + 0.005, cy - 0.1, cz - 0.07, 0);
  for (let i = 0; i < 6; i++) box(g, 0.16, 0.003, 0.012, mat(C.sel, { rough: 0.6 }), 0.09, cy + 0.231, cz - 0.08 + i * 0.03, 0); // top vents
  cyl(g, 0.012, 0.012, 0.012, mat(C.fg, { rough: 0.3, metal: 0.6 }), 0.09, cy + 0.236, cz + 0.17, { seg: 12 }); // power button
  merge(g, { cast: true });
  return g;
}

/** White 5-drawer unit with cut-out handles, right of the desk. */
export function buildDrawers(root) {
  const g = named('drawers', root);
  box(g, 0.34, DESK_TOP, 0.58, mat(C.fg, { rough: 0.55 }), 0.37, DESK_TOP / 2, -1.51, 0.004);
  const front = mat(C.light, { rough: 0.5 });
  const cut = mat(C.sel, { rough: 0.8 });
  for (let i = 0; i < 5; i++) {
    const y = 0.075 + i * 0.1425;
    box(g, 0.32, 0.136, 0.012, front, 0.37, y, -1.218, 0.003);
    box(g, 0.11, 0.016, 0.014, cut, 0.37, y + 0.04, -1.214, 0);
  }
  box(g, 0.34, 0.02, 0.58, mat(C.light, { rough: 0.5 }), 0.37, DESK_TOP - 0.003, -1.51, 0.003); // lipped top
  merge(g, { cast: true });
  return g;
}

/** White mesh ergonomic chair with headrest + 5-star base, seen from behind. */
export function buildChair(root) {
  const g = named('chair', root, -0.75, 0, -0.7);
  g.rotation.y = 0.26;
  const frame = mat(C.fg, { rough: 0.55 });
  const meshM = mat(C.light, { rough: 0.95, flatShading: true });
  const dark = mat(C.dark, { rough: 0.8 });
  box(g, 0.5, 0.07, 0.5, meshM, 0, 0.47, 0, 0.02); // seat cushion
  box(g, 0.46, 0.025, 0.46, frame, 0, 0.425, 0, 0.004);
  for (const x of [-0.22, 0.22]) box(g, 0.032, 0.6, 0.03, frame, x, 0.82, 0.24, 0.006); // back uprights
  box(g, 0.44, 0.04, 0.03, frame, 0, 1.12, 0.24, 0.006);
  box(g, 0.44, 0.04, 0.03, frame, 0, 0.54, 0.24, 0.006);
  box(g, 0.4, 0.55, 0.012, meshM, 0, 0.83, 0.245, 0.002); // mesh back
  box(g, 0.26, 0.15, 0.022, frame, 0, 0.78, 0.262, 0.01); // lumbar plate
  box(g, 0.2, 0.07, 0.024, dark, 0, 0.78, 0.268, 0.004); // lumbar window
  box(g, 0.032, 0.2, 0.032, frame, 0, 1.2, 0.25, 0.004); // headrest stem
  box(g, 0.32, 0.15, 0.05, meshM, 0, 1.32, 0.245, 0.012); // headrest pad
  box(g, 0.28, 0.1, 0.01, frame, 0, 1.32, 0.275, 0.004);
  for (const x of [-0.285, 0.285]) {
    box(g, 0.028, 0.2, 0.03, frame, x, 0.56, 0.12, 0.004); // arm post
    box(g, 0.06, 0.03, 0.34, frame, x, 0.68, 0.01, 0.01); // arm pad
  }
  cyl(g, 0.026, 0.026, 0.28, frame, 0, 0.27, 0);
  cyl(g, 0.05, 0.07, 0.05, dark, 0, 0.405, 0);
  const wheelM = mat(C.bg, { rough: 0.8 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const leg = box(g, 0.34, 0.028, 0.05, frame, Math.sin(a) * 0.17, 0.085, Math.cos(a) * 0.17, 0.008);
    leg.rotation.y = a - Math.PI / 2;
    cyl(g, 0.027, 0.027, 0.03, wheelM, Math.sin(a) * 0.33, 0.036, Math.cos(a) * 0.33, { seg: 10, rz: Math.PI / 2, ry: -a });
  }
  blob(g, 0.52, 0, 0, 0.5);
  merge(g, { cast: true });
  return g;
}

/** Glass-bulb desk lamp, left end of the desk. */
export function buildLamp(root) {
  const g = named('lamp', root, -1.35, DESK_TOP, -1.5);
  cyl(g, 0.045, 0.052, 0.028, mat(C.dark, { rough: 0.4, metal: 0.2 }), 0, 0.014, 0, { seg: 20 });
  cyl(g, 0.016, 0.02, 0.03, mat(C.sel, { rough: 0.4, metal: 0.4 }), 0, 0.043, 0, { seg: 12 });
  const glass = ball(g, 0.056, mat(C.light, { rough: 0.1, transparent: true, opacity: 0.32, depthWrite: false }), 0, 0.12, 0, { sy: 1.3, w: 18, h: 14 });
  glass.renderOrder = 4;
  cyl(g, 0.004, 0.004, 0.09, mat(C.yellow, { rough: 0.4, emissive: C.yellow, glow: 2.5 }), 0, 0.115, 0, { seg: 6 }); // filament
  ball(g, 0.014, mat(C.yellow, { rough: 0.4, emissive: C.yellow, glow: 2.5 }), 0, 0.15, 0, { w: 8, h: 6 });
  merge(g);
  return g;
}
