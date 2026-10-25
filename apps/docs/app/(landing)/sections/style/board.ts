import { FRAME_H, FRAME_W, type LayoutId } from './data';
import { PLANS } from './plans';
import { createRopes, type Ropes, settleRopes } from './rope';

/**
 * The desk in its own units: a board 1000 wide whose height follows its width, so the server
 * draws the first frame exactly and the engine moves things in the same units. Three windows over
 * the hub, three under it; each row's captions sit outside the board, on its outer side.
 */
export const BOARD = { w: 1000, h: 620 };
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

/** the 6 layouts around the hub, in the order of `LAYOUTS` */
export const SLOTS: Slot[] = [
  { id: 'docs', x: 0, y: 0, column: 0, row: 0 },
  { id: 'notebook', x: 355, y: 0, column: 1, row: 0 },
  { id: 'flux', x: 710, y: 0, column: 2, row: 0 },
  { id: 'glass', x: 0, y: 410, column: 0, row: 1 },
  { id: 'spacious', x: 355, y: 410, column: 1, row: 1 },
  { id: 'home', x: 710, y: 410, column: 2, row: 1 },
];

/** the shared search trigger, every layout's cable runs to it */
export const HUB = { x: 390, y: 255, w: 220, h: 110 };

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

/** a chosen window grows this much from its outer edges, toward the hub */
const GROW = 1.06;
/** a neighbour in its row slides this far away, or squeezes when the board's edge holds it */
const NUDGE = 18;
const SQUEEZE = 0.97;
/** how far a lifted window rises, and how high a hovered one lifts */
const RISE = 8;
const HOVER = 0.55;
/** the hub leans toward the chosen window */
const LEAN = 8;
/** a cable is this much longer than the way between its ports, or pulled taut */
const SLACK = 1.04;
const TAUT = 0.985;

/** where everything sits for a choice and a hover: what the springs settle to */
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

/** each slot's cable ends: on its window (from its top left corner) and on the hub */
const PORTS = new Float64Array(SLOTS.length * 4);
for (let i = 0; i < SLOTS.length; i++) {
  PORTS.set([...windowPort(SLOTS[i]), ...hubPort(SLOTS[i])], i * 4);
}

/**
 * The x of a window's top left corner from its slot. It grows and shrinks from a fixed point, the
 * edge it shares with the board (the middle column from its centre), so that edge never moves.
 */
export function shiftX(slot: Slot, slide: number, s: number) {
  return (slot.column / 2) * WINDOW.w * (1 - s) + slide;
}

/** the y of a window's top left corner from its slot, risen by `lift` */
export function shiftY(slot: Slot, s: number, lift: number) {
  return slot.row * WINDOW.h * (1 - s) - lift * RISE;
}

/** the pose of `selected` with `hovered` lifted, written into `out` */
export function pose(selected: number, hovered: number, out: Pose): Pose {
  const chosen = selected >= 0 ? SLOTS[selected] : null;
  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    let s = 1;
    let slide = 0;
    if (i === selected) s = GROW;
    else if (chosen && chosen.row === slot.row) {
      // the middle one makes room by sliding, the outer ones by shrinking against the edge
      if (slot.column === 1) slide = Math.sign(slot.column - chosen.column) * NUDGE;
      else s = SQUEEZE;
    }
    out.windows[i * 3] = slide;
    out.windows[i * 3 + 1] = s;
    out.windows[i * 3 + 2] = i === selected ? 1 : i === hovered ? HOVER : 0;
  }

  out.hub[0] = 0;
  out.hub[1] = 0;
  if (chosen) {
    const dx = chosen.x + WINDOW.w / 2 - (HUB.x + HUB.w / 2);
    const dy = chosen.y + WINDOW.h / 2 - (HUB.y + HUB.h / 2);
    const d = Math.hypot(dx, dy);
    out.hub[0] = (dx / d) * LEAN;
    out.hub[1] = (dy / d) * LEAN;
  }

  const ends = new Float64Array(4);
  for (let i = 0; i < SLOTS.length; i++) {
    cableEnds(i, out.windows, out.hub, ends, 0);
    out.length[i] =
      Math.hypot(ends[2] - ends[0], ends[3] - ends[1]) * (i === selected ? TAUT : SLACK);
  }
  return out;
}

/** cable `i`'s `ax, ay, bx, by` into `out` at `at`, from the windows (slide, scale, lift) and the hub */
export function cableEnds(
  i: number,
  windows: Float64Array,
  hub: Float64Array,
  out: Float64Array,
  at: number,
) {
  const slot = SLOTS[i];
  const s = windows[i * 3 + 1];
  out[at] = slot.x + shiftX(slot, windows[i * 3], s) + PORTS[i * 4] * s;
  out[at + 1] = slot.y + shiftY(slot, s, windows[i * 3 + 2]) + PORTS[i * 4 + 1] * s;
  out[at + 2] = HUB.x + hub[0] + PORTS[i * 4 + 2];
  out[at + 3] = HUB.y + hub[1] + PORTS[i * 4 + 3];
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

/** a lifted window's shadow: denser as it rises (at most 5 of 16 cells), falling toward the hub */
export function shadowLevel(lift: number) {
  return Math.min(5, Math.round(lift * 5));
}

export function shadowTransform(slot: Slot, lift: number) {
  const fall = lift * 6;
  return `translate(${((1 - slot.column) * fall).toFixed(2)}px,${fall.toFixed(2)}px)`;
}

export function hubTransform(x: number, y: number) {
  return `translate(${((x / HUB.w) * 100).toFixed(3)}%,${((y / HUB.h) * 100).toFixed(3)}%)`;
}
