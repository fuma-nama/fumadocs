import { FRAME_H, FRAME_W, type LayoutId } from './data';
import { PLANS } from './plans';
import { createRopes, type Ropes, settleRopes } from './rope';

/**
 * The desk in its own units: a board 1000 wide whose height follows its width, so the server
 * draws the first frame exactly and the engine moves things in the same units. Three windows over
 * the junction box, three under it, their stamped names on the outer side of each row.
 */
export const BOARD = { w: 1000, h: 800 };
/** a window's box and its title bar; its content is 1.6:1 inside the frame line */
export const WINDOW = { w: 290, h: 210, bar: 28 };

interface Slot {
  id: LayoutId;
  x: number;
  y: number;
  column: 0 | 1 | 2;
  /** the row, the hub is between them */
  row: 0 | 1;
}

/** the 6 layouts around the hub, in the order of `LAYOUTS`: row by row, so slot `row * 3 + column` */
export const SLOTS: Slot[] = [
  { id: 'docs', x: 0, y: 0, column: 0, row: 0 },
  { id: 'notebook', x: 355, y: 0, column: 1, row: 0 },
  { id: 'flux', x: 710, y: 0, column: 2, row: 0 },
  { id: 'glass', x: 0, y: 590, column: 0, row: 1 },
  { id: 'spacious', x: 355, y: 590, column: 1, row: 1 },
  { id: 'home', x: 710, y: 590, column: 2, row: 1 },
];

/** the junction box: every layout's cable runs from its search trigger to it */
export const HUB = { x: 375, y: 320, w: 250, h: 160 };

/**
 * Where a slot's cable plugs in, from its top left corner, on its frame line facing the hub: the
 * windows above and below it under (or over) their search trigger, the ones on the sides level
 * with it.
 */
export function windowPort(slot: Slot): [x: number, y: number] {
  const [x, y, w, h] = PLANS[slot.id].search;
  if (slot.column === 1)
    return [1 + ((x + w / 2) / FRAME_W) * (WINDOW.w - 2), slot.row === 0 ? WINDOW.h : 0];
  const content = WINDOW.h - WINDOW.bar - 2;
  return [slot.column === 0 ? WINDOW.w : 0, 1 + WINDOW.bar + ((y + h / 2) / FRAME_H) * content];
}

/** where a slot's cable leaves the hub, from its top left corner: the line facing its window */
export function hubPort(slot: Slot): [x: number, y: number] {
  if (slot.column === 1) return [HUB.w / 2, slot.row === 0 ? 0 : HUB.h];
  return [slot.column === 0 ? 0 : HUB.w, HUB.h * (slot.row === 0 ? 0.42 : 0.76)];
}

/** how far a plug stands out of its jack; the cable runs on from its tail */
export const PLUG = 26;
/** a window's plate stands out of it this far at scale 1, `--plate` */
const PLATE = 14;
/** a window with its plate */
const SPAN = WINDOW.w + 2 * PLATE;
/** the chosen window's scale */
const CHOSEN = 1.4;
/** the room between two plates in a row: a side window's plug and its cable pass there */
const ROOM = 42;
/**
 * The scale the other windows step back to: the two beside the chosen one share what it leaves of
 * their row, the other row matches them.
 */
const BACK = (BOARD.w + 2 * PLATE - SPAN * CHOSEN - 2 * ROOM) / SPAN / 2;
/** how far the chosen window rises */
const RISE = 8;
/**
 * The hub steps out of the chosen window's way, away from its row as far as a cable needs between
 * the two plugs. From a side one it steps aside until its jack's plug sits `LEAN` past the
 * window's, so the cable drops away from the window; toward a middle one it leans `PULL` of the
 * way to its plug, so the cable beside it that runs under it surfaces clear of the plug.
 */
const LEAN = 8;
const ASIDE = PLATE * (CHOSEN - 1) + WINDOW.w * CHOSEN + 2 * PLUG + LEAN - HUB.x;
const PULL = 0.3;
const AWAY = 2 * PLUG + 20 - (HUB.y - WINDOW.h - (PLATE + WINDOW.h) * (CHOSEN - 1));
/** a cable is this much longer than the way between its ports, more beside a chosen one, or taut */
const SLACK = 1.04;
const SAG = 1.08;
const TAUT = 0.985;

/** where everything sits for a choice: what the springs settle to */
interface Pose {
  /** per window: how far it slides along its row, its scale, its lift (0 to 1) */
  windows: Float64Array;
  /** the hub's `x, y` from its place */
  hub: Float64Array;
  /** each cable's length */
  length: Float64Array;
}

export function createPose(): Pose {
  return {
    windows: new Float64Array(SLOTS.length * 3),
    hub: new Float64Array(2),
    length: new Float64Array(SLOTS.length),
  };
}

/** each slot's jacks: on its window (from its top left corner) and on the hub */
const PORTS = new Float64Array(SLOTS.length * 4);
/** the way each slot's jacks face, out of the frame line they sit on: `wx, wy, hx, hy` */
const FACING = new Float64Array(SLOTS.length * 4);
for (let i = 0; i < SLOTS.length; i++) {
  const { column, row } = SLOTS[i];
  PORTS.set([...windowPort(SLOTS[i]), ...hubPort(SLOTS[i])], i * 4);
  const wx = column === 1 ? 0 : column === 0 ? 1 : -1;
  const wy = column === 1 ? (row === 0 ? 1 : -1) : 0;
  FACING.set([wx, wy, -wx, -wy], i * 4);
}

/**
 * A plug in its jack, turned to face out: `end` 0 on the window, 1 on the hub; `ends` are the
 * cables' ends, the plugs' tails.
 */
export function plugTransform(i: number, ends: Float64Array, end: 0 | 1): string {
  const fx = FACING[i * 4 + end * 2];
  const fy = FACING[i * 4 + end * 2 + 1];
  const x = ends[i * 4 + end * 2] - fx * PLUG;
  const y = ends[i * 4 + end * 2 + 1] - fy * PLUG;
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(Math.atan2(fy, fx) * 180) / Math.PI})`;
}

/**
 * The x of a window's top left corner from its slot, slid by `slide`. It grows and shrinks with
 * its plate on the board's edge, the middle one around its centre.
 */
export function shiftX(slot: Slot, slide: number, s: number) {
  const inset = PLATE * (s - 1);
  if (slot.column === 0) return inset + slide;
  if (slot.column === 2) return WINDOW.w * (1 - s) - inset + slide;
  return (WINDOW.w / 2) * (1 - s) + slide;
}

/** the y of a window's top left corner from its slot, risen by `lift`: its plate on the board's edge */
export function shiftY(slot: Slot, s: number, lift: number) {
  const inset = PLATE * (s - 1);
  return (slot.row === 0 ? inset : WINDOW.h * (1 - s) - inset) - lift * RISE;
}

/**
 * The middle window of each row slides to centre between the plates of the two others, from the
 * scales in `windows`: it keeps its room on both sides as they grow and shrink.
 */
export function centre(windows: Float64Array) {
  for (let i = 1; i < SLOTS.length; i += 3)
    windows[i * 3] = (SPAN * (windows[(i - 1) * 3 + 1] - windows[(i + 1) * 3 + 1])) / 2;
}

/**
 * The pose of `selected`, written into `out`: the chosen window grows and rises, the rest step
 * back, and the hub steps out of its way.
 */
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
    cableEnds(i, out.windows, out.hub, ends, 0);
    out.length[i] =
      Math.hypot(ends[2] - ends[0], ends[3] - ends[1]) *
      (i === selected ? TAUT : chosen ? SAG : SLACK);
  }
  return out;
}

/**
 * Cable `i`'s `ax, ay, bx, by` into `out` at `at`, from the windows (slide, scale, lift) and the
 * hub: the tails of its plugs.
 */
export function cableEnds(
  i: number,
  windows: Float64Array,
  hub: Float64Array,
  out: Float64Array,
  at: number,
) {
  const slot = SLOTS[i];
  const s = windows[i * 3 + 1];
  out[at] = slot.x + shiftX(slot, windows[i * 3], s) + PORTS[i * 4] * s + FACING[i * 4] * PLUG;
  out[at + 1] =
    slot.y + shiftY(slot, s, windows[i * 3 + 2]) + PORTS[i * 4 + 1] * s + FACING[i * 4 + 1] * PLUG;
  out[at + 2] = HUB.x + hub[0] + PORTS[i * 4 + 2] + FACING[i * 4 + 2] * PLUG;
  out[at + 3] = HUB.y + hub[1] + PORTS[i * 4 + 3] + FACING[i * 4 + 3] * PLUG;
}

/** the points of cables hanging still: settled on the server, they reach the browser as they are */
export interface Hung {
  x: number[];
  y: number[];
}

/**
 * The cables hanging still in a pose. Settling them takes a while, so the browser starts from the
 * shape the server settled for the same pose, `hung`.
 */
export function hangRopes(at: Pose, hung?: Hung): Ropes {
  const ropes = createRopes(SLOTS.length);
  for (let i = 0; i < SLOTS.length; i++) {
    cableEnds(i, at.windows, at.hub, ropes.ends, i * 4);
    ropes.rest[i] = at.length[i];
  }
  if (!hung) settleRopes(ropes);
  else {
    // at rest: no speed left
    ropes.x.set(hung.x);
    ropes.px.set(hung.x);
    ropes.y.set(hung.y);
    ropes.py.set(hung.y);
  }
  return ropes;
}

/** `x` and `y` of a box in % of the board */
export function percent(x: number, y: number, w: number, h: number) {
  return {
    left: `${(x / BOARD.w) * 100}%`,
    top: `${(y / BOARD.h) * 100}%`,
    width: `${(w / BOARD.w) * 100}%`,
    height: `${(h / BOARD.h) * 100}%`,
  };
}

/** a window's transform, offsets in % of its own box: no px needed */
export function windowTransform(slot: Slot, slide: number, s: number, lift: number) {
  const x = (shiftX(slot, slide, s) / WINDOW.w) * 100;
  const y = (shiftY(slot, s, lift) / WINDOW.h) * 100;
  return `translate(${x.toFixed(3)}%,${y.toFixed(3)}%) scale(${s.toFixed(4)})`;
}

/** a lifted window's shadow: denser as it rises, at most 5 of 16 cells */
export function shadowLevel(lift: number) {
  return Math.min(5, Math.round(lift * 5));
}

/**
 * How far a lifted window's shadow spreads past its plate and falls, per column, in `cqw` so it is
 * the same on any desk. A side window's falls straight down, so its own cable beside it runs on
 * bare board; a middle one's spreads on every side, so the cables that run under it pass under its
 * shadow first.
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
