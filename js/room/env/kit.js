import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Shared building blocks for the room environment (metres, Y up). Palette = Event Horizon hexes (design/spec-v2.md §1.4).
export const C = {
  void: 0x000000, bg: 0x050505, dark: 0x141414, sel: 0x2a2a2a, muted: 0x6a6a6a,
  fg: 0xc8c8c8, light: 0xe0e0e0, bright: 0xf5f5f5,
  red: 0xb07c7c, yellow: 0xb4ad8c, orange: 0xb09480, green: 0x8ea889, cyan: 0x8aa5a5, blue: 0x8b9aac, magenta: 0xa48da8,
  floorA: 0x615146, floorB: 0x54473d, navy: 0x272b30, wallWhite: 0x929292, wood: 0xb19d84,
  leafA: 0x5c6d59, leafB: 0x404c3e, bulb: 0xcbc6b1, scooter: 0xabb5c2, paper: 0xd5d3cb,
};

const cache = new Map();

/** Cached MeshStandardMaterial so merge() can fold meshes that share a look into one draw call. */
export function mat(color, { rough = 0.7, metal = 0, emissive = 0x000000, glow = 0, ...rest } = {}) {
  const key = JSON.stringify([color, rough, metal, emissive, glow, rest]);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: glow, ...rest }));
  }
  return cache.get(key);
}

export function basic(color, rest = {}) {
  const key = `b${JSON.stringify([color, rest])}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color, ...rest }));
  return cache.get(key);
}

const bevelCache = new Map();
/** Chamfered box: a rectangle extruded with a 1-segment bevel, so edges catch a highlight. */
function bevelGeometry(w, h, d, b) {
  const key = `${w}|${h}|${d}|${b}`;
  if (!bevelCache.has(key)) {
    const s = new THREE.Shape();
    s.moveTo(-(w - 2 * b) / 2, -(h - 2 * b) / 2);
    s.lineTo((w - 2 * b) / 2, -(h - 2 * b) / 2);
    s.lineTo((w - 2 * b) / 2, (h - 2 * b) / 2);
    s.lineTo(-(w - 2 * b) / 2, (h - 2 * b) / 2);
    s.closePath();
    const depth = d - 2 * b;
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 1, steps: 1 });
    g.translate(0, 0, -depth / 2);
    bevelCache.set(key, g);
  }
  return bevelCache.get(key);
}

export function geoBox(w, h, d, bev = 0.004) {
  const b = Math.min(bev, w / 2.5, h / 2.5, d / 2.5);
  return b < 0.0012 ? new THREE.BoxGeometry(w, h, d) : bevelGeometry(w, h, d, b);
}

/** Bevelled box mesh centred at x,y,z. bev=0 gives a plain BoxGeometry. */
export function box(parent, w, h, d, material, x, y, z, bev = 0.004) {
  const m = new THREE.Mesh(geoBox(w, h, d, bev), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function cyl(parent, rt, rb, h, material, x, y, z, { seg = 16, rx = 0, rz = 0, ry = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

export function ball(parent, r, material, x, y, z, { sx = 1, sy = 1, sz = 1, w = 14, h = 10 } = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

export function named(name, parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Fold every plain mesh under `group` into one mesh per material (draw-call budget). Skips userData.keep. */
export function merge(group, { cast = false, receive = true } = {}) {
  group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const doomed = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    doomed.push(o);
  });
  for (const o of doomed) o.parent.remove(o);
  for (const [material, geos] of buckets) {
    const m = new THREE.Mesh(mergeGeometries(geos), material);
    m.castShadow = cast;
    m.receiveShadow = receive;
    group.add(m);
  }
  return group;
}

/** Soft additive glow quad: only the centre vertex is bright, so it fades to black at the edges. */
export function glowPlane(w, h, color, opacity) {
  const g = new THREE.PlaneGeometry(w, h, 2, 2);
  const c = new THREE.Color(color);
  const colors = [];
  for (let i = 0; i < 9; i++) (i === 4 ? colors.push(c.r, c.g, c.b) : colors.push(0, 0, 0));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.renderOrder = 2;
  m.userData.keep = true; // vertex colours must survive merge()
  return m;
}

/** Dark contact shadow: three stacked translucent discs fake a soft radial falloff (no shader). */
export function blob(parent, r, x, z, opacity = 0.4) {
  const m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: opacity / 2.2, depthWrite: false });
  [1, 0.72, 0.44].forEach((k, i) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(r * k, 24), m);
    d.rotation.x = -Math.PI / 2;
    d.position.set(x, 0.004 + i * 0.0005, z);
    d.renderOrder = 1;
    parent.add(d);
  });
}

/** InstancedMesh from [{x,y,z,rx,ry,rz,sx,sy,sz,color} | {m: Matrix4, color}] (matrices baked once). */
export function instances(geometry, material, list, { cast = false } = {}) {
  const im = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  list.forEach((t, i) => {
    if (t.m) m.copy(t.m);
    else {
      e.set(t.rx || 0, t.ry || 0, t.rz || 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1));
    }
    im.setMatrixAt(i, m);
    if (t.color !== undefined) im.setColorAt(i, new THREE.Color(t.color));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = cast;
  im.receiveShadow = true;
  im.computeBoundingSphere();
  return im;
}

/** Deterministic PRNG so the room looks identical every load. */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
