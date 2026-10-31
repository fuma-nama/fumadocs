import {
  between,
  createMesh,
  distance,
  FACING,
  identity,
  type Mat4,
  MATERIAL,
  multiply,
  normalize,
  type PartSpec,
  type Shape,
  transform,
  type Vec3,
} from '../../lib/mesh';

/** CSS px: the camera's distance from the wall, and depths toward the viewer */
export const CAM = 2400;
export const CRATE_Z = 200;
export const CHAIN_Z = 44;
export const HOPPER_Z = 60;
export const LID_T = 30;
const LIGHT = normalize([-0.25, -0.42, 0.87]);
/** a jaw's reach from the chain and half its length */
export const JAW = 20;
export const JAW_HALF = 13;
/** a cable's radius, and its plug's length */
const RADIUS = 3.5;
export const PLUG = 18;

const LACE = 12;
const MAX_LACES = 120;
const MAX_JAWS = 16;
const MAX_ROPE = 16;

/** a box by its centre and half its size */
export interface Box {
  at: Vec3;
  half: Vec3;
}

/** where the machine stands, from the page's layout: stage px, y down, z toward the viewer */
export interface Plan {
  /** the drawing's size; how far the machine and its shadows reach on it, inside the gutters */
  width: number;
  height: number;
  gutter: number;
  right: number;
  bottom: number;
  eye: number;
  floor: number;
  crate: Box;
  /** the cables there are room for, and their sockets on the crate, reels and jacks */
  cables: number;
  sockets: Vec3[];
  /** the housings round the label, the registry's plate and the counter, and their windows */
  housings: { box: Box; window: Box }[];
  /** the page's windows on the wall */
  windows: Box[];
  chain: {
    tail: Vec3;
    dir: [number, number];
    side: [number, number];
    span: number;
    upright: boolean;
  };
  drive: Vec3;
  pitch: number;
  /** its top's middle, half widths at the top and the spout, height */
  hopper: { at: Vec3; top: number; spout: number; height: number };
  reels: Vec3[];
  jacks: Vec3[];
}

export interface Pose {
  latch: [number, number];
  lid: number;
  /** how far the chain has moved */
  travel: number;
  /** each reel's turn, and whether its cable is plugged into your project */
  reels: [number, number];
  plugged: [boolean, boolean];
}

/**
 * The machine: the crate, the riser and its chain, the hopper, the reels and their cables, drawn
 * by the mesh in front of the page's windows, with holes down to the page's words on it
 */
export function createMachine(
  canvas: HTMLCanvasElement,
  cards: number,
  options: { onFrame: () => void; onResize: (width: number, height: number) => void },
) {
  const specs: PartSpec[] = [];
  let ids = 0;
  function parts(count: number, shape: Shape, material: number, id: number, shadow = true) {
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(specs.push({ shape, id, material, shadow }) - 1);
    return out;
  }
  const solid = () => ++ids;
  const { paper, ink, accent, floor: dots, clear } = MATERIAL;

  const wall = parts(2, 'box', dots, 0, false);
  const windows = parts(2, 'box', clear, 0, false);
  const body = solid();
  const shell = parts(5, 'box', paper, body);
  const rim = parts(4, 'box', paper, body);
  const hold = parts(4, 'box', ink, body);
  const caps = parts(4, 'box', ink, solid());
  const housings = parts(3, 'box', paper, solid());
  const holes = parts(3, 'box', clear, 0, false);
  const sockets = parts(2, 'cylinder', paper, solid());
  const bores = parts(2, 'cylinder', ink, solid());
  const tray = solid();
  const lid = parts(5, 'box', paper, tray);
  const lidCaps = parts(4, 'box', ink, solid());
  const catches = parts(2, 'box', ink, solid());
  const bases = parts(2, 'box', ink, solid());
  const levers = parts(2, 'box', accent, solid());
  const strut = [
    ...parts(1, 'cylinder', paper, solid()),
    ...parts(1, 'cylinder', accent, solid()),
    ...parts(3, 'cylinder', ink, solid()),
  ];
  const frame = solid();
  const chords = parts(4, 'cylinder', paper, frame);
  const laces = parts(MAX_LACES, 'box', paper, frame);
  const arms = parts(MAX_JAWS, 'cylinder', paper, solid());
  const grips = parts(MAX_JAWS, 'box', accent, solid());
  const hub = solid();
  const gears = [0, 1].map(() => {
    const id = solid();
    return {
      body: parts(1, 'cylinder', paper, id)[0],
      teeth: parts(10, 'box', paper, id),
      hub: parts(1, 'cylinder', accent, hub)[0],
    };
  });
  const mounts = parts(2, 'box', ink, solid());
  const driver = solid();
  const drive = {
    body: parts(1, 'cylinder', ink, driver)[0],
    teeth: parts(8, 'box', ink, driver),
    hub: parts(1, 'cylinder', accent, hub)[0],
  };
  const hopper = parts(1, 'box', paper, solid())[0];
  const mouth = parts(1, 'box', ink, solid())[0];
  const reels = [0, 1].map(() => {
    const id = solid();
    return {
      drum: parts(1, 'cylinder', paper, id)[0],
      recess: parts(1, 'cylinder', ink, id)[0],
      spokes: parts(2, 'box', paper, id),
      hub: parts(1, 'cylinder', accent, hub)[0],
      bracket: parts(1, 'box', ink, solid())[0],
      jack: parts(1, 'cylinder', ink, solid())[0],
    };
  });
  const ropes = [0, 1].map(() => {
    const id = solid();
    return {
      segments: parts(MAX_ROPE, 'cylinder', paper, id, false),
      joints: parts(MAX_ROPE, 'sphere', paper, id, false),
      plug: parts(1, 'cylinder', accent, id, false)[0],
    };
  });
  const sheets = parts(cards, 'box', clear, 0, false);

  // shadows from what stands within 64px toward the light: the crate darkens its floor, not the wall
  const mesh = createMesh(canvas, { parts: specs, reach: 64, ...options });
  if (!mesh) return null;
  const m = identity();
  const local = identity();
  const hinge = identity();
  let plan: Plan | undefined;

  function box(i: number, at: Readonly<Vec3>, size: Readonly<Vec3>, turn?: Readonly<Vec3>) {
    mesh!.place(i, transform(m, at, turn, size));
  }
  function inFrame(i: number, f: Readonly<Mat4>, at: Readonly<Vec3>, size: Readonly<Vec3>) {
    mesh!.place(i, multiply(m, f, transform(local, at, undefined, size)));
  }
  function place(i: number, b: Box, inset = 0) {
    box(i, b.at, [2 * b.half[0] + inset, 2 * b.half[1] + inset, 2 * b.half[2] + inset]);
  }
  /** a disc facing the viewer, its back at z */
  function disc(i: number, x: number, y: number, z: number, d: number, thick: number) {
    box(i, [x, y, z + thick / 2], [d, thick, d], FACING);
  }
  function rod(i: number, a: Readonly<Vec3>, b: Readonly<Vec3>, width: number) {
    mesh!.place(i, between(m, a, b, width));
  }
  function gear(
    g: { body: number; teeth: number[]; hub: number },
    at: Readonly<Vec3>,
    r: number,
    turn: number,
  ) {
    disc(g.body, at[0], at[1], at[2], 2 * r, 6);
    const n = g.teeth.length;
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n + turn;
      const c = r + 1.25;
      box(
        g.teeth[k],
        [at[0] + Math.cos(a) * c, at[1] + Math.sin(a) * c, at[2] + 3],
        [4.5, (Math.PI * (r + 1.75)) / n, 6],
        [0, 0, a],
      );
    }
  }

  function layout(next: Plan) {
    plan = next;
    const { width, height, gutter, right, bottom, floor, crate } = next;
    mesh!.camera({ width, height, eye: [next.eye, 0, CAM], z: [CRATE_Z + 250, -60] });
    mesh!.light(LIGHT, [gutter, 0, -10], [width - gutter, height, CRATE_Z + 60]);
    const [cx, cy, cz] = crate.at;
    const [bx, by, bz] = crate.half;
    const { at: h, top: wide, spout, height: tall } = next.hopper;
    // the wall, and all the canvas draws, as far as the machine and its shadows reach; the page's
    // windows cut out of it
    box(wall[0], [(gutter + right) / 2, bottom / 2, -5], [right - gutter, bottom, 10]);
    mesh!.clip({ x: 0, y: 0, w: right, h: bottom });
    box(
      wall[1],
      [cx, floor + 0.5, (cz - bz - 10 + CRATE_Z + 24) / 2],
      [2 * bx + 48, 1, CRATE_Z + 34 - cz + bz],
    );
    for (let i = 0; i < 2; i++) {
      const { at, half } = next.windows[i];
      const x0 = Math.max(at[0] - half[0], gutter);
      const x1 = Math.min(at[0] + half[0], right);
      const y1 = Math.min(at[1] + half[1], bottom);
      const y0 = at[1] - half[1];
      mesh!.show(windows[i], x1 > x0 && y1 > y0);
      box(windows[i], [(x0 + x1) / 2, (y0 + y1) / 2, at[2]], [x1 - x0, y1 - y0, 2 * half[2]]);
    }

    // the crate, open at the top, dark inside, 9px walls under a rim 2px proud
    box(shell[0], [cx, cy, cz + bz - 4.5], [2 * bx, 2 * by, 9]);
    box(shell[1], [cx, cy, cz - bz + 4.5], [2 * bx, 2 * by, 9]);
    box(shell[2], [cx - bx + 4.5, cy, cz], [9, 2 * by, 2 * bz - 18]);
    box(shell[3], [cx + bx - 4.5, cy, cz], [9, 2 * by, 2 * bz - 18]);
    box(shell[4], [cx, cy + by - 5, cz], [2 * bx - 18, 10, 2 * bz - 18]);
    const top = cy - by + 9;
    box(rim[0], [cx, top, cz + bz - 3.5], [2 * bx + 4, 18, 11]);
    box(rim[1], [cx, top, cz - bz + 3.5], [2 * bx + 4, 18, 11]);
    box(rim[2], [cx - bx + 3.5, top, cz], [11, 18, 2 * bz - 18]);
    box(rim[3], [cx + bx - 3.5, top, cz], [11, 18, 2 * bz - 18]);
    box(hold[0], [cx, cy, cz - bz + 9.5], [2 * bx - 18, 2 * by, 1]);
    box(hold[1], [cx - bx + 9.5, cy, cz], [1, 2 * by, 2 * bz - 18]);
    box(hold[2], [cx + bx - 9.5, cy, cz], [1, 2 * by, 2 * bz - 18]);
    box(hold[3], [cx, cy + by - 10.5, cz], [2 * bx - 18, 1, 2 * bz - 18]);
    for (let i = 0; i < 4; i++) {
      const sx = i & 1 ? 1 : -1;
      const sz = i & 2 ? 1 : -1;
      box(caps[i], [cx + sx * (bx - 11), cy + by - 11, cz + sz * (bz - 11)], [26, 26, 26]);
    }
    for (let i = 0; i < 3; i++) {
      place(housings[i], next.housings[i].box);
      place(holes[i], next.housings[i].window);
    }
    for (let i = 0; i < 2; i++) {
      const s = next.sockets[i];
      const on = i < next.cables;
      mesh!.show(sockets[i], on);
      mesh!.show(bores[i], on);
      if (!on) continue;
      disc(sockets[i], s[0], s[1], s[2], 18, 6);
      disc(bores[i], s[0], s[1], s[2] + 6, 9, 0.5);
    }

    // the chain's frame: four chords laced front and back, from just past its tail and head
    const { tail, dir, side, span } = next.chain;
    const a: Vec3 = [tail[0] + side[0] * 15 - dir[0] * 6, tail[1] + side[1] * 15 - dir[1] * 6, 0];
    const length = span + 12;
    const across = [-dir[1], dir[0]];
    const at = (s: number, u: number, v: number): Vec3 => [
      a[0] + dir[0] * s + across[0] * u,
      a[1] + dir[1] * s + across[1] * u,
      tail[2] + v,
    ];
    for (let i = 0; i < 4; i++) {
      const u = i < 2 ? -11 : 11;
      const v = i & 1 ? 8 : -8;
      rod(chords[i], at(0, u, v), at(length, u, v), 6.4);
    }
    const strokes = Math.ceil(length / LACE);
    // laced on its front: the back's lacing, seen through it, would only add noise
    for (let k = 0; k < MAX_LACES; k++) {
      const on = k < strokes;
      mesh!.show(laces[k], on);
      if (!on) continue;
      const from = k & 1 ? 11 : -11;
      const end = Math.min(length, (k + 1) * LACE);
      const to = from + (-2 * from * (end - k * LACE)) / LACE;
      rod(laces[k], at(k * LACE, from, 8), at(end, to, 8), 3.6);
    }
    for (let i = 0; i < 2; i++) {
      const x = tail[0] + dir[0] * span * i + side[0] * 15;
      const y = tail[1] + dir[1] * span * i + side[1] * 15;
      box(mounts[i], [x, y, (tail[2] - 8) / 2], [16, 16, tail[2] - 8]);
    }

    // the hopper narrows to its spout, its mouth and rim one dark band over the top
    box(hopper, [h[0], h[1] + tall / 2, h[2]], [2 * wide, tall, 44]);
    mesh!.taper(hopper, spout / wide);
    box(mouth, [h[0], h[1] + 3, h[2]], [2 * wide + 6, 6, 50]);

    for (let i = 0; i < 2; i++) {
      const r = next.reels[i];
      const on = i < next.cables;
      const reel = reels[i];
      for (const part of [
        reel.drum,
        reel.recess,
        ...reel.spokes,
        reel.hub,
        reel.bracket,
        reel.jack,
      ])
        mesh!.show(part, on);
      if (!on) continue;
      disc(reel.drum, r[0], r[1], r[2] - 2, 18, 8);
      disc(reel.recess, r[0], r[1], r[2] + 6, 13, 0.4);
      disc(reel.hub, r[0], r[1], r[2] + 5.5, 4.4, 2);
      box(reel.bracket, [r[0] + 6, r[1], r[2] - 1], [10, 5, 4]);
      const j = next.jacks[i];
      box(reel.jack, j, [13, 12, 13], [0, 0, Math.PI / 2]);
    }
    for (const rope of ropes) hide(rope);
  }

  function hide(rope: (typeof ropes)[number]) {
    for (const i of rope.segments) mesh!.show(i, false);
    for (const i of rope.joints) mesh!.show(i, false);
    mesh!.show(rope.plug, false);
  }

  function pose(p: Pose) {
    if (!plan) return;
    const { crate, chain } = plan;
    const [cx, cy, cz] = crate.at;
    const [bx, by, bz] = crate.half;

    // the lid, a tray upside down on its hinge: in its frame y runs along its depth, z up through it
    const f = transform(hinge, [cx, cy - by, cz - bz], [p.lid + Math.PI / 2, 0, 0]);
    inFrame(lid[0], f, [0, bz, LID_T - 4], [2 * bx + 4, 2 * bz + 4, 8]);
    const wallT = LID_T - 8;
    inFrame(lid[1], f, [0, 5.5 - 2, wallT / 2], [2 * bx + 4, 11, wallT]);
    inFrame(lid[2], f, [0, 2 * bz + 2 - 5.5, wallT / 2], [2 * bx + 4, 11, wallT]);
    inFrame(lid[3], f, [-bx - 2 + 5.5, bz, wallT / 2], [11, 2 * bz - 18, wallT]);
    inFrame(lid[4], f, [bx + 2 - 5.5, bz, wallT / 2], [11, 2 * bz - 18, wallT]);
    for (let i = 0; i < 4; i++) {
      const sx = i & 1 ? 1 : -1;
      const sy = i & 2 ? 1 : -1;
      inFrame(lidCaps[i], f, [sx * (bx - 11), bz + sy * (bz - 11), LID_T - 11], [27, 27, 27]);
    }

    const reach = Math.min(17, by * 0.22);
    for (let i = 0; i < 2; i++) {
      const x = (i === 0 ? -0.55 : 0.55) * bx;
      const base: Vec3 = [cx + x, cy - by + 20, cz + bz + 3];
      box(bases[i], base, [28, 22, 6]);
      inFrame(catches[i], f, [x, 2 * bz + 3, 11], [18, 10, 6]);
      const a = p.latch[i];
      box(
        levers[i],
        [base[0], base[1] + 4 - Math.cos(a) * reach, base[2] + 4 + Math.sin(a) * reach],
        [18, 2 * reach, 5],
        [Math.PI - a, 0, 0],
      );
    }

    // the lid's gas strut, from low on the crate's side to the lid
    const s = Math.sin(p.lid);
    const c = Math.cos(p.lid);
    const sideX = cx + bx + 8;
    const p1: Vec3 = [sideX, cy + by - 30, cz + bz - 30];
    const reachLid = 2 * bz - 30;
    const p2: Vec3 = [
      sideX,
      cy - by - s * reachLid - c * (LID_T / 2),
      cz - bz + c * reachLid - s * (LID_T / 2),
    ];
    const d = direction(p1, p2);
    const stroke = distance(p1, p2) * 0.62;
    const along = (from: Vec3, k: number): Vec3 => [
      from[0] + d[0] * k,
      from[1] + d[1] * k,
      from[2] + d[2] * k,
    ];
    // capsules: each rod runs its radius past its ends
    rod(strut[0], along(p1, -6), along(p1, stroke + 6), 12);
    rod(strut[1], along(p1, stroke - 13), along(p1, stroke + 7), 14);
    rod(strut[2], along(p2, 2.8), along(p2, -stroke - 2.8), 5.6);
    box(strut[3], [p1[0] - 4, p1[1], p1[2]], [10, 16, 16]);
    box(strut[4], [p2[0] - 4, p2[1], p2[2]], [10, 14, 14]);

    // the jaws a pitch apart along the chain, its sprockets and the drive turning with it
    const { tail, dir, side, span, upright } = chain;
    let k = 0;
    for (let at = p.travel % plan.pitch; at <= span - 6 && k < MAX_JAWS; at += plan.pitch) {
      if (at < 6) continue;
      const o: Vec3 = [tail[0] + dir[0] * at, tail[1] + dir[1] * at, tail[2]];
      mesh!.show(arms[k], true);
      mesh!.show(grips[k], true);
      rod(arms[k], o, [o[0] - side[0] * (JAW + 0.2), o[1] - side[1] * (JAW + 0.2), o[2]], 4.4);
      box(
        grips[k],
        [o[0] - side[0] * JAW, o[1] - side[1] * JAW, o[2]],
        upright ? [5, 2 * JAW_HALF, 7] : [2 * JAW_HALF, 5, 7],
      );
      k++;
    }
    for (; k < MAX_JAWS; k++) {
      mesh!.show(arms[k], false);
      mesh!.show(grips[k], false);
    }
    const spin = p.travel / 13;
    for (let i = 0; i < 2; i++) {
      const at: Vec3 = [tail[0] + dir[0] * span * i, tail[1] + dir[1] * span * i, tail[2] + 9];
      gear(gears[i], at, 12, -spin);
      disc(gears[i].hub, at[0], at[1], at[2] + 4.5, 7.6, 5);
    }
    gear(drive, plan.drive, 8, spin * 1.5);
    const g = plan.drive;
    disc(drive.hub, g[0], g[1], g[2] + 5.5, 5.2, 2);

    for (let i = 0; i < 2; i++) {
      const r = plan.reels[i];
      if (i >= plan.cables) continue;
      const reel = reels[i];
      for (let n = 0; n < 2; n++)
        box(
          reel.spokes[n],
          [r[0], r[1], r[2] + 6.6],
          [13, 4, 0.6],
          [0, 0, (n * Math.PI) / 2 - p.reels[i]],
        );
      mesh!.show(reel.jack, p.plugged[i]);
    }
    mesh!.invalidate();
  }

  /** a carried file's hole down to the page: `w` by `h` from the top middle of `frame` */
  function sheet(i: number, f: Readonly<Mat4> | null, w = 0, h = 0) {
    mesh!.show(sheets[i], f !== null);
    if (f) inFrame(sheets[i], f, [0, h / 2, 0], [w, h, 0.5]);
  }

  /** cable `i` along `points`, its last two the plug's */
  function rope(i: number, points: readonly Vec3[]) {
    const r = ropes[i];
    const n = Math.min(points.length, MAX_ROPE + 1);
    for (let k = 0; k < MAX_ROPE; k++) {
      const on = k < n - 2;
      mesh!.show(r.segments[k], on);
      mesh!.show(r.joints[k], on && k > 0);
      if (!on) continue;
      rod(r.segments[k], points[k], points[k + 1], 2 * RADIUS);
      if (k > 0) box(r.joints[k], points[k], [2 * RADIUS, 2 * RADIUS, 2 * RADIUS]);
    }
    mesh!.show(r.plug, n >= 2);
    if (n >= 2) rod(r.plug, points[n - 2], points[n - 1], 12);
  }

  return { mesh, layout, pose, sheet, rope, hide: (i: number) => hide(ropes[i]) };
}

/** a cable's path, sampled: points and the arc length at each */
export interface Route {
  points: Vec3[];
  at: number[];
  length: number;
}

/** a cable's corners are cut this much, at 45° where it turns square */
const CHAMFER = 8;

function route(corners: Vec3[]): Route {
  const points: Vec3[] = [corners[0]];
  for (let i = 1; i < corners.length - 1; i++) {
    const p = corners[i];
    const a = direction(corners[i - 1], p);
    const b = direction(p, corners[i + 1]);
    const c = Math.min(CHAMFER, distance(corners[i - 1], p) / 2, distance(p, corners[i + 1]) / 2);
    points.push(
      [p[0] - a[0] * c, p[1] - a[1] * c, p[2] - a[2] * c],
      [p[0] + b[0] * c, p[1] + b[1] * c, p[2] + b[2] * c],
    );
  }
  points.push(corners[corners.length - 1]);
  const at = [0];
  for (let i = 1; i < points.length; i++) at.push(at[i - 1] + distance(points[i - 1], points[i]));
  return { points, at, length: at[at.length - 1] };
}

export function pointAt(r: Route, s: number, out: Vec3): Vec3 {
  if (s <= 0) return Object.assign(out, r.points[0]);
  if (s >= r.length) return Object.assign(out, r.points[r.points.length - 1]);
  let i = 1;
  while (r.at[i] < s) i++;
  const a = r.points[i - 1];
  const b = r.points[i];
  const t = (s - r.at[i - 1]) / (r.at[i] - r.at[i - 1] || 1);
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

function locate(r: Route, p: Vec3): number {
  let best = Infinity;
  let at = 0;
  for (let i = 1; i < r.points.length; i++) {
    const a = r.points[i - 1];
    const b = r.points[i];
    const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1;
    const t = Math.min(
      1,
      Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l),
    );
    const d = distance([a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t], p);
    if (d < best) {
      best = d;
      at = r.at[i - 1] + t * (r.at[i] - r.at[i - 1]);
    }
  }
  return at;
}

export type Cable = ReturnType<typeof routes>;

/**
 * A cable plugged into the crate, and plugged into your folder; both share their start up to where
 * the gutter reaches your folder's row, `branch` along the first, `turn` along the second. Its run
 * toward the viewer meets the front at `forward`, so the perspective can't swing it onto a window.
 */
export function routes(c: {
  reel: Vec3;
  lane: number;
  wall: number;
  floor: number;
  front: number;
  forward: number;
  socket: Vec3;
  target: Vec3;
}) {
  const y = c.floor - RADIUS;
  const sealed = route([
    c.reel,
    [c.lane, c.reel[1], c.wall],
    [c.lane, y, c.wall],
    [c.forward, y, c.front],
    [c.socket[0], y, c.front],
    [c.socket[0], c.socket[1], c.front],
    c.socket,
  ]);
  const corner: Vec3 = [c.lane, c.target[1], c.wall];
  const plug: Vec3 = [c.target[0] + PLUG, c.target[1], c.target[2]];
  const done = route([c.reel, [c.lane, c.reel[1], c.wall], corner, plug, c.target]);
  return { sealed, done, branch: locate(sealed, corner), turn: locate(done, corner) };
}

function direction(a: Vec3, b: Vec3): Vec3 {
  const d = distance(a, b) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d];
}
