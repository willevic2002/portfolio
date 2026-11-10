import * as THREE from 'three';
import { C, mat, basic, box, cyl, named, merge, glowPlane, rng } from './kit.js';
import { succulent } from './plants.js';

const TOP = { wall: 1.55 + 0.015, book: 1.78 + 0.015 };
export const BOARDS = [0.46, 0.9, 1.34, 1.78]; // bookshelf boards above the plinth board at 0.02

const BOOK = [C.red, C.cyan, C.yellow, C.green, C.blue, C.magenta, C.paper, C.orange, C.sel, 0xd8d8d8];

/** Row of standing books from x going `dir` (+1/-1), a leaning last one. */
function books(g, x, y, z, n, dir, r) {
  let cx = x;
  for (let i = 0; i < n; i++) {
    const w = 0.022 + r() * 0.022, h = 0.18 + r() * 0.1, d = 0.15 + r() * 0.06;
    const m = mat(BOOK[Math.floor(r() * BOOK.length)], { rough: 0.8 });
    const last = i === n - 1 && n > 2;
    const b = box(g, w, h, d, m, cx + dir * (w / 2), y + h / 2, z, 0.002);
    if (last) { b.rotation.z = -dir * 0.22; b.position.y -= 0.004; cx += dir * 0.05; }
    box(g, w * 0.6, 0.02, 0.004, mat(C.paper, { rough: 0.9 }), cx + dir * (w / 2), y + h * 0.62, z + d / 2 + 0.001, 0); // spine label
    cx += dir * (w + 0.004);
  }
}

/** Floating wood board with brackets, LED underside + cold glow on the wall. */
function buildWallShelf(g, led) {
  const z = -1.69;
  box(g, 1.2, 0.03, 0.22, mat(C.wood, { rough: 0.7 }), -0.8, 1.55, z, 0.005);
  const white = mat(C.light, { rough: 0.6 });
  for (const x of [-1.3, -0.3]) {
    box(g, 0.03, 0.15, 0.01, white, x, 1.47, -1.795, 0.002);
    box(g, 0.03, 0.012, 0.2, white, x, 1.528, -1.7, 0.002);
  }
  box(led, 1.16, 0.006, 0.008, basic(C.bright), -0.8, 1.531, -1.584, 0);
  const glow = glowPlane(1.6, 0.5, C.bright, 0.22);
  glow.position.set(-0.8, 1.38, -1.797);
  g.add(glow);
  const r = rng(3);
  books(g, -1.38, TOP.wall, z, 4, 1, r);
  succulent(g, -0.24, TOP.wall, z + 0.03);
}

/** Open black bookshelf: 4 cubbies + top, LED fronts, glow behind each cubby, decor books/boxes. */
function buildBookshelf(g, led) {
  const black = mat(C.dark, { rough: 0.45 });
  const cx = 1.0, zc = -1.625;
  for (const x of [0.565, 1.435]) box(g, 0.03, 1.8, 0.35, black, x, 0.9, zc, 0.004);
  for (const y of [0.02, ...BOARDS]) box(g, 0.84, 0.03, 0.35, black, cx, y, zc, 0.004);
  box(g, 0.9, 0.06, 0.37, mat(C.bg, { rough: 0.6 }), cx, 0.03, zc + 0.01, 0.004); // plinth
  box(g, 0.84, 1.76, 0.01, mat(0x1c1c1c, { rough: 0.9 }), cx, 0.9, -1.795, 0);
  const e = basic(C.bright);
  for (const y of BOARDS) {
    box(led, 0.84, 0.01, 0.005, e, cx, y - 0.019, -1.4505, 0);
    const glow = glowPlane(0.86, 0.34, C.bright, 0.2);
    glow.position.set(cx, y - 0.17, -1.787);
    g.add(glow);
  }
  box(led, 0.03, 1.8, 0.005, e, 0.565, 0.9, -1.4505, 0);
  box(led, 0.03, 1.8, 0.005, e, 1.435, 0.9, -1.4505, 0);

  const r = rng(8);
  const z = -1.62;
  // cubby .46-.90 (shelf-5 sits at x 1.0): books left, small objects right
  books(g, 0.6, 0.475, z, 5, 1, r);
  books(g, 1.42, 0.475, z, 3, -1, r);
  // cubby .90-1.34 (shelf-4)
  books(g, 0.6, 0.915, z, 3, 1, r);
  for (let i = 0; i < 3; i++) box(g, 0.2 - i * 0.012, 0.035, 0.15, mat(BOOK[(i * 3 + 1) % BOOK.length], { rough: 0.8 }), 1.3, 0.93 + i * 0.037, z, 0.002);
  // cubby 1.34-1.78 (shelf-3)
  books(g, 0.6, 1.355, z, 2, 1, r);
  succulent(g, 1.33, 1.355, z);
  // bottom cubby: fabric storage boxes
  const fab = mat(0x3a3f46, { rough: 1 });
  const fab2 = mat(0x4b4742, { rough: 1 });
  box(g, 0.34, 0.28, 0.3, fab, 0.78, 0.2, z, 0.008);
  box(g, 0.34, 0.28, 0.3, fab2, 1.2, 0.2, z, 0.008);
  for (const x of [0.78, 1.2]) box(g, 0.1, 0.05, 0.004, mat(C.paper, { rough: 0.9 }), x, 0.26, z + 0.153, 0);
  // top: leaning frame + book pile (vine pot is built separately at x 1.3)
  books(g, 0.6, TOP.book, z, 3, 1, r);
}

/** 'shelf': wall shelf above the desk (shelf-0..2) + bookshelf (shelf-3..6). */
export function buildShelves(root, led) {
  const g = named('shelf', root);
  buildWallShelf(g, led);
  buildBookshelf(g, led);
  merge(g, { cast: true });
  return g;
}

export { TOP };
