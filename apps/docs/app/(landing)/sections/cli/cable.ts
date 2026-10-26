export type Vec3 = [number, number, number];

/** a cable's path, sampled: points and the arc length at each */
export interface Route {
  points: Vec3[];
  at: number[];
  length: number;
}

/** how far a corner rounds off, and the samples in each */
const BEND = 12;
const SAMPLES = 4;

/** `corners` joined by straight runs, each inner corner rounded */
function route(corners: Vec3[]): Route {
  const points: Vec3[] = [corners[0]];
  for (let i = 1; i < corners.length - 1; i++) {
    const p = corners[i];
    const a = direction(corners[i - 1], p);
    const b = direction(p, corners[i + 1]);
    const r = Math.min(BEND, distance(corners[i - 1], p) / 2, distance(p, corners[i + 1]) / 2);
    const from: Vec3 = [p[0] - a[0] * r, p[1] - a[1] * r, p[2] - a[2] * r];
    const to: Vec3 = [p[0] + b[0] * r, p[1] + b[1] * r, p[2] + b[2] * r];
    for (let k = 0; k <= SAMPLES; k++) {
      const t = k / SAMPLES;
      const s = 1 - t;
      points.push([
        s * s * from[0] + 2 * s * t * p[0] + t * t * to[0],
        s * s * from[1] + 2 * s * t * p[1] + t * t * to[1],
        s * s * from[2] + 2 * s * t * p[2] + t * t * to[2],
      ]);
    }
  }
  points.push(corners[corners.length - 1]);
  const at = [0];
  for (let i = 1; i < points.length; i++) at.push(at[i - 1] + distance(points[i - 1], points[i]));
  return { points, at, length: at[at.length - 1] };
}

/** the point `s` along a route, clamped to its ends */
export function pointAt(r: Route, s: number, out: Vec3): Vec3 {
  if (s <= 0) return copy(r.points[0], out);
  if (s >= r.length) return copy(r.points[r.points.length - 1], out);
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

/** the arc length of the route's point nearest to `p` */
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

interface CableAnchors {
  /** where it leaves the reel, on the window's edge */
  reel: Vec3;
  /** the gutter it runs down, and how deep it hangs off the wall */
  lane: number;
  wall: number;
  /** the floor, and the depth of its run in front of everything */
  floor: number;
  front: number;
  /** where its run toward the viewer meets the front: straight down the screen from the gutter, so
   * the perspective doesn't swing it onto the windows beside it */
  forward: number;
  /** the socket on the crate's front, its plug enters toward -z */
  socket: Vec3;
  /** the socket on your folder's row, at the window's right edge, entered toward -x */
  target: Vec3;
}

/**
 * A cable's routes: plugged into the crate, and plugged into your folder. Both share their start up
 * to the branch, where the gutter reaches your folder's row: `branch` along the first, `turn` along
 * the second.
 */
export function routes(c: CableAnchors): {
  sealed: Route;
  done: Route;
  branch: number;
  turn: number;
} {
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
  const plug: Vec3 = [c.target[0] + PLUG, c.target[1], c.target[2]];
  const done = route([
    c.reel,
    [c.lane, c.reel[1], c.wall],
    [c.lane, c.target[1], c.wall],
    plug,
    c.target,
  ]);
  const corner: Vec3 = [c.lane, c.target[1], c.wall];
  return { sealed, done, branch: locate(sealed, corner), turn: locate(done, corner) };
}

/** a cable's radius; its plug, drawn thicker at its end, is this long */
export const RADIUS = 3.5;
export const PLUG = 18;

function direction(a: Vec3, b: Vec3): Vec3 {
  const d = distance(a, b) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d];
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

function copy(a: Vec3, out: Vec3): Vec3 {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
