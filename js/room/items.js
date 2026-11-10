import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canonicalKind } from './placement.js';

// Procedural project objects. Metres, origin = bottom centre, local +z faces the camera. Each item owns its
// materials. Colours are Event Horizon palette hexes (design/spec-v2.md 1.4). Parts flagged userData.noHit are
// ignored for bounds/outlines/shadows (radar fan); userData.noShadow drops animated groups from the shadow bake.
export const KINDS = ['mower', 'pcb', 'thermometer', 'devboard', 'phone', 'chip', 'book', 'box'];

const C = {
  void: 0x050505, dark: 0x141414, sel: 0x2a2a2a, muted: 0x6a6a6a, steel: 0xc8c8c8, white: 0xe0e0e0,
  red: 0xb07c7c, yellow: 0xb4ad8c, orange: 0xb09480, green: 0x8ea889, cyan: 0x8aa5a5, blue: 0x8b9aac,
  paper: 0xd5d3cb,
};
const METAL = 0.35; // spec asks 0.6-0.8, but the room has no env map so high metalness renders near black

const std = (color, { rough = 0.6, metal = 0, glow = 0, emissive = color, opacity = 1, flat = false } = {}) =>
  new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal, flatShading: flat,
    emissive: glow ? emissive : 0x000000, emissiveIntensity: glow,
    transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
  });
const basic = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

/** Adds a mesh at (x,y,z) with optional Euler rotation [rx,ry,rz]. */
function put(parent, geometry, material, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.updateMatrix();
  parent.add(m);
  return m;
}
const box = (parent, [w, h, d], material, pos, rot) => put(parent, new THREE.BoxGeometry(w, h, d), material, pos, rot);
const cyl = (parent, [rt, rb, h, seg = 20], material, pos, rot) => put(parent, new THREE.CylinderGeometry(rt, rb, h, seg), material, pos, rot);
const sphere = (parent, r, material, pos) => put(parent, new THREE.SphereGeometry(r, 12, 8), material, pos);
const group = (parent, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0]) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  parent.add(g);
  return g;
};
/** Wire/cable: tube through points. */
const tube = (parent, points, r, material) =>
  put(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 24, r, 6), material);
/** Side-profile prism: polygon in (z,y), extruded across x by `width`, centred on x=0. */
function prism(points, width) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2); // shape x -> +z
  return geo;
}

const builders = {
  /** Husqvarna-style robot mower: wedge shell, orange chassis band, STOP button, spinning LiDAR puck. */
  mower(g, { animate }) {
    const band = std(C.orange, { rough: 0.6 });
    box(g, [0.5, 0.06, 0.64], band, [0, 0.06, 0]);
    put(g, prism([[-0.31, 0.09], [-0.31, 0.17], [-0.14, 0.22], [0.14, 0.205], [0.31, 0.11], [0.31, 0.09]], 0.44), std(0x404040, { rough: 0.5, flat: true }));
    const tyre = std(C.void, { rough: 0.9 });
    for (const s of [-1, 1]) {
      cyl(g, [0.085, 0.085, 0.05, 24], tyre, [s * 0.265, 0.085, -0.2], [0, 0, Math.PI / 2]);
      cyl(g, [0.035, 0.035, 0.054, 16], std(C.muted, { rough: 0.5 }), [s * 0.265, 0.085, -0.2], [0, 0, Math.PI / 2]);
      cyl(g, [0.03, 0.03, 0.03, 12], tyre, [s * 0.18, 0.03, 0.25], [0, 0, Math.PI / 2]); // front casters
    }
    cyl(g, [0.034, 0.034, 0.008, 20], std(C.dark), [0, 0.221, -0.07]);
    cyl(g, [0.026, 0.026, 0.014, 20], std(C.red, { rough: 0.4, glow: 0.25 }), [0, 0.228, -0.07]); // STOP
    cyl(g, [0.009, 0.009, 0.1, 10], std(C.muted), [0, 0.25, -0.2]); // mast
    cyl(g, [0.05, 0.05, 0.05, 28], std(C.dark, { rough: 0.45 }), [0, 0.325, -0.2]); // puck
    const spin = group(g, [0, 0.33, -0.2]);
    put(spin, new THREE.CylinderGeometry(0.0515, 0.0515, 0.016, 24, 1, true, 0, 2.4), new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan, emissiveIntensity: 1.5, side: THREE.DoubleSide,
    }));
    spin.userData.noShadow = true;
    animate((t) => { spin.rotation.y = -t * Math.PI; }); // 1 rev / 2 s
    cyl(g, [0.004, 0.004, 0.13, 6], std(C.steel), [0.17, 0.27, -0.2], [0, 0, -0.18]); // antenna
    sphere(g, 0.01, std(C.orange, { glow: 0.4 }), [0.1635, 0.335, -0.2]);
  },

  /** ultrasonic-array: PCB on a wire stand, 4x4 MEMS mic grid + transmitter. */
  pcb(g) {
    const wire = std(C.steel, { rough: 0.4, metal: METAL });
    box(g, [0.2, 0.012, 0.03], std(C.dark), [0, 0.006, 0.005]);
    for (const s of [-1, 1]) cyl(g, [0.004, 0.004, 0.145, 6], wire, [s * 0.07, 0.015, -0.07], [Math.atan2(0.14, 0.03), 0, 0]);
    const plate = group(g, [0, 0.03, 0], [-0.61, 0, 0]);
    box(plate, [0.2, 0.2, 0.008], std(0x364034, { rough: 0.6 }), [0, 0.1, 0]);
    const mic = std(C.steel, { rough: 0.35, metal: METAL });
    const hole = std(C.dark);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const p = [(i - 1.5) * 0.034, 0.085 + (j - 1.5) * 0.034, 0.0065];
      box(plate, [0.018, 0.018, 0.005], mic, p);
      box(plate, [0.006, 0.006, 0.0058], hole, [p[0], p[1], 0.0068]); // MEMS port
    }
    cyl(plate, [0.022, 0.022, 0.014, 24], mic, [0, 0.172, 0.011], [Math.PI / 2, 0, 0]); // 40 kHz transmitter
    cyl(plate, [0.018, 0.018, 0.003, 24], std(C.void, { rough: 0.9 }), [0, 0.172, 0.0185], [Math.PI / 2, 0, 0]);
    const pad = std(C.yellow, { rough: 0.3, metal: METAL });
    for (let i = 0; i < 10; i++) box(plate, [0.01, 0.014, 0.002], pad, [(i - 4.5) * 0.017, 0.012, 0.0045]);
    box(plate, [0.07, 0.014, 0.012], std(C.dark), [0.05, 0.03, -0.01]); // FPGA header
    box(g, [0.06, 0.003, 0.15], std(C.dark, { rough: 0.8 }), [0.05, 0.0035, -0.09]); // ribbon off the back
  },

  /** GrillMonitor: enclosure with round gauge, steel probe on a coiled cable, ESP32-C6 board. */
  thermometer(g) {
    const body = std(C.dark, { rough: 0.4 });
    box(g, [0.08, 0.01, 0.05], std(C.sel), [-0.06, 0.005, 0]);
    put(g, new RoundedBoxGeometry(0.12, 0.09, 0.05, 4, 0.01), body, [-0.06, 0.055, 0]);
    put(g, new THREE.CircleGeometry(0.037, 32), std(C.void, { rough: 0.3 }), [-0.06, 0.058, 0.0255]);
    const arc = std(C.orange, { glow: 1.2 });
    put(g, new THREE.TorusGeometry(0.031, 0.0035, 8, 40, Math.PI * 1.5), arc, [-0.06, 0.058, 0.0265], [0, 0, -Math.PI / 4]);
    sphere(g, 0.005, std(C.yellow, { glow: 1.5 }), [-0.06 + 0.031 * Math.cos(1.05), 0.058 + 0.031 * Math.sin(1.05), 0.0275]);
    box(g, [0.022, 0.003, 0.002], std(C.yellow, { glow: 0.9 }), [-0.06, 0.05, 0.0262]); // readout
    for (const s of [-1, 1]) cyl(g, [0.006, 0.006, 0.004, 12], std(C.sel), [-0.06 + s * 0.04, 0.025, 0.0255], [Math.PI / 2, 0, 0]);
    // probe laid on the sill + coiled lead back to the enclosure
    const steel = std(C.steel, { rough: 0.25, metal: METAL });
    cyl(g, [0.0008, 0.0035, 0.2, 10], steel, [0.035, 0.0035, 0.085], [0, 0, -Math.PI / 2]);
    cyl(g, [0.007, 0.007, 0.05, 12], body, [-0.115, 0.007, 0.085], [0, 0, Math.PI / 2]);
    const lead = [];
    for (let s = 0; s <= 1; s += 1 / 36) {
      const a = s * Math.PI * 2 * 4;
      lead.push([-0.1 - 0.03 * s + 0.0, 0.014 + 0.009 * Math.sin(a), 0.03 + 0.055 * s + 0.009 * Math.cos(a)]);
    }
    tube(g, lead, 0.0022, body);
    // ESP32-C6 module
    const esp = group(g, [0.145, 0, 0]);
    box(esp, [0.07, 0.004, 0.035], std(0x2a2e34, { rough: 0.6 }), [0, 0.006, 0]);
    box(esp, [0.024, 0.005, 0.02], std(C.steel, { rough: 0.3, metal: METAL }), [-0.006, 0.0105, 0]);
    box(esp, [0.009, 0.004, 0.009], std(C.steel, { rough: 0.3, metal: METAL }), [-0.0355, 0.010, 0]);
    for (const s of [-1, 1]) box(esp, [0.058, 0.006, 0.003], std(C.dark), [-0.002, 0.011, s * 0.0155]);
    const gold = std(C.yellow, { rough: 0.3, metal: METAL });
    for (let i = 0; i < 5; i++) box(esp, [0.0018, 0.0015, 0.011], gold, [0.0185 + i * 0.0032, 0.0085, i % 2 ? -0.0045 : 0.0045]); // meander antenna
    box(esp, [0.004, 0.002, 0.003], std(C.red, { glow: 1 }), [0.012, 0.0085, 0.012]);
    for (const x of [-0.03, 0.03]) for (const z of [-0.012, 0.012]) box(esp, [0.004, 0.004, 0.004], std(C.dark), [x, 0.002, z]);
  },

  /** STM32 labs: dev board with a servo-mounted HC-SR04 that sweeps, plus a faint radar fan. */
  devboard(g, { animate, reducedMotion }) {
    const pcb = std(C.white, { rough: 0.6 });
    const black = std(C.dark, { rough: 0.5 });
    box(g, [0.16, 0.006, 0.1], pcb, [0, 0.011, 0]);
    for (const x of [-0.07, 0.07]) for (const z of [-0.04, 0.04]) box(g, [0.007, 0.008, 0.007], black, [x, 0.004, z]);
    box(g, [0.034, 0.006, 0.034], black, [-0.03, 0.017, 0.0]);
    box(g, [0.04, 0.002, 0.04], std(C.muted), [-0.03, 0.0145, 0.0]); // pin shadow
    for (const z of [-0.043, 0.043]) {
      box(g, [0.13, 0.01, 0.007], std(C.sel), [0, 0.019, z]);
      for (let i = 0; i < 12; i++) box(g, [0.0035, 0.0005, 0.0035], std(C.steel, { rough: 0.3, metal: METAL }), [(i - 5.5) * 0.0108, 0.0245, z]);
    }
    box(g, [0.014, 0.007, 0.012], std(C.steel, { rough: 0.3, metal: METAL }), [-0.073, 0.0175, 0.0]); // USB
    box(g, [0.014, 0.004, 0.014], black, [-0.06, 0.016, -0.02]); // ST-LINK
    cyl(g, [0.005, 0.005, 0.004, 12], std(C.red, { glow: 0.3 }), [0.02, 0.016, 0.022]); // reset
    box(g, [0.004, 0.002, 0.004], std(C.green, { glow: 1 }), [0.0, 0.015, -0.022]);
    // servo (SG90) + sweeping sensor
    box(g, [0.04, 0.034, 0.02], std(C.blue, { rough: 0.5 }), [0.045, 0.031, -0.01]);
    box(g, [0.056, 0.003, 0.02], std(C.blue, { rough: 0.5 }), [0.045, 0.039, -0.01]);
    const sweep = group(g, [0.045, 0.052, -0.01]);
    cyl(sweep, [0.008, 0.008, 0.01, 16], pcb, [0, -0.002, 0]); // horn
    const sensor = group(sweep, [0, 0.02, 0.014]);
    const sPcb = std(0x2f6fb0, { rough: 0.5 });
    box(sensor, [0.09, 0.04, 0.004], sPcb, [0, 0, 0]);
    const eye = std(C.steel, { rough: 0.3, metal: METAL });
    for (const s of [-1, 1]) {
      cyl(sensor, [0.0155, 0.0155, 0.014, 20], eye, [s * 0.026, 0, 0.009], [Math.PI / 2, 0, 0]);
      cyl(sensor, [0.012, 0.012, 0.002, 20], std(C.void, { rough: 0.9 }), [s * 0.026, 0, 0.0165], [Math.PI / 2, 0, 0]);
    }
    box(sensor, [0.012, 0.008, 0.005], eye, [0, -0.002, 0.004]); // crystal
    box(sensor, [0.03, 0.007, 0.004], black, [0, -0.0235, -0.001]); // pin header
    const fan = put(sweep, new THREE.CircleGeometry(0.3, 40, -Math.PI / 2 - Math.PI / 3, (2 * Math.PI) / 3),
      new THREE.MeshBasicMaterial({ color: C.green, transparent: true, opacity: reducedMotion ? 0.06 : 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      [0, -0.0395, 0], [-Math.PI / 2, 0, 0]);
    fan.userData.noHit = true;
    sweep.userData.noShadow = true;
    animate((t) => { sweep.rotation.y = (Math.PI / 3) * -Math.cos((Math.PI * t) / 4); }); // +-60 deg, 4 s per sweep
  },

  /** Karriarum26: PWA on a phone (checklist + map) next to the folded paper map. */
  phone(g) {
    const slab = std(C.dark, { rough: 0.3 });
    box(g, [0.1, 0.008, 0.075], slab, [-0.045, 0.004, -0.005]);
    const phone = group(g, [-0.045, 0.012, 0.02], [-0.26, 0, 0]);
    put(phone, new RoundedBoxGeometry(0.1, 0.2, 0.01, 3, 0.012), std(C.void, { rough: 0.3 }), [0, 0.1, 0]);
    box(phone, [0.088, 0.186, 0.001], std(0x10141a, { rough: 0.2, glow: 0.35, emissive: C.blue }), [0, 0.1, 0.0052]);
    const ui = group(phone, [0, 0.1, 0.0062]);
    box(ui, [0.06, 0.009, 0.0008], std(C.white, { glow: 0.6 }), [0, 0.078, 0]);
    for (let i = 0; i < 4; i++) {
      const y = 0.052 - i * 0.023;
      box(ui, [0.011, 0.011, 0.0008], i < 2 ? std(C.green, { glow: 0.9 }) : std(C.muted, { glow: 0.4 }), [-0.029, y, 0]);
      box(ui, [0.044 - (i % 2) * 0.012, 0.006, 0.0008], std(C.steel, { glow: 0.5 }), [0.006 - (i % 2) * 0.006, y, 0]);
    }
    box(ui, [0.076, 0.062, 0.0008], std(0x1b2430, { glow: 0.5, emissive: C.blue }), [0, -0.054, 0]);
    for (const [x, y, w, h] of [[-0.022, -0.04, 0.026, 0.02], [0.016, -0.04, 0.03, 0.02], [-0.014, -0.07, 0.04, 0.02], [0.026, -0.07, 0.018, 0.02]]) {
      box(ui, [w, h, 0.0008], std(C.muted, { glow: 0.3 }), [x, y, 0.0005]);
    }
    [[-0.026, -0.036, C.red], [0.02, -0.044, C.cyan], [-0.01, -0.068, C.yellow], [0.03, -0.072, C.green]]
      .forEach(([x, y, c]) => cyl(ui, [0.004, 0.004, 0.003, 10], std(c, { glow: 0.9 }), [x, y, 0.002], [Math.PI / 2, 0, 0]));
    cyl(g, [0.003, 0.003, 0.14, 6], slab, [-0.045, 0.07, -0.05], [-0.4, 0, 0]);
    // folded 3-panel map
    const paper = std(C.paper, { rough: 0.9 });
    const ink = std(C.sel, { rough: 0.9 });
    const map = group(g, [0.095, 0, 0.0]);
    [-1, 0, 1].forEach((i) => {
      const panel = group(map, [i * 0.043, 0, 0], [0, i === 0 ? 0.55 : -0.55, 0]);
      box(panel, [0.05, 0.12, 0.002], paper, [0, 0.06, 0]);
      box(panel, [0.03, 0.02, 0.0014], ink, [-0.005, 0.085, 0.0015]);
      box(panel, [0.012, 0.03, 0.0014], ink, [0.012, 0.05, 0.0015]);
      box(panel, [0.026, 0.014, 0.0014], ink, [-0.008, 0.03, 0.0015]);
    });
    [[-0.02, 0.098, C.red], [0.0, 0.07, C.cyan], [0.02, 0.1, C.yellow], [0.044, 0.05, C.green]]
      .forEach(([x, y, c]) => sphere(map, 0.006, std(c, { glow: 0.3 }), [x, y, 0.014]));
  },

  /** enchip: oversized DIP-16 on a clear acrylic wedge stand. */
  chip(g) {
    const acrylic = std(C.white, { opacity: 0.25, rough: 0.1 });
    box(g, [0.2, 0.008, 0.11], acrylic, [0, 0.004, 0.0]);
    for (const s of [-1, 1]) put(g, prism([[-0.045, 0.008], [0.045, 0.008], [-0.045, 0.05]], 0.008), acrylic, [s * 0.085, 0, 0]);
    const chip = group(g, [0, 0.033, 0], [0.44, 0, 0]);
    box(chip, [0.16, 0.03, 0.07], std(C.dark, { rough: 0.4 }), [0, 0.015, 0]);
    const legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
      const x = (i - 3.5) * 0.0195;
      legs.push(new THREE.BoxGeometry(0.006, 0.003, 0.012).translate(x, 0.012, s * 0.041));
      legs.push(new THREE.BoxGeometry(0.006, 0.026, 0.003).translate(x, 0, s * 0.0465));
    }
    put(chip, mergeGeometries(legs), std(C.steel, { rough: 0.4, metal: METAL }));
    cyl(chip, [0.006, 0.006, 0.002, 16], std(C.sel), [-0.062, 0.0305, 0.024]); // pin-1 dimple
    put(chip, new THREE.CylinderGeometry(0.012, 0.012, 0.002, 16, 1, false, 0, Math.PI), std(C.sel), [-0.08, 0.0305, 0]); // notch
    box(chip, [0.11, 0.0006, 0.0016], std(0xf0f0f0, { glow: 0.4 }), [0.01, 0.0304, -0.004]); // laser line
    [[0.07, -0.016], [0.05, 0.016], [0.03, 0.026]].forEach(([w, z]) => box(chip, [w, 0.0004, 0.004], std(C.muted, { rough: 0.5 }), [0.02, 0.0303, z]));
  },

  /** Elektriska-gr: textbook with a breadboard (LEDs + jumper wires) lying on it. */
  book(g) {
    const cover = std(0x5a4e5c, { rough: 0.8 });
    box(g, [0.2, 0.005, 0.15], cover, [0, 0.0025, 0]);
    box(g, [0.2, 0.005, 0.15], cover, [0, 0.0405, 0]);
    box(g, [0.19, 0.032, 0.14], std(C.paper, { rough: 0.9 }), [0.003, 0.021, 0.0]);
    box(g, [0.006, 0.043, 0.15], cover, [-0.097, 0.0215, 0]);
    for (const y of [0.01, 0.033]) box(g, [0.007, 0.003, 0.151], std(C.yellow, { rough: 0.5 }), [-0.0975, y, 0]);
    box(g, [0.08, 0.001, 0.03], std(C.paper, { rough: 0.9 }), [0.04, 0.043, -0.04]); // title label
    const bb = group(g, [0.005, 0.043, 0.015], [0, 0.18, 0]);
    box(bb, [0.17, 0.011, 0.065], std(C.white, { rough: 0.7 }), [0, 0.0055, 0]);
    for (const [z, c] of [[-0.0265, C.blue], [-0.0225, C.red], [0.0225, C.blue], [0.0265, C.red]]) box(bb, [0.15, 0.0008, 0.0032], std(c, { rough: 0.7 }), [0, 0.0114, z]);
    box(bb, [0.15, 0.0008, 0.005], std(C.muted, { rough: 0.7 }), [0, 0.0114, 0]); // centre trench
    const holes = [];
    for (let i = 0; i < 24; i++) for (const z of [-0.0145, -0.0085, 0.0085, 0.0145]) holes.push(new THREE.BoxGeometry(0.0035, 0.0008, 0.0035).translate((i - 11.5) * 0.0063, 0.0115, z));
    put(bb, mergeGeometries(holes), std(C.sel, { rough: 0.8 }));
    [[-0.04, C.red], [-0.012, C.yellow], [0.02, C.green]].forEach(([x, c]) => {
      cyl(bb, [0.0045, 0.0045, 0.004, 12], std(c, { rough: 0.3, opacity: 0.9 }), [x, 0.0132, 0.0115]);
      sphere(bb, 0.0045, std(c, { rough: 0.3, glow: 0.8 }), [x, 0.0152, 0.0115]);
    });
    box(bb, [0.02, 0.005, 0.011], std(C.dark), [0.06, 0.0138, 0]); // DIP-8
    [[-0.05, 0.0, 0.025, C.red], [0.03, 0.0, 0.05, C.blue], [0.0, 0.02, 0.035, C.yellow], [-0.075, 0.0, 0.0, C.red]].forEach(([a, b, h, c], i) => {
      const x0 = -0.065 + i * 0.045;
      tube(bb, [[x0, 0.012, -0.0145], [x0 + 0.02, 0.012 + 0.028, -0.0145 + (i % 2 ? 0.012 : -0.004)], [x0 + 0.04, 0.012, i % 2 ? 0.0085 : -0.0085]], 0.0016, std(c, { rough: 0.6 }));
    });
  },

  /** Fallback: dark cube with a cold-white LED edge on top. */
  box(g) {
    box(g, [0.15, 0.15, 0.15], std(C.sel, { rough: 0.6 }), [0, 0.075, 0]);
    const led = basic(0xf5f5f5);
    for (const s of [-1, 1]) {
      box(g, [0.152, 0.006, 0.006], led, [0, 0.15, s * 0.072]);
      box(g, [0.006, 0.006, 0.152], led, [s * 0.072, 0.15, 0]);
    }
    box(g, [0.06, 0.03, 0.002], std(C.paper, { rough: 0.9 }), [0, 0.07, 0.0755]); // label
  },
};

/**
 * Builds the object for `kind` (aliases board->pcb, robot->mower; unknown -> box).
 * Animated items get userData.tick(timeSeconds); under reducedMotion nothing is animated.
 */
export function makeItem(kind, { reducedMotion = false } = {}) {
  const g = new THREE.Group();
  const key = canonicalKind(kind);
  g.name = `item-${key}`;
  builders[key](g, {
    reducedMotion,
    animate(fn) { if (!reducedMotion) { g.userData.tick = fn; g.userData.animated = true; } },
  });
  return g;
}
