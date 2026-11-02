import { FIRST, FRAME, LAYOUTS, PLANS } from './data';

/** the fixed physics step (s) of the springs and the cables: the same motion at any frame rate */
export const STEP = 1 / 120;

/** the desk in its own units, its height following its width, so the server draws it exactly */
export const BOARD = { w: 1000, h: 800 };
/** a window and its title bar; its content is 1.6:1 inside the frame line */
export const WINDOW = { w: 290, h: 210, bar: 28 };
export const HUB = { x: 375, y: 320, w: 250, h: 160 };

/** three windows over the hub, three under it */
export const SLOTS = LAYOUTS.map((layout, i) => {
  const column = i % 3;
  const row = Math.floor(i / 3);
  return { ...layout, x: column * 355, y: row * 590, column, row };
});

type Slot = (typeof SLOTS)[number];

export const FIRST_SLOT = SLOTS.findIndex((slot) => slot.id === FIRST);

/** a cable's jack on its window, on the frame line facing the hub, by the search trigger */
export function windowPort(slot: Slot): [x: number, y: number] {
  const [x, y, w, h] = PLANS[slot.id].search;
  if (slot.column === 1)
    return [1 + ((x + w / 2) / FRAME.w) * (WINDOW.w - 2), slot.row === 0 ? WINDOW.h : 0];
  const content = WINDOW.h - WINDOW.bar - 2;
  return [slot.column === 0 ? WINDOW.w : 0, 1 + WINDOW.bar + ((y + h / 2) / FRAME.h) * content];
}

export function hubPort(slot: Slot): [x: number, y: number] {
  if (slot.column === 1) return [HUB.w / 2, slot.row === 0 ? 0 : HUB.h];
  return [slot.column === 0 ? 0 : HUB.w, HUB.h * (slot.row === 0 ? 0.42 : 0.76)];
}

/** how far a plug stands out of its jack */
export const PLUG = 26;
/** `--plate` at scale 1 */
const PLATE = 14;
const SPAN = WINDOW.w + 2 * PLATE;
const CHOSEN = 1.4;
/** a side window's plug and cable pass between two plates */
const ROOM = 42;
/** the two beside the chosen window share what it leaves of their row */
const BACK = (BOARD.w + 2 * PLATE - SPAN * CHOSEN - 2 * ROOM) / SPAN / 2;
const RISE = 8;
/**
 * The hub steps away from the chosen window's row as far as a cable needs between the two
 * plugs. From a side window it steps aside until its plug sits `LEAN` past the window's, so the
 * cable drops away; toward a middle one it leans `PULL` of the way, so the cable under it clears
 * the plug.
 */
const LEAN = 8;
const ASIDE = PLATE * (CHOSEN - 1) + WINDOW.w * CHOSEN + 2 * PLUG + LEAN - HUB.x;
const PULL = 0.3;
const AWAY = 2 * PLUG + 20 - (HUB.y - WINDOW.h - (PLATE + WINDOW.h) * (CHOSEN - 1));
/** a cable's length over the way between its ports: slack, sagging beside a chosen one, taut */
const SLACK = 1.04;
const SAG = 1.08;
const TAUT = 0.985;

export function createPose() {
  return {
    /** per window: its slide along its row, its scale, its lift (0 to 1) */
    windows: new Float64Array(SLOTS.length * 3),
    hub: new Float64Array(2),
    length: new Float64Array(SLOTS.length),
  };
}

type Pose = ReturnType<typeof createPose>;

/** each slot's jacks `wx, wy, hx, hy`, and the way they face out of their frame lines */
const PORTS = new Float64Array(SLOTS.length * 4);
const FACING = new Float64Array(SLOTS.length * 4);
for (let i = 0; i < SLOTS.length; i++) {
  const { column, row } = SLOTS[i];
  PORTS.set([...windowPort(SLOTS[i]), ...hubPort(SLOTS[i])], i * 4);
  const wx = column === 1 ? 0 : column === 0 ? 1 : -1;
  const wy = column === 1 ? (row === 0 ? 1 : -1) : 0;
  FACING.set([wx, wy, -wx, -wy], i * 4);
}

/** a plug in its jack, facing out: `end` 0 on the window, 1 on the hub */
export function plugTransform(i: number, ends: Float64Array, end: 0 | 1): string {
  const fx = FACING[i * 4 + end * 2];
  const fy = FACING[i * 4 + end * 2 + 1];
  const x = ends[i * 4 + end * 2] - fx * PLUG;
  const y = ends[i * 4 + end * 2 + 1] - fy * PLUG;
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(Math.atan2(fy, fx) * 180) / Math.PI})`;
}

/** a window grows with its plate on the board's edge, a middle one around its centre */
function shiftX(slot: Slot, slide: number, s: number) {
  const inset = PLATE * (s - 1);
  if (slot.column === 0) return inset + slide;
  if (slot.column === 2) return WINDOW.w * (1 - s) - inset + slide;
  return (WINDOW.w / 2) * (1 - s) + slide;
}

function shiftY(slot: Slot, s: number, lift: number) {
  const inset = PLATE * (s - 1);
  return (slot.row === 0 ? inset : WINDOW.h * (1 - s) - inset) - lift * RISE;
}

/** the middle window of each row keeps its room on both sides */
export function centre(windows: Float64Array) {
  for (let i = 1; i < SLOTS.length; i += 3)
    windows[i * 3] = (SPAN * (windows[(i - 1) * 3 + 1] - windows[(i + 1) * 3 + 1])) / 2;
}

/** the pose of `selected` into `out`, `-1` for none */
export function pose(selected: number, out: Pose): Pose {
  const chosen = selected >= 0 ? SLOTS[selected] : null;
  for (let i = 0; i < SLOTS.length; i++) {
    out.windows[i * 3 + 1] = i === selected ? CHOSEN : chosen ? BACK : 1;
    out.windows[i * 3 + 2] = i === selected ? 1 : 0;
  }
  centre(out.windows);

  if (!chosen) out.hub[0] = 0;
  else if (chosen.column === 1)
    out.hub[0] =
      PULL * (chosen.x + shiftX(chosen, 0, CHOSEN) + PORTS[selected * 4] * CHOSEN - BOARD.w / 2);
  else out.hub[0] = (1 - chosen.column) * ASIDE;
  out.hub[1] = chosen ? (chosen.row === 0 ? AWAY : -AWAY) : 0;

  const ends = new Float64Array(4);
  for (let i = 0; i < SLOTS.length; i++) {
    cableEnds(i, out, ends, 0);
    out.length[i] =
      Math.hypot(ends[2] - ends[0], ends[3] - ends[1]) *
      (i === selected ? TAUT : chosen ? SAG : SLACK);
  }
  return out;
}

export const FIRST_POSE = pose(FIRST_SLOT, createPose());

/** cable `i`'s ends at `at` (its plugs' tails) as `ax, ay, bx, by`, into `out` from `offset` */
export function cableEnds(i: number, at: Pose, out: Float64Array, offset: number) {
  const slot = SLOTS[i];
  const s = at.windows[i * 3 + 1];
  out[offset] =
    slot.x + shiftX(slot, at.windows[i * 3], s) + PORTS[i * 4] * s + FACING[i * 4] * PLUG;
  out[offset + 1] =
    slot.y +
    shiftY(slot, s, at.windows[i * 3 + 2]) +
    PORTS[i * 4 + 1] * s +
    FACING[i * 4 + 1] * PLUG;
  out[offset + 2] = HUB.x + at.hub[0] + PORTS[i * 4 + 2] + FACING[i * 4 + 2] * PLUG;
  out[offset + 3] = HUB.y + at.hub[1] + PORTS[i * 4 + 3] + FACING[i * 4 + 3] * PLUG;
}

export interface Hung {
  x: number[];
  y: number[];
}

/** the cables hanging still in a pose; settling takes a while, so the browser takes `hung` */
export function hangRopes(at: Pose, hung?: Hung) {
  const ropes = createRopes(SLOTS.length);
  for (let i = 0; i < SLOTS.length; i++) {
    cableEnds(i, at, ropes.ends, i * 4);
    ropes.rest[i] = at.length[i];
  }
  if (!hung) settleRopes(ropes);
  else {
    ropes.x.set(hung.x);
    ropes.px.set(hung.x);
    ropes.y.set(hung.y);
    ropes.py.set(hung.y);
  }
  return ropes;
}

export function percent(x: number, y: number, w: number, h: number, of = BOARD) {
  return {
    left: `${(x / of.w) * 100}%`,
    top: `${(y / of.h) * 100}%`,
    width: `${(w / of.w) * 100}%`,
    height: `${(h / of.h) * 100}%`,
  };
}

/** in % of the window's own box */
export function windowTransform(slot: Slot, slide: number, s: number, lift: number) {
  const x = (shiftX(slot, slide, s) / WINDOW.w) * 100;
  const y = (shiftY(slot, s, lift) / WINDOW.h) * 100;
  return `translate(${x.toFixed(3)}%,${y.toFixed(3)}%) scale(${s.toFixed(4)})`;
}

/** a lifted window's shadow darkens as it rises, to 5 of 16 cells */
export function shadowLevel(lift: number) {
  return Math.min(5, Math.round(lift * 5));
}

/**
 * How far a lifted window's shadow spreads past its plate and falls, in `cqw`: a side window's
 * falls straight down, so its own cable runs on bare board; a middle one's spreads, so the cables
 * under it pass under its shadow first.
 */
const SPREAD = [0, 0.8, 0];
const FALL = [0.8, 0.4, 0.8];

export function shadowInset(slot: Slot) {
  return `calc(-1 * (var(--plate) + ${SPREAD[slot.column]}cqw))`;
}

export function shadowTransform(slot: Slot, lift: number) {
  return `translateY(${(lift * FALL[slot.column]).toFixed(3)}cqw)`;
}

export function hubTransform(x: number, y: number) {
  return `translate(${((x / HUB.w) * 100).toFixed(3)}%,${((y / HUB.h) * 100).toFixed(3)}%)`;
}

/** points per cable, its ends included */
const POINTS = 14;
const GRAVITY = 2600;
const DAMPING = 0.985;
const ITERATIONS = 10;
/** the point a cable's tie holds, from the window */
const TIE = 4;

/** the cables as verlet ropes, their ends pinned to their ports */
function createRopes(count: number) {
  const n = count * POINTS;
  return {
    count,
    x: new Float64Array(n),
    y: new Float64Array(n),
    px: new Float64Array(n),
    py: new Float64Array(n),
    /** `ax, ay, bx, by` per cable */
    ends: new Float64Array(count * 4),
    rest: new Float64Array(count),
  };
}

type Ropes = ReturnType<typeof createRopes>;

/** gravity, then each segment's length; returns the largest move */
export function stepRopes(r: Ropes): number {
  const g = GRAVITY * STEP * STEP;
  let moved = 0;
  for (let c = 0; c < r.count; c++) {
    const base = c * POINTS;
    for (let i = 1; i < POINTS - 1; i++) {
      const k = base + i;
      const vx = (r.x[k] - r.px[k]) * DAMPING;
      const vy = (r.y[k] - r.py[k]) * DAMPING;
      r.px[k] = r.x[k];
      r.py[k] = r.y[k];
      r.x[k] += vx;
      r.y[k] += vy + g;
    }
    const segment = r.rest[c] / (POINTS - 1);
    const last = base + POINTS - 1;
    for (let it = 0; it < ITERATIONS; it++) {
      r.x[base] = r.ends[c * 4];
      r.y[base] = r.ends[c * 4 + 1];
      r.x[last] = r.ends[c * 4 + 2];
      r.y[last] = r.ends[c * 4 + 3];
      for (let i = 0; i < POINTS - 1; i++) {
        const a = base + i;
        const b = a + 1;
        const dx = r.x[b] - r.x[a];
        const dy = r.y[b] - r.y[a];
        const d = Math.hypot(dx, dy) || 1e-6;
        const f = (d - segment) / d;
        // a pinned end doesn't move, its neighbour takes the whole correction
        const fa = i === 0 ? 0 : i === POINTS - 2 ? f : f / 2;
        const fb = i === POINTS - 2 ? 0 : i === 0 ? f : f / 2;
        r.x[a] += dx * fa;
        r.y[a] += dy * fa;
        r.x[b] -= dx * fb;
        r.y[b] -= dy * fb;
      }
    }
    for (let i = 1; i < POINTS - 1; i++) {
      const k = base + i;
      moved = Math.max(moved, Math.abs(r.x[k] - r.px[k]), Math.abs(r.y[k] - r.py[k]));
    }
  }
  return moved;
}

/** from straight between their ends to hanging still, at rest */
function settleRopes(r: Ropes) {
  for (let c = 0; c < r.count; c++) {
    const [ax, ay, bx, by] = r.ends.subarray(c * 4, c * 4 + 4);
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      const k = c * POINTS + i;
      r.x[k] = r.px[k] = ax + (bx - ax) * t;
      r.y[k] = r.py[k] = ay + (by - ay) * t;
    }
  }
  for (let i = 0; i < 600; i++) if (stepRopes(r) < 1e-4 && i > 60) break;
  r.px.set(r.x);
  r.py.set(r.y);
}

export function ropePath(r: Ropes, c: number): string {
  const base = c * POINTS;
  const f = (v: number) => Math.round(v * 10) / 10;
  let d = `M${f(r.x[base])} ${f(r.y[base])}`;
  for (let i = 1; i < POINTS - 1; i++) {
    const k = base + i;
    const mx = (r.x[k] + r.x[k + 1]) / 2;
    const my = (r.y[k] + r.y[k + 1]) / 2;
    d += `Q${f(r.x[k])} ${f(r.y[k])} ${f(mx)} ${f(my)}`;
  }
  const end = base + POINTS - 1;
  d += `L${f(r.x[end])} ${f(r.y[end])}`;
  return d;
}

export function tieTransform(r: Ropes, c: number): string {
  const k = c * POINTS + TIE;
  const deg = (Math.atan2(r.y[k + 1] - r.y[k - 1], r.x[k + 1] - r.x[k - 1]) * 180) / Math.PI;
  return `translate(${r.x[k].toFixed(1)} ${r.y[k].toFixed(1)}) rotate(${deg.toFixed(1)})`;
}
