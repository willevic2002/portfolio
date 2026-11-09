import * as THREE from 'three';

// Each item fits a 0.18 x 0.20 x 0.16 slot; origin = bottom centre; materials are never shared.
const mat = (color, rough = 0.6, metal = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function part(group, w, h, d, color, x, y, z, rough, metal) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, rough, metal));
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

const builders = {
  board(g) {
    part(g, 0.18, 0.012, 0.14, 0x5f8a5c, 0, 0.03, 0, 0.7);
    part(g, 0.05, 0.02, 0.05, 0xe0e0e0, -0.04, 0.046, 0.02, 0.4, 0.3);
    part(g, 0.02, 0.012, 0.02, 0x141414, -0.07, 0.042, -0.04, 0.5);
    part(g, 0.02, 0.012, 0.012, 0xd8d0a8, 0.07, 0.042, 0.04, 0.4, 0.5);
    part(g, 0.03, 0.015, 0.03, 0x141414, 0.045, 0.043, -0.03, 0.5);
    part(g, 0.06, 0.012, 0.012, 0xe0d8a8, 0.02, 0.042, 0.05, 0.4, 0.6);
    for (const x of [-0.07, 0.07]) part(g, 0.02, 0.03, 0.02, 0x141414, x, 0.015, 0, 0.8); // standoffs
  },
  chip(g) {
    part(g, 0.14, 0.03, 0.14, 0x2e2e2e, 0, 0.03, 0, 0.5, 0.1);
    for (let i = 0; i < 5; i++) {
      const p = -0.056 + i * 0.028;
      part(g, 0.02, 0.006, 0.01, 0xe0d8a8, p, 0.02, 0.075, 0.4, 0.7);
      part(g, 0.02, 0.006, 0.01, 0xe0d8a8, p, 0.02, -0.075, 0.4, 0.7);
      part(g, 0.01, 0.006, 0.02, 0xe0d8a8, 0.075, 0.02, p, 0.4, 0.7);
      part(g, 0.01, 0.006, 0.02, 0xe0d8a8, -0.075, 0.02, p, 0.4, 0.7);
    }
    part(g, 0.03, 0.002, 0.03, 0x6a6a6a, -0.04, 0.0465, -0.04, 0.5);
  },
  robot(g) {
    part(g, 0.18, 0.04, 0.14, 0x2a2a2a, 0, 0.04, 0, 0.5, 0.2);
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), mat(0x8ea889, 0.4, 0.2));
    puck.position.set(0, 0.095, 0);
    g.add(puck);
    for (const [x, z] of [[-0.075, 0.07], [0.075, 0.07], [-0.075, -0.07], [0.075, -0.07]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), mat(0x141414, 0.9));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.02, z);
      g.add(w);
    }
  },
  book(g) {
    const covers = [0x8b9aac, 0xa48da8, 0x8b9aac];
    covers.forEach((c, i) => {
      const h = 0.19 - i * 0.02;
      part(g, 0.04, h, 0.14, c, -0.06 + i * 0.05, h / 2, 0, 0.8);
      part(g, 0.036, h - 0.01, 0.01, 0xe0e0e0, -0.06 + i * 0.05, h / 2, 0.072, 0.9); // page edge
    });
  },
  box(g) {
    part(g, 0.14, 0.12, 0.12, 0x2a2a2a, 0, 0.06, 0, 0.6, 0.1);
  },
};

export function makeItem(kind) {
  const g = new THREE.Group();
  (Object.hasOwn(builders, kind) ? builders[kind] : builders.box)(g);
  return g;
}
