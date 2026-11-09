import * as THREE from 'three';

// Procedural room, metres, Y up. Palette is the darkened/desaturated Event Horizon mix from design/spec.md.
export const OBJECT_NAMES = ['backwall', 'desk', 'monitor', 'pc', 'drawers', 'chair', 'lamp', 'window', 'radiator', 'shelf', 'scooter'];

const mat = (color, { rough = 0.7, metal = 0, emissive = 0x000000, glow = 0, ...rest } = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: glow, ...rest });

function box(parent, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function cylinder(parent, rt, rb, h, material, x, y, z, rotZ = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), material);
  m.position.set(x, y, z);
  m.rotation.z = rotZ;
  parent.add(m);
  return m;
}

function named(name, parent) {
  const g = new THREE.Group();
  g.name = name;
  parent.add(g);
  return g;
}

function buildShell(scene) {
  const backwall = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), mat(0x1a2026, { rough: 0.95 }));
  backwall.name = 'backwall';
  backwall.position.set(0, 1.3, -1.6);
  scene.add(backwall);

  const wallMat = mat(0xb8b8b8, { rough: 0.9 });
  for (const sign of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), wallMat);
    wall.position.set(1.8 * sign, 1.3, 0);
    wall.rotation.y = -sign * Math.PI / 2;
    scene.add(wall);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.2), mat(0x6e6458, { rough: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const plankMat = mat(0x5a5248, { rough: 0.9 });
  for (let x = -1.5; x < 1.8; x += 0.3) box(scene, 0.006, 0.002, 3.2, plankMat, x, 0.002, 0);
  box(scene, 3.6, 0.07, 0.015, mat(0xc8c8c8, { rough: 0.6 }), 0, 0.035, -1.592); // skirting
}

function buildDesk(scene) {
  const white = mat(0xc8c8c8, { rough: 0.6 });
  const desk = named('desk', scene);
  box(desk, 1.6, 0.04, 0.8, mat(0x9a8a76), -0.2, 0.74, -1.2); // wood top
  box(desk, 0.05, 0.7, 0.05, white, -0.95, 0.37, -1.0);
  box(desk, 0.05, 0.7, 0.05, white, 0.57, 0.37, -0.9);
  box(desk, 0.05, 0.04, 0.7, white, -0.95, 0.02, -1.15); // feet
  box(desk, 0.05, 0.04, 0.7, white, 0.57, 0.02, -1.1);
  box(desk, 0.8, 0.012, 0.35, mat(0x141414, { rough: 1 }), -0.5, 0.766, -1.0); // desk mat
  const black = mat(0x0a0a0a, { rough: 0.4, metal: 0.2 });
  box(desk, 0.42, 0.02, 0.14, black, -0.5, 0.782, -0.95); // keyboard
  box(desk, 0.06, 0.025, 0.1, black, -0.12, 0.785, -0.95); // mouse
  const keycaps = mat(0x1a1a1a, { rough: 0.5 });
  box(desk, 0.4, 0.006, 0.12, keycaps, -0.5, 0.795, -0.95);

  const monitor = named('monitor', scene);
  const R = 1.1;
  const arc = 1.0;
  const start = Math.PI - arc / 2;
  const curve = (r, h, material) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true, start, arc), material);
    m.position.set(-0.5, 0.97, -1.38 + R);
    monitor.add(m);
  };
  curve(R + 0.012, 0.35, mat(0x0a0a0a, { rough: 0.4, metal: 0.2, side: THREE.DoubleSide }));
  curve(R, 0.32, mat(0x050505, { rough: 0.3, emissive: 0x1a2026, glow: 0.6, side: THREE.BackSide }));
  box(monitor, 0.05, 0.16, 0.04, black, -0.5, 0.84, -1.4);
  box(monitor, 0.28, 0.01, 0.18, black, -0.5, 0.78, -1.34);

  const panel = new THREE.Group();
  panel.position.set(0.02, 1.0, -1.42);
  panel.rotation.y = 0.22;
  box(panel, 0.3, 0.5, 0.03, black, 0, 0, 0);
  box(panel, 0.012, 0.5, 0.032, mat(0xb07c7c, { emissive: 0xb07c7c, glow: 0.3 }), 0.156, 0, 0); // red edge
  monitor.add(panel);

  const pc = named('pc', scene);
  box(pc, 0.4, 0.44, 0.3, black, 0.4, 0.98, -1.35);
  const glass = box(pc, 0.3, 0.34, 0.004, mat(0x0a1214, { rough: 0.2, metal: 0.3, transparent: true, opacity: 0.88 }), 0.4, 0.98, -1.198);
  glass.name = 'pc-glow';
  box(pc, 0.012, 0.24, 0.006, mat(0x4fd0e0, { emissive: 0x4fd0e0, glow: 1.4 }), 0.43, 0.97, -1.194);
  for (const y of [0.88, 1.06]) box(pc, 0.07, 0.07, 0.006, mat(0x4fd0e0, { emissive: 0x4fd0e0, glow: 0.8 }), 0.34, y, -1.194); // fans
  box(pc, 0.08, 0.14, 0.08, black, 0.14, 0.83, -1.38); // speaker
  cylinder(pc, 0.03, 0.03, 0.012, mat(0x2a2a2a), 0.14, 0.83, -1.337, Math.PI / 2);

  const drawers = named('drawers', scene);
  box(drawers, 0.36, 0.7, 0.5, white, 0.38, 0.35, -1.33);
  const slot = mat(0x6a6a6a);
  for (let i = 0; i < 5; i++) {
    const y = 0.63 - i * 0.13;
    box(drawers, 0.34, 0.12, 0.01, white, 0.38, y, -1.08);
    box(drawers, 0.12, 0.012, 0.012, slot, 0.38, y - 0.02, -1.072);
  }
  return { white, black };
}

function buildChair(scene, { white }) {
  const chair = named('chair', scene);
  chair.position.set(-0.5, 0, -0.5);
  const fabric = mat(0xb8b4ae, { rough: 0.9 });
  const meshM = mat(0x6a6a6a, { rough: 1, transparent: true, opacity: 0.35 });
  box(chair, 0.46, 0.04, 0.46, fabric, 0, 0.46, 0); // seat
  for (const x of [-0.21, 0.21]) box(chair, 0.025, 0.5, 0.025, white, x, 0.78, 0.23); // backrest frame
  box(chair, 0.44, 0.025, 0.025, white, 0, 1.03, 0.23);
  box(chair, 0.44, 0.025, 0.025, white, 0, 0.55, 0.23);
  box(chair, 0.4, 0.44, 0.01, meshM, 0, 0.79, 0.23); // mesh
  for (const x of [-0.26, 0.26]) {
    box(chair, 0.04, 0.03, 0.34, white, x, 0.66, 0.05); // armrest
    box(chair, 0.03, 0.2, 0.03, white, x, 0.55, 0.1);
  }
  cylinder(chair, 0.025, 0.025, 0.3, white, 0, 0.28, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(chair, 0.34, 0.025, 0.04, white, Math.sin(a) * 0.17, 0.07, Math.cos(a) * 0.17);
    leg.rotation.y = a - Math.PI / 2;
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), mat(0x0a0a0a));
    wheel.position.set(Math.sin(a) * 0.34, 0.03, Math.cos(a) * 0.34);
    chair.add(wheel);
  }
  chair.rotation.y = 0.12;
}

function buildLamp(scene) {
  const lamp = named('lamp', scene);
  cylinder(lamp, 0.04, 0.045, 0.03, mat(0x2a2a2a), -0.9, 0.775, -1.4);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), mat(0xb4ad8c, { emissive: 0xb4ad8c, glow: 0.8, transparent: true, opacity: 0.92 }));
  bulb.scale.y = 1.5;
  bulb.position.set(-0.9, 0.86, -1.4);
  lamp.add(bulb);
  const light = new THREE.PointLight(0xffb874, 0.6, 1.5);
  light.position.copy(bulb.position);
  lamp.add(light);
}

function buildWindowSide(scene) {
  const white = mat(0xd8d8d4, { rough: 0.6 });
  const win = named('window', scene);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.25), mat(0xe0e0e0, { emissive: 0xe0e0e0, glow: 0.55 }));
  pane.position.set(1.795, 1.575, -0.5);
  pane.rotation.y = -Math.PI / 2;
  win.add(pane);
  box(win, 0.05, 0.05, 1.5, white, 1.78, 2.22, -0.5);
  box(win, 0.05, 0.05, 1.5, white, 1.78, 0.93, -0.5);
  box(win, 0.05, 1.3, 0.05, white, 1.78, 1.575, -1.2);
  box(win, 0.05, 1.3, 0.05, white, 1.78, 1.575, 0.2);
  box(win, 0.03, 1.25, 0.03, white, 1.78, 1.575, -0.5); // mullion
  box(win, 0.22, 0.04, 1.6, white, 1.69, 0.9, -0.5); // sill
  const curtain = mat(0xe0e0e0, { rough: 1, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  for (const [z, w] of [[-1.35, 0.35], [0.35, 0.35], [-1.2, 0.2]]) {
    for (let i = 0; i < 4; i++) { // folds: staggered strips
      box(win, 0.02, 1.55, w / 4, curtain, 1.62 - (i % 2) * 0.03, 1.5, z + (i - 1.5) * (w / 4));
    }
  }

  const radiator = named('radiator', scene);
  const fin = mat(0xc8c8c8, { rough: 0.6 });
  box(radiator, 0.08, 0.5, 1.3, fin, 1.7, 0.45, -0.5);
  for (let i = 0; i < 18; i++) box(radiator, 0.03, 0.46, 0.02, fin, 1.65, 0.45, -1.1 + i * 0.07);
}

function buildScooter(scene) {
  const scooter = named('scooter', scene);
  const blue = mat(0x8b9aac, { rough: 0.5, metal: 0.1 });
  const dark = mat(0x0a0a0a, { rough: 0.8 });
  box(scooter, 0.09, 0.05, 0.22, blue, 1.69, 0.99, -0.45);
  box(scooter, 0.09, 0.07, 0.08, blue, 1.69, 1.02, -0.36);
  box(scooter, 0.06, 0.03, 0.1, dark, 1.69, 1.04, -0.55); // seat
  for (const z of [-0.6, -0.3]) cylinder(scooter, 0.03, 0.03, 0.03, dark, 1.69, 0.96, z, Math.PI / 2);
  box(scooter, 0.08, 0.012, 0.012, dark, 1.69, 1.08, -0.3); // handlebar
  box(scooter, 0.03, 0.03, 0.03, mat(0xb09480), 1.68, 0.945, 0.1); // small sill item
}

function buildLights(scene) {
  scene.add(new THREE.HemisphereLight(0xe0e0e0, 0x000000, 0.7));
  const key = new THREE.DirectionalLight(0xdfe8f0, 1.4);
  key.position.set(4, 3, 1);
  key.target.position.set(0, 1, -1);
  scene.add(key, key.target);
  const pc = new THREE.PointLight(0x4fd0e0, 0.35, 0.7);
  pc.position.set(0.4, 1.0, -1.15);
  const mon = new THREE.PointLight(0x8b9aac, 0.8, 1.5);
  mon.position.set(-0.5, 1.0, -1.0);
  scene.add(pc, mon);
}

export function buildRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  buildShell(scene);
  const palette = buildDesk(scene);
  buildChair(scene, palette);
  buildLamp(scene);
  buildWindowSide(scene);
  buildScooter(scene);
  buildLights(scene);
  return scene;
}
