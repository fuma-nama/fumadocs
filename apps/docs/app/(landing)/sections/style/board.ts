import { FRAME_H, type LayoutId } from './data';
import { PLANS } from './plans';
import { createRopes, type Ropes, settleRopes } from './rope';

/**
 * The desk in its own units: a board 1000 wide whose size follows its column, so the server
 * draws the first frame exactly and the engine moves things in the same units.
 */
export const BOARD = { w: 1000, h: 990 };
/** a window's box and its title bar; its content is 1.6:1 inside the frame line */
export const WINDOW = { w: 360, h: 260, bar: 34 };

export interface Slot {
  id: LayoutId;
  x: number;
  y: number;
  /** the column, the hub is on the other side */
  column: 0 | 1;
  row: 0 | 1 | 2;
}

/**
 * The 6 layouts around the hub, in the order of `LAYOUTS`. The top row is on the board's edge,
 * a hovered window lifts out over it; each row's caption sits in the gap under it.
 */
export const SLOTS: Slot[] = [
  { id: 'docs', x: 0, y: 0, column: 0, row: 0 },
  { id: 'notebook', x: 640, y: 0, column: 1, row: 0 },
  { id: 'flux', x: 0, y: 330, column: 0, row: 1 },
  { id: 'glass', x: 640, y: 330, column: 1, row: 1 },
  { id: 'spacious', x: 0, y: 660, column: 0, row: 2 },
  { id: 'home', x: 640, y: 660, column: 1, row: 2 },
];

/** the shared search trigger, every layout's cable runs to it */
export const HUB = { x: 400, y: 380, w: 200, h: 160 };
/** the hub's ports on its top and bottom lines, in from its sides */
const HUB_INSET = 60;

/** where a slot's cable plugs in: its frame line facing the hub, level with its search trigger */
export function windowPort(slot: Slot): [x: number, y: number] {
  const [, y, , h] = PLANS[slot.id].search;
  const content = WINDOW.h - WINDOW.bar - 2;
  return [
    slot.column === 0 ? slot.x + WINDOW.w : slot.x,
    slot.y + 1 + WINDOW.bar + ((y + h / 2) / FRAME_H) * content,
  ];
}

/**
 * Where a slot's cable leaves the hub, on the line facing its window: the windows beside it plug
 * in level with the search trigger, the ones above and below on its top and bottom lines.
 */
export function hubPort(slot: Slot): [x: number, y: number] {
  if (slot.row === 1) {
    const bar = (HUB.h * WINDOW.bar) / WINDOW.h;
    return [slot.column === 0 ? HUB.x : HUB.x + HUB.w, HUB.y + bar + (HUB.h - bar) / 2];
  }
  return [
    slot.column === 0 ? HUB.x + HUB_INSET : HUB.x + HUB.w - HUB_INSET,
    slot.row === 0 ? HUB.y : HUB.y + HUB.h,
  ];
}

/**
 * A cable at rest is this much longer than the way to its port, per row: the ones rising to the
 * top row hang almost straight, more would sag under the hub.
 */
const SLACK = [1.03, 1.08, 1.08];

/** the cables at rest, the same on the server and in the browser */
export function restRopes(): Ropes {
  const ropes = createRopes(SLOTS.length);
  for (let i = 0; i < SLOTS.length; i++) {
    const [ax, ay] = windowPort(SLOTS[i]);
    const [bx, by] = hubPort(SLOTS[i]);
    ropes.ends.set([ax, ay, bx, by], i * 4);
    ropes.rest[i] = Math.hypot(bx - ax, by - ay) * SLACK[SLOTS[i].row];
  }
  settleRopes(ropes);
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
