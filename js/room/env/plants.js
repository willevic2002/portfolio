import * as THREE from 'three';
import { C, mat, cyl, named, merge, instances, blob, rng } from './kit.js';

const leafGeo = new THREE.SphereGeometry(1, 5, 3); // pointy low-poly leaf once scaled (long axis = local z)
const leafMat = mat(0xffffff, { rough: 0.85, flatShading: true });
const probe = new THREE.Object3D();

/** One leaf matrix at `base`, pointing along `dir`, length len, width wid. */
function leaf(base, dir, len, wid, color) {
  probe.position.copy(base).addScaledVector(dir, len * 0.5);
  probe.up.set(0, 1, 0);
  probe.lookAt(base.clone().add(dir));
  probe.scale.set(wid, 0.014, len * 0.5);
  probe.updateMatrix();
  return { m: probe.matrix.clone(), color };
}

const tone = (r) => new THREE.Color(r() < 0.5 ? C.leafA : C.leafB).offsetHSL(0, 0, (r() - 0.5) * 0.04);

function pot(g, r, h, x, z, material) {
  cyl(g, r, r * 0.72, h, material, x, h / 2, z, { seg: 14 });
  cyl(g, r * 1.04, r * 1.04, 0.015, material, x, h, z, { seg: 14 });
  cyl(g, r * 0.92, r * 0.92, 0.006, mat(0x1a1510, { rough: 1 }), x, h + 0.004, z, { seg: 14 });
}

/** Tall low-poly fiddle-leaf fig in the back-right corner, 1.1 m. */
export function buildPlant(root) {
  const g = named('plant', root, 1.7, 0, -1.55);
  pot(g, 0.17, 0.3, 0, 0, mat(C.sel, { rough: 0.8 }));
  const spine = new THREE.CatmullRomCurve3([[0, 0.3, 0], [0.05, 0.6, 0.02], [0.0, 0.88, -0.02], [-0.05, 1.1, 0.01]].map((p) => new THREE.Vector3(...p)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(spine, 12, 0.012, 5), mat(0x4a3d33, { rough: 0.9 })));
  const r = rng(21);
  const list = [];
  for (let i = 0; i < 40; i++) {
    const t = 0.18 + (i / 40) * 0.82;
    const base = spine.getPoint(t);
    const a = i * 2.399 + r();
    const pitch = 0.35 + (1 - t) * 0.25 + r() * 0.15;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(pitch), Math.sin(pitch), Math.sin(a) * Math.cos(pitch));
    if (i > 34) dir.set(0, 1, 0).add(new THREE.Vector3(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3)).normalize();
    list.push(leaf(base, dir, 0.2 + r() * 0.07 - (t > 0.9 ? 0.07 : 0), 0.075 + r() * 0.02, tone(r)));
  }
  g.add(instances(leafGeo, leafMat, list, { cast: true }));
  blob(g, 0.34, 0, 0, 0.5);
  merge(g, { cast: true });
  return g;
}

/** Trailing vine down the right side of the bookshelf + its pot on top. */
export function buildVine(root, topY) {
  const g = named('plant-shelf', root, 1.3, topY, -1.62);
  pot(g, 0.055, 0.085, 0, 0, mat(C.paper, { rough: 0.8 }));
  const r = rng(33);
  const path = [[0, 0.07, 0.1], [0.08, 0.08, 0.12], [0.16, 0.05, 0.14], [0.2, -0.05, 0.16], [0.2, -0.2, 0.17], [0.205, -0.35, 0.17], [0.2, -0.5, 0.16], [0.21, -0.65, 0.17], [0.2, -0.75, 0.16]].map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(path);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.004, 4), mat(0x3f4a3c, { rough: 0.9 })));
  const list = [];
  for (let i = 0; i < 30; i++) {
    const t = i / 30;
    const p = curve.getPoint(t);
    const side = i % 2 ? 1 : -1;
    list.push(leaf(p, new THREE.Vector3(side * 0.7, -0.3 + r() * 0.2, 0.55).normalize(), 0.06 + r() * 0.02, 0.028, tone(r)));
  }
  for (let i = 0; i < 9; i++) { // crown
    const a = (i / 9) * Math.PI * 2;
    list.push(leaf(new THREE.Vector3(0, 0.09, 0), new THREE.Vector3(Math.cos(a) * 0.8, 0.7, Math.sin(a) * 0.8).normalize(), 0.1, 0.04, tone(r)));
  }
  g.add(instances(leafGeo, leafMat, list, { cast: true }));
  merge(g, { cast: true });
  return g;
}

/** Tiny succulent rosette for shelves. */
export function succulent(parent, x, y, z) {
  const g = named('succulent', parent, x, y, z);
  pot(g, 0.03, 0.045, 0, 0, mat(C.light, { rough: 0.7 }));
  const r = rng(Math.floor(x * 100 + 9));
  const list = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    list.push(leaf(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(Math.cos(a), 0.9, Math.sin(a)).normalize(), 0.055, 0.02, tone(r)));
  }
  g.add(instances(leafGeo, leafMat, list));
  merge(g);
}
