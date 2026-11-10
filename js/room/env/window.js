import * as THREE from 'three';
import { C, mat, basic, box, cyl, ball, named, merge, instances, glowPlane, rng } from './kit.js';
import { WIN } from './shell.js';

const WX = 2.0; // right wall inner face

/** Casement window, night sky + black hole, sheer curtains, sill. Returns a per-frame update for the disc. */
export function buildWindow(root, { reducedMotion }) {
  const g = named('window', root);
  const white = mat(C.light, { rough: 0.6 });
  const { z0, z1, y0, y1 } = WIN;
  const cx = WX - 0.03, t = 0.05;
  const zc = (z0 + z1) / 2, yc = (y0 + y1) / 2, mid = -0.2;
  box(g, 0.06, t, z1 - z0 + 0.1, white, cx, y1 - t / 2 + 0.02, zc, 0.006);
  box(g, 0.06, t, z1 - z0 + 0.1, white, cx, y0 + t / 2 - 0.02, zc, 0.006);
  for (const z of [z0 - 0.025 + 0.0, z1 + 0.025]) box(g, 0.06, y1 - y0 + 0.04, t, white, cx, yc, z, 0.006);
  for (const [a, b] of [[z0, mid], [mid, z1]]) { // two casements
    const w = b - a, m = (a + b) / 2, ct = 0.035;
    box(g, 0.04, ct, w, white, cx - 0.01, y1 - 0.04 - ct / 2, m, 0.004);
    box(g, 0.04, ct, w, white, cx - 0.01, y0 + 0.04 + ct / 2, m, 0.004);
    box(g, 0.04, y1 - y0 - 0.08, ct, white, cx - 0.01, yc, a + ct / 2, 0.004);
    box(g, 0.04, y1 - y0 - 0.08, ct, white, cx - 0.01, yc, b - ct / 2, 0.004);
    box(g, 0.02, 0.012, 0.09, mat(C.fg, { rough: 0.3, metal: 0.6 }), cx - 0.04, yc, b - 0.07, 0.003); // handle
  }
  box(g, 0.26, 0.04, 1.62, white, WX - 0.12, 0.9, zc, 0.006); // sill
  box(g, 0.01, 0.012, 1.62, basic(C.bright), WX - 0.255, 0.912, zc, 0); // sill LED lip catches the light
  merge(g);

  // Night outside: black backdrop, stars, black hole with tilted accretion disc.
  const sky = named('window-sky', g);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), basic(C.void));
  back.rotation.y = -Math.PI / 2;
  back.position.set(WX + 0.7, 1.6, 0);
  sky.add(back);
  const rand = rng(5);
  const pos = [], col = [];
  const star = new THREE.Color(C.light), warm = new THREE.Color(C.yellow);
  for (let i = 0; i < 240; i++) {
    pos.push(WX + 0.6, 0.7 + rand() * 1.65, -1.7 + rand() * 2.9);
    const c = rand() < 0.15 ? warm : star;
    const k = 0.45 + rand() * 0.55;
    col.push(c.r * k, c.g * k, c.b * k);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  sky.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true })));

  const bh = named('blackhole', sky, WX + 0.5, 1.82, -0.55);
  const face = new THREE.Group();
  face.rotation.y = -Math.PI / 2; // local +z -> towards the room (-x)
  bh.add(face);
  face.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), basic(C.void)));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.007, 8, 64), basic(C.bright));
  ring.position.z = 0.02;
  face.add(ring);
  const halo = glowPlane(1.3, 1.0, C.orange, 0.55);
  halo.position.z = -0.02;
  face.add(halo);
  const spin = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.x = 1.31; // 75 degrees
  tilt.add(spin);
  face.add(tilt);
  const disc = new THREE.RingGeometry(0.2, 0.48, 72, 3);
  const dc = [], hot = new THREE.Color(0xe8d6b4), cool = new THREE.Color(0xb09480);
  for (let i = 0; i < disc.attributes.position.count; i++) {
    const x = disc.attributes.position.getX(i), y = disc.attributes.position.getY(i);
    const r = Math.hypot(x, y), fade = Math.max(0, 1 - (r - 0.2) / 0.28) ** 1.4;
    const doppler = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(Math.atan2(y, x) - 0.6));
    const c = cool.clone().lerp(hot, fade);
    dc.push(c.r * fade * doppler, c.g * fade * doppler, c.b * fade * doppler);
  }
  disc.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
  spin.add(new THREE.Mesh(disc, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));

  buildCurtains(g);
  return { update: reducedMotion ? null : (dt) => { spin.rotation.z += (dt * Math.PI * 2) / 60; } };
}

function zigzag(z0, z1, yA, yB, folds, amp) {
  const geo = new THREE.PlaneGeometry(z1 - z0, yB - yA, folds * 2, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ix = Math.round(((p.getX(i) + (z1 - z0) / 2) / (z1 - z0)) * folds * 2);
    p.setZ(i, (ix % 2 ? amp : -amp) * (1 - 0.35 * ((p.getY(i) + (yB - yA) / 2) / (yB - yA))));
  }
  geo.rotateY(-Math.PI / 2);
  geo.translate(WX - 0.1, (yA + yB) / 2, (z0 + z1) / 2);
  geo.computeVertexNormals();
  return geo;
}

function buildCurtains(parent) {
  const g = named('curtains', parent);
  const m = mat(C.light, { rough: 1, flatShading: true, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  for (const [a, b] of [[-1.2, -0.85], [0.42, 0.78]]) {
    const c = new THREE.Mesh(zigzag(a, b, 0.25, 2.4, 6, 0.035), m);
    c.renderOrder = 5;
    g.add(c);
  }
  const rod = mat(C.sel, { rough: 0.4, metal: 0.5 });
  cyl(g, 0.008, 0.008, 2.2, rod, WX - 0.1, 2.44, -0.2, { rx: Math.PI / 2, seg: 8 });
  for (const z of [-1.3, 0.9]) ball(g, 0.017, rod, WX - 0.1, 2.44, z, { w: 8, h: 6 });
  const rings = [];
  for (const [a, b] of [[-1.2, -0.85], [0.42, 0.78]]) for (let i = 0; i < 7; i++) rings.push({ x: WX - 0.1, y: 2.44, z: a + ((b - a) * i) / 6, ry: Math.PI / 2 });
  g.add(instances(new THREE.TorusGeometry(0.014, 0.003, 5, 10), rod, rings));
}

/** Panel radiator: 12 instanced fins + top grille + valve. */
export function buildRadiator(root) {
  const g = named('radiator', root);
  const m = mat(C.light, { rough: 0.6 });
  const fins = [];
  for (let i = 0; i < 12; i++) fins.push({ x: WX - 0.07, y: 0.45, z: -0.745 + i * 0.1 });
  g.add(instances(new THREE.BoxGeometry(0.07, 0.6, 0.075), m, fins));
  box(g, 0.11, 0.025, 1.22, m, WX - 0.07, 0.765, -0.2, 0.004);
  box(g, 0.09, 0.03, 1.2, m, WX - 0.07, 0.15, -0.2, 0.004);
  box(g, 0.025, 0.58, 0.012, mat(C.fg, { rough: 0.5 }), WX - 0.1, 0.45, 0.405, 0.002);
  box(g, 0.035, 0.035, 0.05, mat(C.fg, { rough: 0.4, metal: 0.5 }), WX - 0.1, 0.15, 0.43, 0.004); // valve
  box(g, 0.012, 0.012, 1.2, basic(C.bright), WX - 0.126, 0.778, -0.2, 0); // top edge catches light
  merge(g);
}

/** Light-blue Vespa model on the sill (decor, scooter). */
export function buildScooter(root) {
  const g = named('scooter', root, 1.88, 0.92, -0.45);
  const body = mat(0xa6b8cc, { rough: 0.45, metal: 0.1 });
  const dark = mat(C.dark, { rough: 0.7 });
  const chrome = mat(C.fg, { rough: 0.25, metal: 0.8 });
  box(g, 0.07, 0.012, 0.13, body, 0, 0.034, 0.0, 0.002); // floorboard
  box(g, 0.08, 0.07, 0.1, body, 0, 0.07, -0.075, 0.008); // rear cowl
  ball(g, 0.042, body, 0, 0.075, -0.105, { sy: 0.9, sz: 1.1, w: 10, h: 8 });
  const shield = box(g, 0.078, 0.1, 0.014, body, 0, 0.09, 0.062, 0.004);
  shield.rotation.x = -0.25;
  box(g, 0.05, 0.012, 0.056, body, 0, 0.066, 0.12, 0.003); // fender
  box(g, 0.062, 0.02, 0.09, dark, 0, 0.12, -0.05, 0.006); // seat
  box(g, 0.012, 0.06, 0.012, chrome, 0, 0.145, 0.07, 0.002);
  box(g, 0.085, 0.01, 0.014, dark, 0, 0.178, 0.07, 0.003); // handlebar
  ball(g, 0.016, mat(C.bright, { rough: 0.3, emissive: C.bright, glow: 0.3 }), 0, 0.166, 0.092, { w: 8, h: 6 });
  for (const z of [0.115, -0.1]) {
    cyl(g, 0.03, 0.03, 0.022, dark, 0, 0.03, z, { rz: Math.PI / 2, seg: 14 });
    cyl(g, 0.012, 0.012, 0.025, chrome, 0, 0.03, z, { rz: Math.PI / 2, seg: 8 });
  }
  merge(g, { cast: true });
  g.rotation.y = 0.0;
}
