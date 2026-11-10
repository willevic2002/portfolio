import * as THREE from 'three';
import { C, mat, basic, box, named, merge, instances, glowPlane, rng } from './kit.js';

const X0 = -2.0, X1 = 2.0, Z0 = -1.8, Z1 = 1.8, H = 2.6, T = 0.08;
export const WIN = { z0: -0.9, z1: 0.5, y0: 0.95, y1: 2.2 };

/** Floor slab + staggered plank rows (InstancedMesh) + back/right walls (window hole) + skirting + panel seams. */
export function buildShell(root, led) {
  const floor = named('floor', root);
  box(floor, X1 - X0 + T, 0.1, Z1 - Z0 + T, mat(C.dark, { rough: 1 }), (X0 + X1 + T) / 2, -0.05, (Z0 + Z1 - T) / 2, 0);
  merge(floor);
  const rand = rng(11);
  const rows = [];
  for (let i = 0, z = Z0 + 0.09; z < Z1; i++, z += 0.18) {
    const joint = -1.1 + rand() * 2.2;
    const tone = (a, b) => new THREE.Color(i % 2 ? a : b).offsetHSL(0, 0, (rand() - 0.5) * 0.03);
    rows.push({ x: (X0 + joint) / 2, y: 0.002, z, sx: joint - X0, sy: 0.012, sz: 0.172, color: tone(C.floorA, C.floorB) });
    rows.push({ x: (joint + X1 + T) / 2, y: 0.002, z, sx: X1 + T - joint, sy: 0.012, sz: 0.172, color: tone(C.floorB, C.floorA) });
  }
  floor.add(instances(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { rough: 0.8 }), rows));

  const back = named('backwall', root);
  box(back, X1 - X0 + T, H, T, mat(C.navy, { rough: 0.95 }), (X0 + X1 + T) / 2, H / 2, Z0 - T / 2, 0);
  const seam = mat(0x1e2226, { rough: 1 });
  for (let x = -1.5; x < 2; x += 0.5) box(back, 0.005, H - 0.07, 0.004, seam, x, H / 2 + 0.035, Z0 + 0.001, 0); // acoustic-panel seams
  box(back, X1 - X0, 0.07, 0.014, mat(C.light, { rough: 0.6 }), 0, 0.035, Z0 + 0.007);
  merge(back);

  const wall = named('wall-right', root);
  const w = mat(C.wallWhite, { rough: 0.9 });
  const cx = X1 + T / 2;
  const slab = (za, zb, ya, yb) => box(wall, T, yb - ya, zb - za, w, cx, (ya + yb) / 2, (za + zb) / 2, 0);
  slab(Z0 - T, WIN.z0, 0, H);
  slab(WIN.z1, Z1, 0, H);
  slab(WIN.z0, WIN.z1, 0, WIN.y0);
  slab(WIN.z0, WIN.z1, WIN.y1, H);
  box(wall, 0.014, 0.07, Z1 - Z0, mat(C.light, { rough: 0.6 }), X1 - 0.007, 0.035, (Z0 + Z1) / 2);
  merge(wall);

  // Event-horizon outline: cold-white light edges on every cut-away edge.
  const e = basic(C.bright);
  const edge = (w, h, d, x, y, z) => box(led, w, h, d, e, x, y, z, 0);
  edge(X1 - X0 + T, 0.008, 0.03, (X0 + X1 + T) / 2, H + 0.002, Z0 - T / 2);
  edge(0.03, 0.008, Z1 - Z0 + T, X1 + T / 2, H + 0.002, (Z0 + Z1 - T) / 2);
  edge(0.008, H, 0.05, X0 - 0.003, H / 2, Z0 - T / 2);
  edge(0.05, H, 0.008, X1 + T / 2, H / 2, Z1 + 0.003);
  edge(X1 - X0 + T, 0.012, 0.01, (X0 + X1 + T) / 2, -0.006, Z1 + 0.004);
  edge(0.01, 0.012, Z1 - Z0 + T, X0 - 0.004, -0.006, (Z0 + Z1 - T) / 2);
}

/** Photon-ring rug: black disc, white ring, accretion halo, hairline outer ring. */
export function buildRug(root) {
  const rug = named('rug', root, 0.3, 0.012, 0.45);
  const flat = (geo, m) => { const o = new THREE.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.receiveShadow = true; rug.add(o); return o; };
  flat(new THREE.CircleGeometry(0.9, 64), mat(C.bg, { rough: 1 }));
  flat(new THREE.RingGeometry(0.2, 0.3, 48), mat(C.void, { rough: 1 })).position.y = 0.001;

  const halo = new THREE.RingGeometry(0.62, 0.84, 64, 1);
  const inner = new THREE.Color(0xb2a086), colors = [];
  for (let i = 0; i < halo.attributes.position.count; i++) {
    const r = Math.hypot(halo.attributes.position.getX(i), halo.attributes.position.getY(i));
    const k = Math.max(0, 1 - (r - 0.62) / 0.22);
    colors.push(inner.r * k, inner.g * k, inner.b * k);
  }
  halo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const h = flat(halo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  h.position.y = 0.002;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.008, 6, 96), basic(C.bright));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.003;
  rug.add(ring);
  flat(new THREE.RingGeometry(0.875, 0.885, 96), basic(C.muted)).position.y = 0.002;
  flat(new THREE.RingGeometry(0.34, 0.345, 64), basic(C.muted)).position.y = 0.002;
}

/** Catenary string lights along the back wall top: wire + InstancedMesh bulbs + additive halos. */
export function buildStringLights(root) {
  const g = named('stringlights', root);
  const wire = mat(C.dark, { rough: 1 });
  const bulbs = [];
  const sag = (x0, x1, n) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, 2.42 - 0.14 * 4 * t * (1 - t), Z0 + 0.06));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.004, 4), wire));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      bulbs.push({ x: x0 + (x1 - x0) * t, y: 2.42 - 0.14 * 4 * t * (1 - t) - 0.035, z: Z0 + 0.06 });
    }
  };
  sag(-1.9, 0, 11);
  sag(0, 1.9, 11);
  g.add(instances(new THREE.SphereGeometry(0.026, 10, 8), basic(C.bulb), bulbs));
  const halo = instances(new THREE.SphereGeometry(0.075, 10, 8), basic(C.yellow, { transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }), bulbs);
  halo.renderOrder = 3;
  g.add(halo);
  const cap = mat(C.sel, { rough: 0.6 });
  g.add(instances(new THREE.CylinderGeometry(0.01, 0.012, 0.025, 8), cap, bulbs.map((b) => ({ ...b, y: b.y + 0.03 }))));
}

/** Framed event-horizon print on the back wall. */
export function buildPrint(root) {
  const g = named('print', root, -0.8, 2.0, Z0 + 0.012);
  box(g, 0.52, 0.38, 0.024, mat(C.dark, { rough: 0.5 }), 0, 0, 0);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.32), mat(C.void, { rough: 1 }));
  paper.position.z = 0.0125;
  g.add(paper);
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.0035, 6, 48), basic(C.bright));
  r1.position.z = 0.014;
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.0022, 6, 48), basic(C.orange));
  r2.position.z = 0.014;
  r2.scale.y = 0.28;
  r2.rotation.z = -0.2;
  g.add(r1, r2);
  const glow = glowPlane(0.34, 0.24, C.orange, 0.5);
  glow.position.z = 0.0135;
  g.add(glow);
  merge(g);
}
