import {
  between,
  FACING,
  identity,
  type Mat4,
  MATERIAL,
  multiply,
  type Shape,
  transform,
  type Vec3,
} from '../../lib/mesh';

export type Vec2 = [number, number];

/** a deck, arm units round the pivot: its middle and half size, its parts, her seat and height;
 * and the CSS px an arm unit takes on it */
interface Deck {
  box: [number, number, number, number];
  valve: Vec2;
  gauge: Vec2;
  motor: Vec2;
  seat: [number, number, number];
  scale: number;
}

/** on the bed she stands on the deck's far end, clear of the boom's counterweight; the rig is
 * built big enough to slide down a plate a page tall */
export const BED_DECK: Deck = {
  box: [-52, 0, 110, 58],
  valve: [-72, 36],
  gauge: [40, 38],
  motor: [0, 49],
  seat: [-120, 0, 186],
  scale: 0.75,
};

/** up a phone's column: all inside the column, she over the pivot; the engine widens it to her */
export const COLUMN_DECK: Deck = {
  box: [0, 14, 58, 88],
  valve: [-40, 82],
  gauge: [40, 82],
  motor: [0, 49],
  seat: [0, 0, 186],
  scale: 0.6,
};
/** the rail band at the bed's foot, CSS px: its height, the rail's line, where the carriage parks
 * in from the left end, how far from the right end the drag chain is anchored, and its bend's width */
export const BED = { height: 96, rail: 48, start: 260, anchor: 38, bend: 11 } as const;
/** arm units: the boom from the pivot to the elbow; her pencil from the elbow to its point, to the
 * trunnion it tips up on, its radius and its cone */
export const BOOM = 340;
export const PENCIL = { reach: 290, wrist: 48, radius: 18, cone: 52 } as const;
/** how high the quill holds her pencil's axis, down and lifted; its yoke rides this far over it */
export const PEN = { down: 24, up: 72 } as const;
const YOKE = 146;
/** the hub's radius over the boom's root, arm units */
export const HUB = 30;
/** the elbow ram: its clevis along the boom, its barrel, and the crank it pushes on the elbow */
const RAM_AT = 80;
const BARREL = 180;
const CRANK = 40;
const CRANK_ANGLE = Math.PI - 0.5;

/** what the rig's pose moves: the boom's angle, her pencil's direction, its axis's height and
 * pitch, the gauge's pressure */
export interface Pose {
  turn: number;
  dir: Vec2;
  pen: number;
  pitch: number;
  gauge: number;
}

/** a part of the rig: its shape and material, the solid it outlines with, the frame it rides in
 * and its matrix there in arm units, and whether it tapers to a point at its +y end */
export interface Part {
  shape: Shape;
  material: number;
  id: number;
  frame: number;
  local: Mat4;
  point: boolean;
  /** how far it reaches from its middle */
  radius: number;
}

const { paper, accent, hazard, yellow, figure } = MATERIAL;
/** solid ink and solid yellow for details too small for faces and their lines; her pencil's bare
 * wood, white however it turns */
const INK = figure;
const GOLD = figure + 1;
const WOOD = figure + 2;
/** a hexagon's corner radius over its flats' */
const HEX = 2 / Math.sqrt(3);
const LP = PENCIL.reach - PENCIL.wrist;
const END = LP - PENCIL.cone;
const RAM_Z = 142;

/** shades the figure's own materials */
export const shading = `
bool figure(int material, vec3 world, vec3 n, vec2 px, inout vec4 color) {
  color = vec4(material == ${GOLD} ? uYellow : uShade, 1.0);
  if (material == ${WOOD} && dot(n, uLight) > 0.21 && threshold < 0.75) color.rgb = uLit;
  return true;
}`;

/** the frames parts ride in: the deck, turned with the boom, the pinion, the needle, the elbow,
 * the wrist on its quill, her pencil from its butt */
const [DECK, TURN, PINION, NEEDLE, ELBOW, WRIST, BUTT] = [0, 1, 2, 3, 4, 5, 6];
export const FRAMES = 7;

const m = identity();
const rams = [0, 0, 0, 0, 0, 0];
const CLEVIS: Vec2 = [RAM_AT, 0];
const PIN: Vec2 = [CRANK * Math.cos(CRANK_ANGLE), CRANK * Math.sin(CRANK_ANGLE)];

/**
 * The pencil arm on its carriage, in arm units round its pivot: the page is z = 0, z up toward the
 * viewer. What moves with the pose and no one frame (the ram, its hose, the quill's rod) comes
 * first, laid again by `pose`.
 */
export function build(deck: Deck, at: Pose): Part[] {
  const parts: Part[] = [];
  let id = 0;
  function put(shape: Shape, material: number, frame: number, local: Mat4, point = false) {
    parts.push({ shape, material, id, frame, local: local.slice(), point, radius: reach(local) });
  }
  // the ram's barrel, its caps, rod and line, its hose; the rod down the quill
  const solids = [++id, ++id, ++id, ++id, ++id];
  moving(at, (solid, shape, material) => {
    id = solids[solid];
    put(shape, material, DECK, m);
  });
  /** a round or hex post standing from z0 to z1 */
  function post(
    shape: Shape,
    material: number,
    frame: number,
    x: number,
    y: number,
    r: number,
    z0: number,
    z1: number,
    spin = 0,
  ) {
    const d = shape === 'prism' ? 2 * r * HEX : 2 * r;
    put(
      shape,
      material,
      frame,
      transform(m, [x, y, (z0 + z1) / 2], [FACING[0], 0, spin], [d, z1 - z0, d]),
    );
  }
  /** a slab from z0 to z1 */
  function slab(
    material: number,
    frame: number,
    x: number,
    y: number,
    w: number,
    h: number,
    z0: number,
    z1: number,
    spin = 0,
  ) {
    put('box', material, frame, transform(m, [x, y, (z0 + z1) / 2], [0, 0, spin], [w, h, z1 - z0]));
  }
  /** a slab of half size (w, h) with its corners rounded by r */
  function rounded(
    material: number,
    frame: number,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    z0: number,
    z1: number,
  ) {
    slab(material, frame, x, y, 2 * w, 2 * h - 2 * r, z0, z1);
    slab(material, frame, x, y, 2 * w - 2 * r, 2 * h, z0, z1);
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        post('cylinder', material, frame, x + sx * (w - r), y + sy * (h - r), r, z0, z1);
  }
  /** n parts round the frame's origin, `r` out */
  function ring(
    n: number,
    r: number,
    spin: number,
    lay: (x: number, y: number, angle: number) => void,
  ) {
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * Math.PI * 2;
      lay(r * Math.cos(a), r * Math.sin(a), a);
    }
  }

  // the deck: its hazard band round a paper plate, bolts in its corners
  const [dx, dy, hw, hh] = deck.box;
  id++;
  rounded(hazard, DECK, dx, dy, hw, hh, 14, 0, 10);
  rounded(paper, DECK, dx, dy, hw - 9, hh - 9, 5, 10, 10.5);
  id++;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      post('prism', yellow, DECK, dx + sx * (hw - 16), dy + sy * (hh - 16), 5, 9, 15);
  // the pedestal: the housing, the slewing ring and its bolts turning with the boom, the column
  id++;
  post('cylinder', paper, DECK, 0, 0, 42, 8, 50);
  id++;
  post('cylinder', paper, DECK, 0, 0, 36, 50, 60);
  ring(28, 38.5, 0, (x, y, a) => slab(paper, TURN, x, y, 5, 4, 50, 60, a));
  id++;
  ring(10, 33.5, 0, (x, y, a) => post('prism', GOLD, TURN, x, y, 1.9, 59, 63, a));
  id++;
  post('cylinder', paper, DECK, 0, 0, 27, 60, 100);
  ring(10, 29, 0, (x, y, a) => slab(paper, DECK, x, y, 6, 4.4, 60, 100, a));
  // the servo, its fins and pinion
  const [mx, my] = deck.motor;
  id++;
  post('cylinder', paper, DECK, mx, my, 10, 8, 50);
  for (let z = 17.5; z < 44; z += 7) post('cylinder', paper, DECK, mx, my, 12, z - 1.2, z + 1.2);
  id++;
  post('cylinder', paper, PINION, 0, 0, 8, 50, 60);
  ring(9, 9.5, 0, (x, y, a) => slab(paper, PINION, x, y, 3, 2.8, 50, 60, a));
  // the valve block, its caps, its lever and the pipe up to the housing
  const [vx, vy] = deck.valve;
  const hs = vx < 0 ? 1 : -1;
  id++;
  slab(paper, DECK, vx, vy, 34, 22, 8, 28);
  for (const x of [-10, 0, 10]) post('cylinder', paper, DECK, vx + x, vy, 3.4, 26, 33);
  put(
    'box',
    paper,
    DECK,
    between(m, [vx + 17 * hs, vy + 3, 20.5], [vx + 29 * hs, vy + 9, 20.5], 4.4),
  );
  const px = vx - 12 * hs;
  const py = vy - 9;
  const pl = Math.hypot(px, py);
  id++;
  put('cylinder', paper, DECK, between(m, [px, py, 30], [(px / pl) * 43, (py / pl) * 43, 36], 6));
  // the gauge, its ticks, its needle on the pressure
  const [gx, gy] = deck.gauge;
  id++;
  post('cylinder', paper, DECK, gx, gy, 12, 8, 30);
  id++;
  ring(8, 8.4, Math.PI / 8, (x, y, a) => {
    if (Math.sin(a) < 0.55) slab(INK, DECK, gx + x, gy + y, 3, 2.7, 30, 30.5, a);
  });
  slab(INK, NEEDLE, 2.5, 0, 8, 2.6, 30, 30.5);
  slab(accent, NEEDLE, 7.25, 0, 2.5, 2.6, 30, 30.5);
  // the hub over the boom's root, its nut and bolt circle turning with it
  id++;
  post('cylinder', paper, DECK, 0, 0, HUB, 98, 130);
  ring(6, 22, 0, (x, y) => post('prism', INK, TURN, x, y, 2.4, 130, 130.5));
  id++;
  post('cylinder', paper, DECK, 0, 0, 13, 128, 133);
  post('prism', paper, TURN, 0, 0, 8.5, 130, 139);

  // the boom: its rivet rows and slot, its counterweight, the eye at the elbow, the ram's clevis
  // and the quill's air line
  id++;
  slab(paper, TURN, (BOOM - 26) / 2, 0, BOOM + 26, 38, 106, 126);
  post('cylinder', paper, TURN, -26, 0, 19, 106, 126);
  for (let x = 39; x < BOOM - 34; x += 14)
    for (const y of [-15, 15]) post('prism', INK, TURN, x, y, 1.5, 126, 126.5);
  // its slot, a solid of its own so it is outlined round the page that shows through
  id++;
  slab(paper, TURN, BOOM - 62, 0, 23, 13, 126, 126.5);
  for (const x of [-11.5, 11.5]) post('cylinder', paper, TURN, BOOM - 62 + x, 0, 6.5, 126, 126.5);
  id++;
  post('cylinder', paper, TURN, BOOM, 0, 26, 106, 126);
  ring(6, 20.5, 0, (x, y) => post('prism', INK, TURN, BOOM + x, y, 2.2, 126, 126.5));
  id++;
  slab(hazard, TURN, -40, 0, 28, 44, 104, 144);
  post('cylinder', paper, TURN, -40, 0, 6.6, 142, 150);
  id++;
  post('cylinder', paper, TURN, ...CLEVIS, 8.5, 124, 154);
  post('cylinder', paper, ELBOW, ...PIN, 8, 132, 154);
  id++;
  const air: Vec3[] = [
    [34, -22, 126],
    [BOOM - 30, -22, 126],
    [BOOM - 12, -11, 150],
  ];
  put('cylinder', paper, TURN, between(m, air[0], air[1], 5.2));
  put('cylinder', paper, TURN, between(m, air[1], air[2], 5.2));
  put('sphere', paper, TURN, transform(m, air[1], undefined, [5.2, 5.2, 5.2]));

  // the elbow: the quill on the eye, the crank the ram pushes; the guide rods and their yoke
  // riding with the wrist
  id++;
  post('cylinder', paper, ELBOW, 0, 0, 15, 124, 162);
  post('cylinder', paper, ELBOW, 0, 0, 10, 160, 167);
  id++;
  put(
    'box',
    paper,
    ELBOW,
    transform(m, [PIN[0] / 2, PIN[1] / 2, 142], [0, 0, CRANK_ANGLE], [CRANK, 16, 16]),
  );
  id++;
  for (const y of [-22, 22]) post('cylinder', paper, WRIST, 0, y, 3.2, 10, YOKE);
  slab(paper, WRIST, 0, 0, 10, 54, 6, 14);
  id++;
  slab(paper, WRIST, 0, 0, 11, 55, YOKE, YOKE + 7);
  for (const y of [-22, 22]) post('prism', paper, WRIST, 0, y, 4.5, YOKE + 6, YOKE + 10);
  // the wrist: its arm, fork and bosses; the ferrule her pencil sits in, and her pencil
  const r = PENCIL.radius;
  id++;
  slab(paper, WRIST, (PENCIL.wrist - 16) / 2, 0, PENCIL.wrist, 16, -7, 7);
  for (const y of [-1, 1]) {
    slab(paper, WRIST, PENCIL.wrist - 8, y * (r + 5), 20, 5.2, -9, 9);
    put(
      'cylinder',
      paper,
      WRIST,
      transform(m, [PENCIL.wrist, y * (r + 7.5), 0], undefined, [14, 5.2, 14]),
    );
  }
  const length = (material: number, x0: number, x1: number, radius: number, point = false) => {
    const d = radius * 2 * HEX;
    put(
      'prism',
      material,
      BUTT,
      transform(m, [(x0 + x1) / 2, 0, 0], [0, 0, -Math.PI / 2], [d, x1 - x0, d]),
      point,
    );
  };
  length(paper, -0.5, 14, r + 3);
  // her pencil from its butt: black and yellow bands, bare wood, the lead
  id++;
  const bands: [number, number, number][] = [
    [0, 20, INK],
    [20, 24, GOLD],
    [24, 28, INK],
    [28, 0.45 * END, paper],
    [0.45 * END, 0.45 * END + 10, INK],
    [0.45 * END + 10, END - 30, paper],
    [END - 30, END - 22, INK],
    [END - 22, END - 17, GOLD],
    [END - 17, END - 9, INK],
    [END - 9, END, paper],
  ];
  for (const [x0, x1, material] of bands) length(material, x0, x1, r);
  length(WOOD, END, LP, r, true);
  length(INK, LP - 15, LP + 0.2, (r * 15.2) / PENCIL.cone, true);
  return parts;
}

/** the rig's frames for `at`, arm units, into `frames`, and the parts that move with no one frame
 * laid again */
export function pose(deck: Deck, at: Pose, frames: Mat4[], parts: Part[]) {
  const phi = Math.atan2(at.dir[1], at.dir[0]);
  const ex = BOOM * Math.cos(at.turn);
  const ey = BOOM * Math.sin(at.turn);
  identity(frames[DECK]);
  transform(frames[TURN], [0, 0, 0], [0, 0, at.turn]);
  transform(frames[PINION], [deck.motor[0], deck.motor[1], 0], [0, 0, -4.4 * at.turn]);
  transform(frames[NEEDLE], [deck.gauge[0], deck.gauge[1], 0], [0, 0, -2.4 + 2.2 * at.gauge]);
  transform(frames[ELBOW], [ex, ey, 0], [0, 0, phi]);
  transform(frames[WRIST], [ex, ey, at.pen], [0, 0, phi]);
  multiply(frames[BUTT], frames[WRIST], transform(m, [PENCIL.wrist, 0, 0], [0, -at.pitch, 0]));
  let k = 0;
  moving(at, () => parts[k++].local.set(m));
}

/** lays the parts that move with no one frame into `m`, in order, each with its solid */
function moving(at: Pose, put: (solid: number, shape: Shape, material: number) => void) {
  const ex = BOOM * Math.cos(at.turn);
  const ey = BOOM * Math.sin(at.turn);
  ram(ex, ey, at.dir[0], at.dir[1], rams);
  const [ax, ay, bx, by, cx, cy] = rams;
  const ul = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / ul;
  const uy = (by - ay) / ul;
  const tube = (solid: number, material: number, a: Vec3, b: Vec3, width: number) => {
    between(m, a, b, width);
    put(solid, 'cylinder', material);
  };
  const along = (x: number, y: number, k: number, z: number): Vec3 => [x + ux * k, y + uy * k, z];
  tube(0, paper, [ax, ay, RAM_Z], [bx, by, RAM_Z], 20);
  tube(1, paper, [ax, ay, RAM_Z], along(ax, ay, 10, RAM_Z), 23);
  tube(1, paper, along(bx, by, -10, RAM_Z), [bx, by, RAM_Z], 23);
  tube(1, paper, [bx, by, RAM_Z], along(bx, by, 8, RAM_Z), 14);
  tube(1, paper, along(ax, ay, 18, RAM_Z + 8), along(ax, ay, 18, RAM_Z + 15), 6.8);
  tube(1, paper, along(bx, by, -18, RAM_Z + 8), along(bx, by, -18, RAM_Z + 15), 6.8);
  tube(2, paper, [bx, by, RAM_Z], [cx, cy, RAM_Z], 9);
  tube(3, paper, along(ax, ay, 18, RAM_Z + 13), along(bx, by, -18, RAM_Z + 13), 4.4);
  // the hose from the boom's root to the barrel's fitting, a bezier in 4 runs
  const c = Math.cos(at.turn);
  const s = Math.sin(at.turn);
  const h0: Vec3 = [12 * c - 15 * s, 12 * s + 15 * c, 136];
  const hk: Vec2 = [34 * c - 40 * s, 34 * s + 40 * c];
  const h1 = along(ax, ay, 18, RAM_Z + 15);
  let last = h0;
  for (let i = 1; i <= 4; i++) {
    const t = i / 4;
    const k0 = (1 - t) * (1 - t);
    const k1 = 2 * t * (1 - t);
    const next: Vec3 = [
      k0 * h0[0] + k1 * hk[0] + t * t * h1[0],
      k0 * h0[1] + k1 * hk[1] + t * t * h1[1],
      136 + (RAM_Z + 15 - 136) * t,
    ];
    tube(3, paper, last, next, 6.8);
    if (i < 4) {
      transform(m, next, undefined, [6.8, 6.8, 6.8]);
      put(3, 'sphere', paper);
    }
    last = next;
  }
  tube(4, paper, [ex, ey, at.pen + 8], [ex, ey, 124], 12);
}

/** how far a part laid by `m` reaches from its middle, at most */
function reach(m: Readonly<Mat4>): number {
  return (
    (Math.hypot(m[0], m[1], m[2]) + Math.hypot(m[4], m[5], m[6]) + Math.hypot(m[8], m[9], m[10])) /
    2
  );
}

/** writes the elbow ram's clevis, barrel end and crank pin (arm units) into `out`, for the elbow at
 * (ex, ey) and the pencil pointing (fx, fy) */
function ram(ex: number, ey: number, fx: number, fy: number, out: number[]) {
  const l1 = Math.hypot(ex, ey);
  out[0] = (ex / l1) * RAM_AT;
  out[1] = (ey / l1) * RAM_AT;
  const c = Math.cos(CRANK_ANGLE);
  const s = Math.sin(CRANK_ANGLE);
  out[4] = ex + CRANK * (c * fx - s * fy);
  out[5] = ey + CRANK * (s * fx + c * fy);
  const d = Math.hypot(out[4] - out[0], out[5] - out[1]);
  out[2] = out[0] + ((out[4] - out[0]) / d) * BARREL;
  out[3] = out[1] + ((out[5] - out[1]) / d) * BARREL;
}
