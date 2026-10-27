import { cubicBezier } from 'motion/react';
import {
  BLINK,
  type MateInk,
  mateInk,
  ORBIT_STEPS,
  paintMate,
  STEP,
} from '@/components/mascot/paint';
import {
  ARM_BOX,
  CROWN_CELL,
  MATE_H,
  MATE_PAD,
  MATE_RISE,
  MATE_W,
  POSE_BOX,
  poseOf,
  SEAT_CELL,
  silhouette,
  SPRITE_H,
  SPRITE_W,
} from '@/components/mascot/sprite';
import { createShaderCanvas, cssRgb, cssRgba } from '../../lib/gl';
import { camera, clamp, type Rect, rectIn, settle, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { isDark, onTheme } from '../../lib/theme';
import {
  BED,
  BED_DECK,
  BOOM,
  COLUMN_DECK,
  fragment,
  PEN,
  PENCIL,
  ram,
  type Vec2,
  YOKE,
} from './scene';

/** ms a key takes, two a frame at 60 Hz */
const CHAR = 1000 / 120;
const GAP = 140;
/** ms a finished block's tab shows inverted */
const POP = 60;
/** a press's beats, ms; the slide takes SLIDE_MS a px, within SLIDE */
const DRIVE = 460;
const TIP_UP = 140;
const TIP_DOWN = 200;
const DROP = 160;
const SLIDE_MS = 1.5;
const SLIDE: Vec2 = [260, 520];
const LIFT = 160;
const REST = 60;
const PARK = 700;
const ARRIVE = 40;
/** a long move cruises at TOP px/ms between RAMP ms ramps; under SHORT px it keeps the drive's */
const TOP = 2.8;
const RAMP = 160;
const SHORT = (TOP * DRIVE) / 2.857;
/** of the drop, the share after the arm has stopped */
const SETTLE = 0.25;
/** ms a radian takes at its gentlest: the boom's turn, the elbow's bend */
const TURN_RATE = 140;
const BEND_RATE = 110;
/** a phone's elbow sweep (px/ms); rad off its aim a boom still swings; windows' overlap share */
const SWING = 1;
const SWUNG = 0.3;
const OVERLAP = 0.35;
/** ms an arm caught mid-move brakes before it sets off anew */
const BRAKE = 32;
/** the elbow's inner angle at both ends of a slide, rad; folded at rest it leaves TUCK */
const INNER: Vec2 = [(50 * Math.PI) / 180, (150 * Math.PI) / 180];
const TUCK = 0.06;
/** her pencil stood up on its trunnion; up a phone's column never further, never end-on */
const UPRIGHT = Math.PI / 2;
const STEEP = Math.PI / 3;
const FADE = (16 * 1000) / 60;
/** world px: how high the camera stands over the page */
const CAMERA = 4000;
/** high from the upper right, so shadows stay short and fall on the plate or into the bay */
const LIGHT = normalize(0.13, -0.18, 0.975);
/** share of the stage in view that starts the writer */
const START = 0.4;
/** a reader's springs: stiffness (1/s), top speeds (px/s, rad/s), and her pencil's tip */
const AIM = 10;
const AIM_SPEED = 1500;
const AIM_SLEW = 7;
const AIM_TIP = 16;
/** up a phone's column the arm follows the line read this far down the viewport, on this spring */
const READ = 0.45;
const SCROLL_AIM = 16;
const AIM_GAP = 10;
/** ms a resting mouse holds the rig before it goes home */
const IDLE = 2000;
const NOTE = 1500;
/** ms within which a second click makes a double-click, which selects a word */
const DOUBLE = 250;
/** the rig's scale, and her moon's ring (cells wide) on the bed and up a phone's column */
const RIG_SCALE = 0.6;
const RING: Vec2 = [21, 13];
/** px a phone's pencil point keeps clear of the widest tab */
const TAB_CLEAR = 24;
/** px a phone's column rail stops short of the window's top and foot, for her crown and deck */
const COLUMN_END: Vec2 = [96, 44];
/** the pressure gauge: at rest, while the pencil slides, as it lifts */
const GAUGE: [number, number, number] = [0.2, 0.75, 1];
/** px off her head past which her eyes follow the pencil or the cursor */
const GLANCE = 60;
/** ms she raises her remote before a press sets off; ms between her arm's poses */
const LEAD = TICK;
const SWAY = 48;
/** degrees from her shoulder: her remote low under the first, up over the second; with slack */
const RAISE: Vec2 = [-30, 50];
const RAISE_SLACK = 8;
const HAND_SLACK = 8;
/** px: her pencil's point inside a cell's edges, the pivot clear of a tab's sides, she of a tab */
const INSET = 2;
const PIVOT_CLEAR = 18;
const HER_CLEAR = 6;
/** arm units round the elbow its eye, crank and yoke reach, kept inside the window */
const ELBOW = 50;
const DOWN = Math.PI / 2;
/** her pencil's radius to its hexagon's corners, arm units */
const PEN_R = PENCIL.radius * 1.16;

const ease = cubicBezier(...settle);
const inOut = cubicBezier(...camera);

function within(u: number, w: Vec2): number {
  if (w[1] <= w[0]) return u >= w[1] ? 1 : 0;
  return clamp((u - w[0]) / (w[1] - w[0]));
}

/** a long move's progress with ramps of share r: the camera curve's halves round a cruise */
function cruise(r: number): (u: number) => number {
  const v = 1 / (1 - 1.3 * r);
  const d = 0.35 * r * v;
  return (u) => {
    if (u <= r) return 2 * d * inOut(u / (2 * r));
    if (u >= 1 - r) return 1 - 2 * d * inOut((1 - u) / (2 * r));
    return d + v * (u - r);
  };
}

function crosses(x0: number, y0: number, x1: number, y1: number, r: number, b: Rect): boolean {
  let enter = 0;
  let leave = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const sides: [number, number][] = [
    [-dx, x0 - (b.x - r)],
    [dx, b.x + b.w + r - x0],
    [-dy, y0 - (b.y - r)],
    [dy, b.y + b.h + r - y0],
  ];
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) enter = Math.max(enter, t);
    else leave = Math.min(leave, t);
    if (enter > leave) return false;
  }
  return true;
}

function inBox(x: number, y: number, r: number, b: Rect): boolean {
  return x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r;
}

/** `angle` turned by whole turns nearest to `near`, so a turn takes the short way round */
function nearest(angle: number, near: number): number {
  const turn = 2 * Math.PI;
  return angle + Math.round((near - angle) / turn) * turn;
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** a move from pose `a` to `b` over [t0, t1]; a slide (`task`) runs her pencil's point straight */
interface Segment {
  t0: number;
  t1: number;
  a: number[];
  b: number[];
  ease: (u: number, i: number) => number;
  tilt?: (u: number) => number;
  bend?: (u: number) => number;
  task?: { a: number[]; b: number[]; bend: number };
}

interface Leg {
  end: number[];
  time: number;
  ease: (u: number, i: number) => number;
  tilt: (u: number) => number;
  bend?: (u: number) => number;
}

interface Block {
  el: HTMLElement;
  src: HTMLElement;
  out: HTMLElement;
  tab: HTMLElement;
  label: string;
  lines: HTMLElement[];
  lengths: number[];
  status: string;
  keys: number;
  /** shows its output before this plan's presses */
  base: boolean;
  cell: Rect;
  tabBox: Rect;
  rows: Vec2[];
  /** per source line, the characters its wrapped rows start at */
  breaks: number[][];
  /** its slide: the point's line, its top and foot, the carriage at each, the elbow's side */
  tipX: number;
  range: Vec2;
  stop: number;
  stopEnd: number;
  bend: number;
  /** clock times the writer starts and finishes it */
  type: number;
  typed: number;
  /** what is on screen, so a frame writes only what changed */
  shownLines: number;
  clip: string;
  tabState: number;
  framed: boolean;
  wipe: number;
  srcShown: boolean;
  pressed: boolean;
  queued: boolean;
}

interface Ask {
  block: Block;
  out: boolean;
  /** framed from `held`; it sets off no sooner than `earliest`, the pencil drops after `descend` */
  held: number;
  earliest: number;
  descend: number;
  /** asked while the sequence plays: it waits for its end */
  queued: boolean;
  reader: boolean;
}

/** a planned press: it sets off at `go`, slides from `touch` to `hit`, and is free at `free` */
interface Job {
  ask: Ask;
  go: number;
  touch: number;
  hit: number;
  free: number;
}

/** a file's blocks typed and pressed into its page: everything on screen is a function of the
 * cycle's clock, run on the shader's frames; after the sequence the rig is the reader's */
export function createPress(stage: HTMLElement): () => void {
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas[data-arm]')!;
  const doc = stage.querySelector<HTMLElement>('[data-doc]')!;
  const bed = stage.querySelector<HTMLElement>('[data-bay]')!;
  const column = stage.querySelector<HTMLElement>('[data-bay-phone]')!;
  const fixedRun = stage.querySelector<HTMLElement>('[data-chain="fixed"]')!;
  const pulledRun = stage.querySelector<HTMLElement>('[data-chain="pulled"]')!;
  const bend = stage.querySelector<SVGElement>('[data-chain="bend"]')!;
  const stations = stage.querySelectorAll<SVGElement>('[data-station]');
  const mate = stage.querySelector<HTMLCanvasElement>('canvas[data-mate]')!;
  const mateImage = new ImageData(MATE_W, MATE_H);
  mate.width = MATE_W;
  mate.height = MATE_H;
  const typingLine = `typing ${stage.dataset.file}`;
  const caret = stage.querySelector<HTMLElement>('[data-caret]')!;
  const button = stage.querySelector<HTMLButtonElement>('[data-replay]')!;
  const voice = stage.querySelector<HTMLElement>('[data-voice]')!;
  /** the figure's own line, once there is nothing going on */
  const compiled = stage.closest<HTMLElement>('[data-figure]')?.dataset.status ?? '';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const blocks: Block[] = [];
  for (const el of stage.querySelectorAll<HTMLElement>('[data-block]')) {
    const lines = [...el.querySelectorAll<HTMLElement>('[data-line]')];
    const lengths: number[] = [];
    let keys = lines.length - 1;
    for (const line of lines) {
      lengths.push(line.textContent!.length);
      keys += line.textContent!.length;
    }
    const tab = el.querySelector<HTMLElement>('[data-tab]')!;
    blocks.push({
      el,
      src: el.querySelector('[data-src]')!,
      out: el.querySelector('[data-out]')!,
      tab,
      label: tab.textContent!,
      lines,
      lengths,
      status: el.dataset.status ?? '',
      keys,
      base: true,
      cell: { x: 0, y: 0, w: 0, h: 0 },
      tabBox: { x: 0, y: 0, w: 0, h: 0 },
      rows: [],
      breaks: [],
      tipX: 0,
      range: [0, 0],
      stop: 0,
      stopEnd: 0,
      bend: -1,
      type: 0,
      typed: 0,
      shownLines: lines.length,
      clip: '',
      tabState: 2,
      framed: false,
      wipe: 1,
      srcShown: false,
      pressed: false,
      queued: false,
    });
  }

  const shader = createShaderCanvas(canvas, { fragment, onFrame });
  shader?.texture('uSprite', silhouette(0));

  // metrics, stage px
  let scale = 1;
  /** her cell, CSS px */
  let cell = 2;
  let foot: Vec2 = [0, 0];
  /** the rail: along x (0) on the bed, y (1) up a phone's column, from (x0, y0) to (x1, y1) */
  let along = 0;
  const rail = [0, 0, 0, 0];
  let deck = BED_DECK;
  /** the bed's band (the drag chain), the bay the carriage rides (her shadow); plates below it */
  let band: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let bay: Rect = band;
  let below = false;
  let boom = 1;
  let fore = 1;
  let reachMax = Infinity;
  let advance = 8;
  let lineHeight = 20;
  let readAt = 0;
  let inside: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // the plan: the asked presses in order from a pose at a time, then the park. A pose is the
  // carriage, the boom's angle, her pencil's from the boom, and its tip up off the page
  const asks: Ask[] = [];
  const jobs: Job[] = [];
  const track: Segment[] = [];
  const pen: Segment[] = [];
  let park: number[] = [0, 0, TUCK - Math.PI, 0];
  /** up a phone's column, how far her folded pencil opens off the boom to the window's border */
  let fold = TUCK;
  let from: number[] = park;
  /** the plan a press took over from mid-move, its first pose, and when: the arm brakes along it */
  let brake: { track: Segment[]; from: number[]; at: number } | null = null;
  const other = [0, 0, 0, 0];
  let since = 0;
  let total = 0;
  let clock = 0;
  /** rest: nothing to do; ready: an empty file awaiting the view; fade: the page dithers out */
  let phase: 'rest' | 'ready' | 'fade' | 'play' = 'rest';
  /** the writer has started (till then the page is the server's), and its sequence still plays */
  let begun = false;
  let playing = false;
  let fading = 0;
  let last = -1;
  let onScreen = false;

  let aiming = false;
  let following = false;
  let over = false;
  /** the last input was a moving mouse, not a touch; without one a phone's arm follows scroll */
  let mouse = false;
  let note = '';
  let noteUntil = -1;
  const stageAt: Vec2 = [0, 0];
  const cursorAt: Vec2 = [0, 0];
  const client: Vec2 = [0, 0];
  let movedAt = 0;
  let idle = 0;
  const aimAt = [0, 0, 0, 0];
  const aimPose = [0, 0, 0, 0];
  const aimSpeed = [0, 0, 0, 0];
  let lift: number = PEN.up;

  const pose = [0, 0, 0, 0];
  const up: number[] = [PEN.up];
  const sole: number[] = [PEN.up];
  const bounds: [number, number, number, number] = [0, 0, 0, 0];
  const point: [number, number, number] = [0, 0, 1];
  const caretAt: Vec2 = [-1, -1];
  let caretMode = '';
  /** the shader's vectors, written in place */
  const v2: [number, number] = [0, 0];
  const v3: [number, number, number] = [0, 0, 0];
  const v4: [number, number, number, number] = [0, 0, 0, 0];
  const seat: [number, number, number] = [0, 0, 0];
  const pivotAt: Vec2 = [0, 0];
  const elbowAt: Vec2 = [0, 0];
  const tipAt: Vec2 = [0, 0];
  const rams = [0, 0, 0, 0, 0, 0];
  let mateShown = -1;
  let mateAt = '';
  let chainAt = -1;
  let gaze = 0;
  let ink: MateInk | undefined;
  /** her remote's hand (-1 none, 0 left, 1 right) and height (0 ready, 1 low, 2 out, 3 up) */
  let hand = -1;
  let height = 0;
  let wantHand = -1;
  let wantHeight = 0;
  let wantLit = false;
  let swayAt = 0;
  const aimed: Vec2 = [0, 0];
  const herAt: Vec2 = [0, 0];
  let castPose = 0;
  const casts: ImageData[] = [];
  let steady = false;
  const none: Rect = { x: 0, y: 0, w: 0, h: 0 };

  function breaksOf(line: HTMLElement): number[] {
    const out: number[] = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    let at = 0;
    let top = -Infinity;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      for (let i = 0; i < node.length; i++, at++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getClientRects()[0];
        if (!r || r.top < top + lineHeight / 2) continue;
        if (at > 0) out.push(at);
        top = r.top;
      }
    }
    return out;
  }

  /** whole device pixels for the window's lines, so a block rasterizes the same under overlays */
  function snap() {
    const dpr = window.devicePixelRatio || 1;
    stage.style.top = '';
    for (const b of blocks) b.el.style.minHeight = '';
    const heights: number[] = [];
    for (const b of blocks) heights.push(b.el.getBoundingClientRect().height);
    for (let i = 0; i < blocks.length; i++) {
      blocks[i].el.style.minHeight = `${Math.ceil(heights[i] * dpr - 0.01) / dpr}px`;
    }
    const top = (stage.getBoundingClientRect().top + scrollY) * dpr;
    const off = top - Math.floor(top + 0.01);
    if (off > 0.01) stage.style.top = `${-off / dpr}px`;
  }

  function layout() {
    snap();
    const s = stage.getBoundingClientRect();
    if (s.width === 0) return;
    stageAt[0] = s.left + scrollX;
    stageAt[1] = s.top + scrollY;
    const page = rectIn(doc, s);
    inside = rectIn(doc.lastElementChild!, s);
    // a monospace advance, measured on ten characters
    const probe = document.createElement('span');
    probe.textContent = '0000000000';
    blocks[0].lines[0].append(probe);
    advance = probe.getBoundingClientRect().width / 10;
    probe.remove();
    lineHeight = Number.parseFloat(getComputedStyle(blocks[0].lines[0]).lineHeight) || 20;
    for (const b of blocks) {
      b.tabBox = rectIn(b.tab, s);
      b.cell = rectIn(b.src.parentElement!, s);
      b.rows = [];
      b.breaks = [];
      for (const line of b.lines) {
        const r = line.getBoundingClientRect();
        b.rows.push([r.left - s.left, r.top - s.top]);
        b.breaks.push(r.height > 1.5 * lineHeight ? breaksOf(line) : []);
      }
      b.range = [b.cell.y + INSET, b.cell.y + b.cell.h - INSET];
    }
    band = rectIn(bed, s);
    const onBed = band.w > 0;
    along = onBed ? 0 : 1;
    cell = 2;
    scale = RIG_SCALE;
    foot = [page.x + page.w / 2, s.height * 0.3];
    let span = 0;
    if (onBed) {
      rail[0] = band.x + BED.start;
      rail[1] = band.y + BED.rail;
      rail[3] = rail[1];
      bay = band;
      below = inside.y + inside.h > band.y + band.h + 8;
      deck = BED_DECK;
    } else {
      const c = rectIn(column, s);
      bay = c;
      rail[0] = c.x + c.w / 2;
      rail[1] = page.y + COLUMN_END[0];
      rail[2] = rail[0];
      rail[3] = page.y + page.h - COLUMN_END[1];
      below = false;
      // its point clear of the widest tab: the rig smaller only where the elbow would open too wide
      let tabs = 0;
      for (const b of blocks) tabs = Math.max(tabs, b.tabBox.x + b.tabBox.w);
      span = rail[0] - tabs - TAB_CLEAR;
      scale = Math.min(RIG_SCALE, span / (Math.cos(INNER[1] - Math.PI / 2) * PENCIL.reach));
      // her full size, unless the boom is then too short to carry her pencil over her head
      const crown = (SEAT_CELL[1] + MATE_RISE) * cell + PEN_R * scale + 8;
      if (BOOM * scale < crown) cell = 1;
      const half = Math.max(COLUMN_DECK.box[2], ((SPRITE_W / 2) * cell + 2) / scale);
      deck = { ...COLUMN_DECK, box: [0, COLUMN_DECK.box[1], half, COLUMN_DECK.box[3]] };
    }
    boom = BOOM * scale;
    fore = PENCIL.reach * scale;
    // on the bed the elbow and the ram's crank keep inside its end, also while the boom turns
    reachMax = onBed ? band.x + band.w - 32 * scale - 6 : Infinity;
    chainAt = -1;
    mateAt = '';
    mate.style.width = `${MATE_W * cell}px`;
    mate.style.height = `${MATE_H * cell}px`;
    if (onBed) {
      const end = band.x + band.w - (deck.box[0] + deck.box[2]) * scale - 4;
      for (const b of blocks) station(b, end);
      rail[2] = rail[0];
      for (const b of blocks) rail[2] = Math.max(rail[2], b.stop);
      for (let i = 0; i < blocks.length && i < stations.length; i++) {
        const stop = blocks[i].stop;
        stations[i].style.left = `${Math.round(stop - band.x - 8)}px`;
        // plates worked from one stop share its detent
        let shared = false;
        for (let j = 0; j < i; j++) if (Math.abs(blocks[j].stop - stop) < 20) shared = true;
        stations[i].style.visibility = shared ? 'hidden' : '';
      }
    } else {
      // her pencil flat across a plate, the boom up the column over a plate it reaches, else down
      const reach = Math.min(fore, span);
      const drop = boom + Math.sqrt(fore * fore - reach * reach);
      for (const b of blocks) {
        b.tipX = rail[0] - reach;
        const up = b.range[1] + drop <= rail[3];
        b.bend = up ? -1 : 1;
        b.stop = clamp(b.range[0] + (up ? drop : -drop), rail[1], rail[3]);
        b.stopEnd = clamp(b.range[1] + (up ? drop : -drop), rail[1], rail[3]);
      }
    }
    caret.style.width = `${advance}px`;
    caret.style.height = `${lineHeight}px`;
    // at rest: the bed rail's left end; up a column as low as keeps the elbow in the window
    if (along === 0) park = [rail[0], 0, TUCK - Math.PI, 0];
    else {
      const k = CAMERA / (CAMERA - PEN.up * scale);
      const border = foot[0] + (inside.x + inside.w + 1 - foot[0]) / k;
      fold = Math.asin(clamp((rail[0] - border) / fore, 0, 1));
      park = [page.y + page.h - boom - ELBOW * scale, boomAngle(DOWN), Math.PI - fold, 0];
    }
    if (!begun) from = park;
    plan();
  }

  /** block b's slide on the bed: the best stop with the elbow comfortable at both its ends */
  function station(b: Block, end: number) {
    const up = b.cell.y < rail[1];
    const near = up ? rail[1] - b.range[1] : b.range[0] - rail[1];
    const far = up ? rail[1] - b.range[0] : b.range[1] - rail[1];
    const row: Rect[] = [];
    for (const o of blocks) if (o.cell.y < rail[1] === up) row.push(o.tabBox);
    const turns = blocks.some((o) => o.cell.y > rail[1]);
    const half = (SPRITE_W / 2) * cell;
    const crown = (SEAT_CELL[1] + MATE_RISE) * cell + 2;
    const radius = PEN_R * scale;
    const elbow = ELBOW * scale;
    const middle = b.cell.x + b.cell.w / 2;
    const joints = [0, 0, 0];
    let best = -Infinity;
    b.bend = up ? -1 : 1;
    b.tipX = middle;
    b.stop = clamp(middle + 2 * near, rail[0], end);
    for (const side of [1, -1]) {
      const bendTo = side * (up ? -1 : 1);
      for (let d = 60; d <= 320; d += 4) {
        const margin = Math.min(
          innerAt(Math.hypot(d, near)) - INNER[0],
          INNER[1] - innerAt(Math.hypot(d, far)),
        );
        if (margin < 0) continue;
        for (let x = b.cell.x + 24; x <= b.cell.x + b.cell.w - 24; x += 4) {
          const stop = x + side * d;
          if (stop < rail[0] || stop > end) continue;
          if (row.some((t) => stop > t.x - PIVOT_CLEAR && stop < t.x + t.w + PIVOT_CLEAR)) continue;
          if (!clearOfTabs(stop)) continue;
          const her: Rect = { x: point[0] - half, y: point[1] - crown, w: 2 * half, h: crown };
          let clear = true;
          for (const y of b.range) {
            reachTo(x - stop, y - rail[1], bendTo, joints);
            const ex = stop + boom * Math.cos(joints[1]);
            const ey = rail[1] + boom * Math.sin(joints[1]);
            if (crosses(x, y, ex, ey, radius + HER_CLEAR, her) || !inBox(ex, ey, -elbow, inside))
              clear = false;
          }
          if (!clear) continue;
          let score = margin - Math.abs(x - middle) * 0.0015;
          if (turns && stop > reachMax - boom) score -= 0.3;
          if (score > best) {
            best = score;
            b.bend = bendTo;
            b.tipX = x;
            b.stop = stop;
          }
        }
      }
    }
    b.stopEnd = b.stop;
  }

  /** whether box [x0, x1) by [y0, y1) comes within HER_CLEAR of a tab's sides, or onto it */
  function onTab(x0: number, y0: number, x1: number, y1: number): boolean {
    for (const { tabBox: t } of blocks) {
      if (x1 <= t.x - HER_CLEAR || x0 >= t.x + t.w + HER_CLEAR) continue;
      if (y1 > t.y && y0 < t.y + t.h) return true;
    }
    return false;
  }

  /** whether she keeps clear of every tab with the carriage at `c`; her seat stays in `point` */
  function clearOfTabs(c: number): boolean {
    project(xOf(c) + deck.seat[0] * scale, yOf(c) + deck.seat[1] * scale, deck.seat[2] * scale);
    const x = point[0] - (SEAT_CELL[0] + MATE_PAD[0]) * cell;
    const y = point[1] - (SEAT_CELL[1] + MATE_PAD[1]) * cell;
    return !onTab(x, y, x + MATE_W * cell, y + MATE_H * cell);
  }

  function xOf(c: number): number {
    return along === 0 ? c : rail[0];
  }

  function yOf(c: number): number {
    return along === 1 ? c : rail[1];
  }

  function innerAt(r: number, l2 = fore): number {
    return Math.acos(clamp((boom * boom + l2 * l2 - r * r) / (2 * boom * l2), -1, 1));
  }

  /** the joints that put a second link's end at (x, y) from the pivot, into out[1] and out[2] */
  function reachTo(x: number, y: number, bend: number, out: number[], l2 = fore) {
    const d = clamp(Math.hypot(x, y), Math.abs(boom - l2) + 0.5, boom + l2 - 0.5);
    const a = Math.acos(clamp((boom * boom + d * d - l2 * l2) / (2 * boom * d), -1, 1));
    out[1] = Math.atan2(y, x) - bend * a;
    out[2] = bend * (Math.PI - innerAt(d, l2));
  }

  /** the boom on the band's side on the bed, on the plates' side up a phone's column */
  function boomAngle(angle: number): number {
    if (along === 0) return Math.atan2(Math.sin(angle), Math.cos(angle));
    return angle - 2 * Math.PI * Math.ceil((angle + Math.PI / 2 - 0.5) / (2 * Math.PI));
  }

  function solve(task: number[], bendTo: number, near: number[]): number[] {
    const out = [task[0], 0, 0, 0];
    reachTo(task[1], task[2], bendTo, out);
    out[1] = boomAngle(out[1]);
    out[2] = nearest(out[2], near[2]);
    return out;
  }

  function place(p: number[]) {
    pivotAt[0] = xOf(p[0]);
    pivotAt[1] = yOf(p[0]);
    elbowAt[0] = pivotAt[0] + boom * Math.cos(p[1]);
    elbowAt[1] = pivotAt[1] + boom * Math.sin(p[1]);
    tipAt[0] = elbowAt[0] + fore * Math.cos(p[1] + p[2]);
    tipAt[1] = elbowAt[1] + fore * Math.sin(p[1] + p[2]);
  }

  function stowed(p: number[]): boolean {
    return Math.abs(along === 0 ? Math.sin(p[1]) : Math.cos(p[1])) < 0.34;
  }

  /** the most the boom points along the band, its cosine, turning from angle a to b */
  function widest(a: number, b: number): number {
    if (along === 1) return 0;
    if (Math.min(a, b) <= 0 && Math.max(a, b) >= 0) return 1;
    return Math.max(Math.cos(a), Math.cos(b));
  }

  function foldAt(angle: number, near: number): number {
    return nearest(Math.PI - fold * Math.sin(angle), near);
  }

  function crossing(c0: number, c1: number, curve: (u: number) => number, c: number): number {
    const k = (c - c0) / (c1 - c0);
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const m = (lo + hi) / 2;
      if (curve(m) < k) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  }

  /** a move from pose a to b: her pencil tips up, the joints turn while it stands, it tips down; on
   * the bed the boom turns only where the elbow keeps inside the bed's end */
  function move(a: number[], b: number[], pace = 1, least = 0): Leg {
    const turn = boomAngle(b[1]);
    const limit = reachMax - boom * widest(a[1], turn);
    // up a phone's column her pencil folds along the boom, never end-on; on the bed the trip home
    // first brings the elbow out of the plates, her pencil pointing off along the band
    const flat = along === 1;
    const home = !flat && stowed([b[0], turn]) && !stowed(a) && a[0] <= limit;
    const fa = flat ? foldAt(a[1], a[2]) : a[2];
    const fb = flat ? foldAt(turn, fa) : home ? nearest(-turn, a[2]) : a[2];
    const end = [b[0], turn, nearest(b[2], fb), b[3]];
    const run = Math.abs(b[0] - a[0]);
    // a move that goes nowhere only tips her pencil across
    const stays = run < 0.5 && Math.abs(end[1] - a[1]) < 1e-3 && Math.abs(end[2] - a[2]) < 1e-3;
    const preT = Math.abs(fa - a[2]) * BEND_RATE * pace;
    const postT = Math.abs(end[2] - fb) * BEND_RATE * pace;
    // a tip takes as long as its drawn length takes to change, so a part tip is no quicker
    const upT = stays ? 0 : flat ? preT : Math.cos(a[3]) * TIP_UP * pace;
    const downT = stays ? 0 : flat ? postT : Math.cos(b[3]) * TIP_DOWN * pace;
    const turnT =
      Math.abs(end[1] - a[1]) * (flat ? Math.max(TURN_RATE, boom / SWING) : TURN_RATE) * pace;
    const bendT = Math.abs((flat || home ? fb - fa : end[2] - a[2]) * BEND_RATE * pace);
    const jointT = home ? preT + Math.max(turnT, bendT) + postT : Math.max(turnT, bendT);
    const driveT = run < 1 ? 0 : run > SHORT ? Math.max(DRIVE, 1.3 * RAMP + run / TOP) : DRIVE;
    let time = Math.max(
      least,
      pace * driveT + (home ? upT + jointT : 0),
      upT + jointT + downT - OVERLAP * (Math.min(upT, jointT) + Math.min(jointT, downT)),
      160,
    );
    let curve = inOut;
    let joints: Vec2 = [0, 1];
    for (let tries = 0; tries < 12; tries++) {
      curve = run > SHORT ? cruise(RAMP / time) : inOut;
      let lo = upT - OVERLAP * Math.min(upT, jointT);
      let hi = time - downT + OVERLAP * Math.min(jointT, downT);
      if (turnT > 1 && a[0] > limit && b[0] <= limit)
        lo = Math.max(lo, time * crossing(a[0], b[0], curve, limit));
      if (turnT > 1 && b[0] > limit && a[0] <= limit)
        hi = Math.min(hi, time * crossing(a[0], b[0], curve, limit));
      if (hi - lo >= jointT - 1) {
        const s0 = stowed(a) ? hi - jointT : lo;
        joints = [s0 / time, (s0 + jointT) / time];
        break;
      }
      time *= 1.15;
    }
    const up: Vec2 = [0, upT / time];
    const down: Vec2 = [1 - downT / time, 1];
    // the boom's turn: on the trip home between the elbow's, and the carriage only after them
    const turns: Vec2 = home ? [joints[0] + preT / time, joints[1] - postT / time] : joints;
    const drive: Vec2 = home ? [joints[1], 1] : [0, 1];
    if (home) curve = run > SHORT ? cruise(RAMP / (time * (1 - drive[0]))) : inOut;
    const before: Vec2 = flat ? up : [joints[0], turns[0]];
    const after: Vec2 = flat ? down : [turns[1], joints[1]];
    return {
      end,
      time,
      ease: (u, i) => (i === 0 ? curve(within(u, drive)) : inOut(within(u, turns))),
      bend:
        (flat || home) && !stays
          ? (u) =>
              a[2] +
              (fa - a[2]) * inOut(within(u, before)) +
              (fb - fa) * inOut(within(u, turns)) +
              (end[2] - fb) * inOut(within(u, after))
          : undefined,
      tilt: (u) =>
        stays || flat
          ? a[3] + (b[3] - a[3]) * inOut(u)
          : a[3] +
            (UPRIGHT - a[3]) * inOut(within(u, up)) -
            (UPRIGHT - b[3]) * inOut(within(u, down)),
    };
  }

  /** a move's legs: turning along the band past the bed's end, it first drives to where it can */
  function route(a: number[], b: number[], pace = 1, least = 0): Leg[] {
    const turn = boomAngle(b[1]);
    const limit = reachMax - boom * widest(a[1], turn);
    if (a[0] > limit && b[0] > limit && Math.abs(turn - a[1]) > 0.01) {
      const there = move(a, [limit, a[1], a[2], UPRIGHT], pace, least / 3);
      const turned = move(there.end, [limit, b[1], b[2], UPRIGHT], pace, least / 3);
      return [there, turned, move(turned.end, b, pace, least / 3)];
    }
    return [move(a, b, pace, least)];
  }

  function sample(list: Segment[], t: number, first: number[], out: number[]) {
    let at = first;
    for (const s of list) {
      if (t < s.t0) break;
      if (t < s.t1) {
        const u = (t - s.t0) / (s.t1 - s.t0);
        if (s.task) {
          const { a, b } = s.task;
          const k = s.ease(u, 0);
          out[0] = a[0] + (b[0] - a[0]) * k;
          reachTo(a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, s.task.bend, out);
          out[1] = boomAngle(out[1]);
          out[2] = nearest(out[2], s.a[2]);
          out[3] = 0;
          return;
        }
        for (let i = 0; i < out.length; i++) {
          out[i] = s.a[i] + (s.b[i] - s.a[i]) * s.ease(u, i);
        }
        if (s.bend) out[2] = s.bend(u);
        if (s.tilt) out[3] = s.tilt(u);
        return;
      }
      at = s.b;
    }
    for (let i = 0; i < out.length; i++) out[i] = at[i];
  }

  function push(legs: Leg[], a: number[], t: number): [number[], number] {
    let at = a;
    let time = t;
    for (const leg of legs) {
      track.push({
        t0: time,
        t1: time + leg.time,
        a: at,
        b: leg.end,
        ease: leg.ease,
        tilt: leg.tilt,
        bend: leg.bend,
      });
      time += leg.time;
      at = leg.end;
    }
    return [at, time];
  }

  function plan() {
    track.length = 0;
    pen.length = 0;
    jobs.length = 0;
    let previous = from;
    let free = since;
    for (const ask of asks) {
      const b = ask.block;
      const c0 = ask.out ? b.stop : b.stopEnd;
      const c1 = ask.out ? b.stopEnd : b.stop;
      const a = [c0, b.tipX - xOf(c0), (ask.out ? b.range[0] : b.range[1]) - yOf(c0)];
      const z = [c1, b.tipX - xOf(c1), (ask.out ? b.range[1] : b.range[0]) - yOf(c1)];
      const legs = route(previous, solve(a, b.bend, previous));
      let legT = 0;
      for (const leg of legs) legT += leg.time;
      // the writer's press arrives as its block's tab pops, a reader's sets off at once; neither
      // arrives before the pencil may touch, so the quill lowers it without a stop
      const go = Math.max(free, ask.earliest - (ask.reader ? 0 : legT - DRIVE), ask.descend - legT);
      const [start, at] = push(legs, previous, go);
      const reached = Math.max(at, ask.descend);
      pen.push({
        t0: reached - DROP * (1 - SETTLE),
        t1: reached + DROP * SETTLE,
        a: [PEN.up],
        b: [PEN.down],
        ease: inOut,
      });
      const touch = reached + DROP * SETTLE;
      const hit = touch + clamp((b.range[1] - b.range[0]) * SLIDE_MS, SLIDE[0], SLIDE[1]);
      const done = solve(z, b.bend, start);
      track.push({
        t0: touch,
        t1: hit,
        a: start,
        b: done,
        ease: inOut,
        task: { a, b: z, bend: b.bend },
      });
      const stood =
        along === 1
          ? [done[0], done[1], foldAt(done[1], done[2]), 0]
          : [done[0], done[1], done[2], UPRIGHT];
      const away = Math.max(TIP_UP, Math.abs(stood[2] - done[2]) * BEND_RATE);
      track.push({ t0: hit, t1: hit + away, a: done, b: stood, ease: inOut });
      pen.push({ t0: hit, t1: hit + LIFT, a: [PEN.down], b: [PEN.up], ease });
      jobs.push({ ask, go, touch, hit, free: hit + away });
      previous = stood;
      free = hit + away;
    }
    // the park answers no one, so it takes its time: a press can catch it on the way
    total = push(route(previous, park, 1.5, PARK), previous, free + REST)[1];
  }

  /** a reader's press: the block flips between output and Markdown; the press asked, if new */
  function press(b: Block): Ask | undefined {
    if (reduced || !shader) {
      // no arm to move: the block flips at once
      b.base = !shown(b, clock);
      for (let i = asks.length - 1; i >= 0; i--) if (asks[i].block === b) asks.splice(i, 1);
      plan();
      apply();
      tell(b, b.base);
      return;
    }
    const t = clock;
    if (playing) {
      // the sequence plays through: the press waits for its end, or a second one takes it back
      let i = asks.length - 1;
      while (i >= 0 && !(asks[i].block === b && asks[i].queued)) i--;
      let ask: Ask | undefined;
      if (i >= 0 && jobs[i].go > t) {
        asks.splice(i, 1);
        noteUntil = -1;
      } else {
        const out = !shown(b, Infinity);
        ask = { block: b, out, held: t, earliest: t, descend: t, queued: true, reader: true };
        asks.push(ask);
        note = `queued ${b.label}`;
        noteUntil = t + NOTE;
        voice.textContent = `${b.label}: queued`;
      }
      plan();
      apply();
      return ask;
    }
    // off a reader's springs, or once the arm has left for home, it sets off from where it is
    if (aiming || !jobs.length || t >= jobs[jobs.length - 1].free + REST) settle(t);
    let next = jobs.length;
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      // a block in the arm's hands is left to it
      if (job.ask.block === b && job.go <= t && t < job.free) return;
      if (job.go > t && next === jobs.length) next = i;
    }
    // one already on its way goes next instead
    for (let i = next; i < asks.length; i++) {
      if (asks[i].block !== b) continue;
      asks.splice(next, 0, asks.splice(i, 1)[0]);
      plan();
      wake();
      return;
    }
    const out = !shown(b, Infinity);
    const ask = { block: b, out, held: t, earliest: t, descend: t, queued: false, reader: true };
    asks.splice(next, 0, ask);
    plan();
    wake();
    return ask;
  }

  function tell(b: Block, out: boolean) {
    voice.textContent = `${b.label}: showing ${out ? 'output' : 'Markdown'}`;
  }

  /** whether a block shows its output at time t, a flip counting from its slide's start */
  function shown(b: Block, t: number): boolean {
    let out = b.base;
    for (const job of jobs) if (job.ask.block === b && job.touch <= t) out = job.ask.out;
    return out;
  }

  /** a new plan from now: blocks keep what they show, presses not yet sliding wait their turn */
  function settle(t: number) {
    const waiting: Ask[] = [];
    for (let i = 0; i < jobs.length; i++) if (jobs[i].touch > t) waiting.push(jobs[i].ask);
    for (const b of blocks) b.base = shown(b, t);
    asks.length = 0;
    for (const ask of waiting) asks.push(ask);
    // caught mid-move, the arm brakes along its way first, so it never stops dead: it covers half
    // the way the old plan would have in that time
    brake = null;
    since = t;
    if (aiming) from = [...aimPose];
    else {
      const stop = [...pose];
      sample(track, t - 16, from, other);
      if (other.some((v, i) => Math.abs(v - pose[i]) > 1e-3)) {
        brake = { track: [...track], from, at: t };
        sample(track, t + BRAKE / 2, from, stop);
        since = t + BRAKE;
      }
      from = stop;
    }
    aiming = false;
    plan();
  }

  function wake() {
    if (phase === 'rest' || phase === 'ready') {
      phase = 'play';
      last = -1;
    }
    shader?.invalidate();
  }

  function project(x: number, y: number, z: number) {
    const k = CAMERA / (CAMERA - z);
    point[0] = foot[0] + (x - foot[0]) * k;
    point[1] = foot[1] + (y - foot[1]) * k;
    point[2] = k;
  }

  function grow(x: number, y: number, z: number, r: number) {
    project(x, y, z);
    const shadowX = x - (LIGHT[0] / LIGHT[2]) * z;
    const shadowY = y - (LIGHT[1] / LIGHT[2]) * z;
    bounds[0] = Math.min(bounds[0], point[0] - r, shadowX - r);
    bounds[1] = Math.min(bounds[1], point[1] - r, shadowY - r);
    bounds[2] = Math.max(bounds[2], point[0] + r, shadowX + r);
    bounds[3] = Math.max(bounds[3], point[1] + r, shadowY + r);
  }

  function blocked(x: number, y: number): boolean {
    const r = PEN_R * scale + 2;
    for (const b of blocks) if (inBox(x, y, r, b.tabBox)) return true;
    const x0 = seat[0] - SEAT_CELL[0] * cell;
    const y0 = seat[1] - (SEAT_CELL[1] + MATE_RISE) * cell;
    return inBox(x, y, r, { x: x0, y: y0, w: SPRITE_W * cell, h: (SPRITE_H + MATE_RISE) * cell });
  }

  /** the pose pointing her pencil at the cursor, AIM_GAP short of it, clear of the tabs and her */
  function aimFor(out: number[]) {
    if (along === 1 && !mouse) return readFor(out);
    out[3] = 0;
    const k = CAMERA / (CAMERA - lift * scale);
    const x = clamp(foot[0] + (cursorAt[0] - foot[0]) / k, inside.x + 6, inside.x + inside.w - 6);
    const y = clamp(foot[1] + (cursorAt[1] - foot[1]) / k, inside.y + 6, inside.y + inside.h - 6);
    let bendTo: number;
    if (along === 1) {
      const up = y + boom <= rail[3];
      bendTo = up ? -1 : 1;
      out[0] = clamp(y + (up ? boom : -boom), rail[1], rail[3]);
    } else {
      bendTo = below && y > rail[1] ? 1 : -1;
      // the cursor's distance from the pivot where the elbow's inner angle is about 100 degrees
      const r = Math.sqrt(boom * boom + fore * fore + 0.35 * boom * fore);
      const h = Math.abs(y - rail[1]);
      const reach = Math.sqrt(Math.max(0, r * r - h * h));
      out[0] = clamp(x + Math.max(60 * scale, reach), rail[0], rail[2]);
      for (let step = 0; step < 50 && !clearOfTabs(out[0]); step++) {
        const at = out[0] + (step % 2 ? 1 : -1) * 8 * Math.ceil((step + 1) / 2);
        if (at >= rail[0] && at <= rail[2] && clearOfTabs(at)) out[0] = at;
      }
    }
    let gap = AIM_GAP;
    for (let i = 0; i < 3; i++) {
      reachTo(x - xOf(out[0]), y - yOf(out[0]), bendTo, out, fore + gap);
      const ex = xOf(out[0]) + boom * Math.cos(out[1]);
      const ey = yOf(out[0]) + boom * Math.sin(out[1]);
      const length = Math.hypot(x - ex, y - ey) || 1;
      let g = gap;
      while (g < 220 && blocked(x - ((x - ex) / length) * g, y - ((y - ey) / length) * g)) g += 4;
      if (g === gap) break;
      gap = g;
    }
    out[1] = boomAngle(out[1]);
    out[2] = nearest(out[2], aimPose[2]);
  }

  /** up a phone's column, the park's fold carried to the line a reader reads at */
  function readFor(out: number[]) {
    const k = CAMERA / (CAMERA - PEN.up * scale);
    const top = blocks[0].range[0];
    const bottom = blocks[blocks.length - 1].range[1];
    const y = foot[1] + (clamp(readAt - stageAt[1], top, bottom) - foot[1]) / k;
    out[0] = clamp(y - boom + fore * Math.cos(fold), rail[1], park[0]);
    out[1] = DOWN;
    out[2] = Math.PI - fold;
    out[3] = 0;
  }

  function tipFor(p: number[]): number {
    const dx = Math.cos(p[1] + p[2]);
    const dy = Math.sin(p[1] + p[2]);
    const wrist = PENCIL.wrist * scale;
    const length = fore - wrist;
    for (let l = 0; l <= length; l += 4) {
      if (blocked(elbowAt[0] + dx * (wrist + l), elbowAt[1] + dy * (wrist + l)))
        return Math.acos(clamp((l - 4) / length, 0, 1));
    }
    return 0;
  }

  function aimStep(dt: number): boolean {
    if (following) aimFor(aimAt);
    lift = Math.min(PEN.up, lift + ((PEN.up - PEN.down) / LIFT) * 1000 * dt);
    const turn = boomAngle(aimAt[1]);
    const swinging = Math.abs(turn - aimPose[1]) > SWUNG;
    // up a phone's column her pencil folds along the boom while it swings round; on the bed, going
    // home, the carriage waits while the elbow comes out of the plates
    const targets = [
      along === 0 && !following && swinging ? aimPose[0] : aimAt[0],
      turn,
      along === 1 && swinging ? foldAt(aimPose[1], aimPose[2]) : nearest(aimAt[2], aimPose[2]),
    ];
    const stiff = along === 1 && !mouse ? SCROLL_AIM : AIM;
    // up a phone's column the elbow sweeps no faster than in a move
    const slew = Math.min(AIM_SLEW, (SWING * 1000) / boom);
    let still = true;
    for (let i = 0; i < 3; i++) {
      const top = i === 0 ? AIM_SPEED : i === 1 && along === 1 ? slew : AIM_SLEW;
      aimSpeed[i] += (stiff * stiff * (targets[i] - aimPose[i]) - 2 * stiff * aimSpeed[i]) * dt;
      aimSpeed[i] = clamp(aimSpeed[i], -top, top);
      aimPose[i] += aimSpeed[i] * dt;
      if (Math.abs(targets[i] - aimPose[i]) > (i === 0 ? 1 : 0.004)) still = false;
      if (Math.abs(aimSpeed[i]) > (i === 0 ? 20 : 0.05)) still = false;
    }
    if (along === 0) {
      const most = reachMax - boom * Math.max(0, Math.cos(aimPose[1]));
      if (aimPose[0] > most) {
        aimPose[0] = most;
        aimSpeed[0] = Math.min(0, aimSpeed[0]);
      }
    }
    place(aimPose);
    // up a phone's column it lies folded, never stood up end-on
    const swing = along === 1 ? 0 : 0.25 * (Math.abs(aimSpeed[1]) + Math.abs(aimSpeed[2]));
    const clear = along === 1 && !mouse ? 0 : tipFor(aimPose);
    const need = Math.min(along === 1 ? STEEP : UPRIGHT, Math.max(aimAt[3], clear, swing));
    aimSpeed[3] += (AIM_TIP * AIM_TIP * (need - aimPose[3]) - 2 * AIM_TIP * aimSpeed[3]) * dt;
    aimPose[3] = clamp(aimPose[3] + aimSpeed[3] * dt, 0, UPRIGHT);
    if (Math.abs(need - aimPose[3]) > 0.004 || Math.abs(aimSpeed[3]) > 0.05) still = false;
    return still && lift === PEN.up;
  }

  /** the rig's pose at time t into `out`: the plan's, or braking along the one it took over from */
  function poseAt(t: number, out: number[]) {
    if (brake && t < brake.at + BRAKE) {
      const s = t - brake.at;
      sample(brake.track, brake.at + s - (s * s) / (2 * BRAKE), brake.from, out);
    } else sample(track, t, from, out);
  }

  function apply() {
    const t = clock;
    let caretX = 0;
    let caretY = 0;
    let typing = false;
    for (const b of blocks) {
      let keys = !begun || t < b.type ? -1 : Math.min(b.keys, Math.floor((t - b.type) / CHAR));
      if (keys >= 0 && keys < b.keys) typing = true;
      let shown = 0;
      let clip = '';
      for (let i = 0; i < b.lines.length && keys >= 0; i++) {
        shown = i + 1;
        if (keys <= b.lengths[i]) {
          // a long line wraps: the rows before the caret's show whole, its own up to the caret
          const breaks = b.breaks[i];
          let row = 0;
          while (row < breaks.length && keys >= breaks[row]) row++;
          const x = (keys - (row > 0 ? breaks[row - 1] : 0)) * advance;
          const top = row * lineHeight;
          if (keys < b.lengths[i]) {
            clip = `polygon(0 0, 100% 0, 100% ${top}px, ${x}px ${top}px, ${x}px ${top + lineHeight}px, 0 ${top + lineHeight}px)`;
          }
          caretX = b.rows[i][0] + x;
          caretY = b.rows[i][1] + top;
          keys = -1;
        } else keys -= b.lengths[i] + 1;
      }
      if (shown !== b.shownLines) {
        for (let i = 0; i < b.lines.length; i++) {
          b.lines[i].style.visibility = !begun || i < shown ? '' : 'hidden';
          b.lines[i].style.clipPath = '';
        }
        b.shownLines = shown;
        b.clip = '';
      }
      if (clip !== b.clip) {
        b.lines[shown - 1].style.clipPath = clip;
        b.clip = clip;
      }
    }
    const caretOff = blocks[blocks.length - 1].typed + 600;
    const mode = !begun || t >= caretOff ? 'none' : typing && phase === 'play' ? 'solid' : 'blink';
    if (mode !== caretMode) {
      caretMode = mode;
      caret.style.visibility = mode === 'none' ? 'hidden' : 'visible';
      // it blinks only while it shows, so a hidden or typing caret runs no animation
      caret.classList.toggle('lp-caret', mode === 'blink');
    }
    if (mode !== 'none' && (caretX !== caretAt[0] || caretY !== caretAt[1])) {
      caretAt[0] = caretX;
      caretAt[1] = caretY;
      caret.style.transform = `translate(${caretX}px, ${caretY}px)`;
    }

    if (aiming) for (let i = 0; i < 4; i++) pose[i] = aimPose[i];
    else poseAt(t, pose);
    sample(pen, t, up, sole);
    const z = aiming ? lift : sole[0];
    place(pose);
    // the line her pencil's point drags, on whole device pixels: the wipe's edge and the canvas's
    const dpr = Math.min(2, window.devicePixelRatio);
    project(tipAt[0], tipAt[1], z * scale);
    const lineY = Math.round(point[1] * dpr) / dpr;
    let gauge = GAUGE[0];
    let sliding: Block | null = null;
    let status = !begun ? '' : typing ? typingLine : compiled;
    for (const job of jobs) {
      if (t >= job.touch && t < job.hit) {
        sliding = job.ask.block;
        gauge = GAUGE[1];
        status = job.ask.out ? job.ask.block.status : 'back to Markdown';
      } else if (t >= job.hit && t < job.free) gauge = Math.max(gauge, GAUGE[2]);
      else if (!typing && t < job.free && t >= job.go - DRIVE) status = '';
    }
    const bx = pivotAt[0];
    const by = pivotAt[1];
    project(bx + deck.seat[0] * scale, by + deck.seat[1] * scale, deck.seat[2] * scale);
    seat[0] = point[0];
    seat[1] = point[1];
    seat[2] = deck.seat[2] * scale;
    const mateX = Math.round(seat[0] - SEAT_CELL[0] * cell);
    const mateY = Math.round(seat[1] - SEAT_CELL[1] * cell);
    const crownX = mateX + CROWN_CELL[0] * cell;
    aimHer(t, mateX, mateY);
    sway(performance.now());
    const herPose = hand < 0 ? 0 : poseOf(hand, height);

    for (const b of blocks) {
      let framed = false;
      let queued = false;
      let flip: Job | null = null;
      for (const job of jobs) {
        if (job.ask.block !== b) continue;
        if (t >= (job.ask.queued ? job.go : job.ask.held) && t < job.hit) framed = true;
        if (job.ask.queued && t < job.go) queued = true;
        if (job.touch <= t) flip = job;
      }
      // a finished block's tab pops, inverted for a moment, and its frame holds it as one strip
      const tabState = !begun ? 2 : t < b.typed ? 0 : t < b.typed + POP ? 1 : 2;
      if (tabState !== b.tabState) {
        b.tabState = tabState;
        b.tab.style.visibility = tabState === 0 ? 'hidden' : '';
        b.tab.toggleAttribute('data-inverted', tabState === 1);
      }
      if (framed !== b.framed) {
        b.framed = framed;
        b.el.toggleAttribute('data-framed', framed);
      }
      const out = flip ? flip.ask.out : b.base;
      let wipe = out ? 1 : 0;
      if (flip && t < flip.hit && sliding === b) wipe = clamp((lineY - b.cell.y) / b.cell.h);
      if (wipe !== b.wipe) {
        b.wipe = wipe;
        b.out.style.visibility = wipe <= 0 ? 'hidden' : '';
        b.out.style.clipPath = wipe > 0 && wipe < 1 ? `inset(0 0 ${(1 - wipe) * 100}% 0)` : '';
        b.src.style.clipPath = wipe > 0 && wipe < 1 ? `inset(${wipe * 100}% 0 0 0)` : '';
      }
      const src = wipe < 1 && (!begun || t >= b.type);
      if (src !== b.srcShown) {
        b.srcShown = src;
        b.src.style.visibility = src ? 'visible' : '';
      }
      const pressed = !out;
      if (pressed !== b.pressed) {
        b.pressed = pressed;
        b.tab.setAttribute('aria-pressed', String(pressed));
        if (flip?.ask.reader) tell(b, out);
      }
      if (queued !== b.queued) {
        b.queued = queued;
        b.tab.toggleAttribute('data-queued', queued);
      }
    }

    if (t < noteUntil) status = note;
    if (status) report(stage, status);

    bounds.fill(Infinity, 0, 2);
    bounds.fill(-Infinity, 2);
    const [dx, dy, hw, hh] = deck.box;
    grow(bx + dx * scale, by + dy * scale, 0, Math.hypot(hw, hh) * scale);
    grow(bx, by, 140 * scale, 36 * scale);
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      grow(bx + (elbowAt[0] - bx) * u, by + (elbowAt[1] - by) * u, 160 * scale, 54 * scale);
    }
    const cos = Math.cos(pose[1]);
    const sin = Math.sin(pose[1]);
    grow(bx - cos * 54 * scale, by - sin * 54 * scale, 152 * scale, 30 * scale);
    grow(elbowAt[0], elbowAt[1], (z + YOKE + 12) * scale, 54 * scale);
    const fx = Math.cos(pose[1] + pose[2]);
    const fy = Math.sin(pose[1] + pose[2]);
    const rise = Math.sin(pose[3]) * (PENCIL.reach - PENCIL.wrist);
    const wrist = PENCIL.wrist * scale;
    const length = (fore - wrist) * Math.cos(pose[3]);
    for (let i = 0; i <= 3; i++) {
      const u = i / 3;
      const l = wrist + length * u;
      grow(elbowAt[0] + fx * l, elbowAt[1] + fy * l, (z + rise * u + 22) * scale, 26 * scale);
    }
    const shadowX = (-LIGHT[0] / LIGHT[2]) * seat[2];
    const shadowY = (-LIGHT[1] / LIGHT[2]) * seat[2];
    const [x0, y0, x1, y1] = POSE_BOX[herPose];
    bounds[0] = Math.min(bounds[0], mateX + x0 * cell + Math.min(0, shadowX));
    bounds[1] = Math.min(bounds[1], mateY + y0 * cell + Math.min(0, shadowY));
    bounds[2] = Math.max(bounds[2], mateX + x1 * cell + Math.max(0, shadowX));
    bounds[3] = Math.max(bounds[3], mateY + y1 * cell + Math.max(0, shadowY));
    if (sliding) {
      bounds[0] = Math.min(bounds[0], sliding.cell.x);
      bounds[1] = Math.min(bounds[1], lineY - 1);
      bounds[2] = Math.max(bounds[2], sliding.cell.x + sliding.cell.w);
      bounds[3] = Math.max(bounds[3], lineY + 2);
    }

    if (along === 0) chain(bx - band.x);
    // she watches her pencil while it works, the cursor while it points at it
    let lookX = aiming && following ? (mouse ? cursorAt[0] : tipAt[0]) : crownX;
    for (const job of jobs) if (t >= job.go && t < job.free) lookX = tipAt[0];
    gaze = lookX < crownX - GLANCE ? 2 : lookX > crownX + GLANCE ? 3 : 0;
    paint();
    const at = `translate(${mateX - MATE_PAD[0] * cell}px, ${mateY - MATE_PAD[1] * cell}px)`;
    if (at !== mateAt) {
      mateAt = at;
      mate.style.transform = at;
    }

    if (!shader) return;
    set3('uCam', foot[0], foot[1], CAMERA);
    shader.set('uB', pivotAt);
    shader.set('uS', scale);
    const ex = BOOM * cos;
    const ey = BOOM * sin;
    set2('uE', ex, ey);
    set2('uF', fx, fy);
    shader.set('uPen', z);
    shader.set('uPitch', pose[3]);
    shader.set('uTurn', pose[1]);
    ram(ex, ey, fx, fy, rams);
    set2('uRamA', rams[0], rams[1]);
    set2('uRamB', rams[2], rams[3]);
    set2('uRamC', rams[4], rams[5]);
    shader.set('uGauge', gauge);
    const scan = sliding?.cell ?? none;
    set4('uScan', scan.x, scan.x + scan.w, lineY, sliding ? 1 : 0);
    set4('uDoc', inside.x, inside.y, inside.w, inside.h);
    set4('uBay', bay.x, bay.y, bay.w, bay.h);
    shader.set('uClip', bounds);
    // the march starts over the highest part: the quill's yoke, or her pencil's point tipped up
    shader.set('uTop', Math.max(170, z + YOKE + 12, z + rise + PENCIL.radius + 6) * scale);
    shader.set('uDeck', deck.box);
    shader.set('uValve', deck.valve);
    shader.set('uDial', deck.gauge);
    shader.set('uMotor', deck.motor);
    set3('uMate', mateX - MATE_PAD[0] * cell, mateY - MATE_PAD[1] * cell, cell);
    shader.set('uMateZ', seat[2]);
  }

  function chain(c: number) {
    const at = Math.round(c);
    if (at === chainAt) return;
    chainAt = at;
    const b = Math.round((at + BED.start) / 2);
    const end = band.w - BED.anchor;
    fixedRun.style.clipPath = `inset(0 0 0 ${b}px)`;
    pulledRun.style.clipPath = `inset(0 ${end - at}px 0 ${b}px)`;
    pulledRun.style.backgroundPositionX = `${at}px`;
    bend.style.transform = `translateX(${b - 9}px)`;
  }

  function paint() {
    if (!ink) return;
    const now = performance.now();
    sway(now);
    const herPose = hand < 0 ? 0 : poseOf(hand, height);
    const lit = wantLit && herPose > 0 && hand === wantHand && height > 0;
    const ticks = reduced ? 0 : Math.floor(now / TICK);
    const eyes = !reduced && ticks % BLINK === 0 ? 1 : gaze;
    const step = Math.floor(ticks / STEP) % ORBIT_STEPS;
    const shown =
      (((herPose * 2 + (lit ? 1 : 0)) * 4 + eyes) * ORBIT_STEPS + step) * 64 + RING[along];
    if (shown === mateShown) return;
    mateShown = shown;
    paintMate(mateImage, herPose, lit, eyes, step, RING[along], ink, LIGHT);
    mate.getContext('2d')!.putImageData(mateImage, 0, 0);
    mate.style.visibility = 'visible';
    if (herPose !== castPose) {
      castPose = herPose;
      shader?.texture('uSprite', (casts[herPose] ??= silhouette(herPose)));
    }
  }

  /** where she wants her remote at time t: at what the arm works at, from the hand on its side, as
   * high as it lies from her shoulder, lower while that arm would touch a tab */
  function aimHer(t: number, x: number, y: number) {
    herAt[0] = x;
    herAt[1] = y;
    let target = false;
    wantLit = false;
    if (begun && !reduced) {
      if (aiming && following) {
        target = true;
        aimed[0] = mouse ? cursorAt[0] : tipAt[0];
        aimed[1] = mouse ? cursorAt[1] : tipAt[1];
        wantLit = mouse && !steady;
      } else {
        for (const job of jobs) {
          if (t < job.go - LEAD || t >= job.free) continue;
          const b = job.ask.block;
          target = true;
          if (t >= job.touch && t < job.hit) {
            aimed[0] = tipAt[0];
            aimed[1] = tipAt[1];
          } else {
            aimed[0] = b.tipX;
            aimed[1] = (t < job.touch ? job.ask.out : !job.ask.out) ? b.range[0] : b.range[1];
          }
          wantLit = t < job.hit;
          break;
        }
      }
    }
    if (!target) {
      wantHand = -1;
      return;
    }
    const middle = x + (SPRITE_W / 2) * cell;
    const held = wantHand;
    if (held < 0 || Math.abs(aimed[0] - middle) > HAND_SLACK) wantHand = aimed[0] > middle ? 0 : 1;
    const across = Math.abs(aimed[0] - x - (wantHand === 0 ? 23 : 6) * cell);
    const e = (Math.atan2(y + 30.5 * cell - aimed[1], across) * 180) / Math.PI;
    const was = wantHand === held ? wantHeight : 2;
    wantHeight = 2;
    if (e > RAISE[1] + (was === 3 ? -RAISE_SLACK : RAISE_SLACK)) wantHeight = 3;
    else if (e < RAISE[0] + (was === 1 ? RAISE_SLACK : -RAISE_SLACK)) wantHeight = 1;
    while (wantHeight >= 0 && !armClear(x, y, poseOf(wantHand, wantHeight))) wantHeight--;
    if (wantHeight < 0) wantHand = -1;
  }

  /** her arm a pose nearer the one she wants every SWAY ms, at once lower off a tab */
  function sway(now: number) {
    while (hand >= 0 && !armClear(herAt[0], herAt[1], poseOf(hand, height))) {
      height--;
      if (height < 0) {
        hand = -1;
        height = 0;
      }
    }
    if (now >= swayAt) {
      const was = hand < 0 ? -1 : poseOf(hand, height);
      if (hand >= 0 && hand !== wantHand) {
        if (height > 0) height--;
        else hand = -1;
      } else if (hand < 0 && wantHand >= 0) {
        hand = wantHand;
        height = 0;
      } else if (hand >= 0 && height !== wantHeight) height += height < wantHeight ? 1 : -1;
      if ((hand < 0 ? -1 : poseOf(hand, height)) !== was) swayAt = now + SWAY;
    }
  }

  function armClear(x: number, y: number, pose: number): boolean {
    const [x0, y0, x1, y1] = ARM_BOX[pose];
    return !onTab(x + x0 * cell, y + y0 * cell, x + x1 * cell, y + y1 * cell);
  }

  function set2(name: string, x: number, y: number) {
    v2[0] = x;
    v2[1] = y;
    shader!.set(name, v2);
  }

  function set3(name: string, x: number, y: number, z: number) {
    v3[0] = x;
    v3[1] = y;
    v3[2] = z;
    shader!.set(name, v3);
  }

  function set4(name: string, x: number, y: number, z: number, w: number) {
    v4[0] = x;
    v4[1] = y;
    v4[2] = z;
    v4[3] = w;
    shader!.set(name, v4);
  }

  function refresh() {
    aiming = false;
    following = false;
    layout();
    apply();
    shader?.invalidate();
  }

  function onFrame(time: number) {
    const now = time * 1000;
    const dt = last < 0 ? 1000 / 60 : Math.min(48, now - last);
    last = now;
    if (phase === 'fade') {
      fading += dt;
      // paper covers the page on the canvas, cell by cell, then the page is cleared under it
      const covered = Math.min(1, fading / FADE);
      shader!.set('uCover', covered < 1 ? covered : 0);
      set4(
        'uClip',
        Math.min(bounds[0], inside.x),
        Math.min(bounds[1], inside.y),
        Math.max(bounds[2], inside.x + inside.w),
        Math.max(bounds[3], inside.y + inside.h),
      );
      if (covered >= 1) {
        phase = 'play';
        clock = 0;
        apply();
      }
      shader!.invalidate();
      return;
    }
    // the clock runs on under the reader's springs, so a press plays out as in the sequence
    if (phase === 'play') {
      clock = Math.min(total, clock + dt);
      if (clock >= total) {
        phase = 'rest';
        if (playing) {
          playing = false;
          if (over) follow();
        }
      }
    }
    if (following && !aiming && free()) take();
    let still = false;
    if (aiming) {
      still = aimStep(dt / 1000);
      steady = still;
      if (still && !following) {
        // home; stopped short of it, it drives the rest of the way
        const short = Math.abs(aimAt[0] - aimPose[0]) >= 1;
        settle(clock);
        if (short) wake();
      }
    }
    apply();
    if ((aiming && !still) || phase === 'play') shader!.invalidate();
    else last = -1;
  }

  function write() {
    begun = true;
    playing = true;
    brake = null;
    let t = 0;
    asks.length = 0;
    for (const b of blocks) {
      b.base = false;
      b.type = t;
      b.typed = t + b.keys * CHAR;
      t = b.typed + GAP;
      asks.push({
        block: b,
        out: true,
        held: b.typed,
        earliest: b.typed + ARRIVE - DRIVE,
        descend: b.typed + POP,
        queued: false,
        reader: false,
      });
    }
    since = 0;
    plan();
  }

  /** dither the page out, then write it again from the arm's pose */
  function replay() {
    if (!shader) return;
    from = [...pose];
    aiming = false;
    following = false;
    write();
    phase = 'fade';
    fading = 0;
    last = -1;
    shader.invalidate();
  }

  /** an empty file, before the stage comes into view */
  function ready() {
    from = park;
    write();
    phase = 'ready';
    clock = 0;
    apply();
  }

  function colours() {
    const style = getComputedStyle(stage);
    const night = isDark();
    const paper = cssRgb(style.getPropertyValue('--lp-paper'));
    const ink3 = cssRgb(style.getPropertyValue('--lp-ink'));
    const yellow = cssRgb(style.getPropertyValue('--lp-yellow'));
    const accent = night ? yellow : cssRgb(style.getPropertyValue('--lp-sun'));
    ink = mateInk(style);
    mateShown = -1;
    paint();
    if (!shader) return;
    shader.set('uLit', night ? ink3 : paper);
    shader.set('uShade', night ? paper : ink3);
    shader.set('uAccent', accent);
    shader.set('uYellow', yellow);
    shader.set('uLine', cssRgba(style.getPropertyValue('--lp-line-strong')));
    shader.set('uNight', night ? 1 : 0);
    shader.set('uL', LIGHT);
    shader.invalidate();
  }

  function free(): boolean {
    return begun && !playing && (!jobs.length || clock >= jobs[jobs.length - 1].free);
  }

  /** the rig leaves its plan for the reader's springs, from where and as fast as the plan has it */
  function take() {
    // it rests by the cursor a while before going back
    movedAt = performance.now();
    poseAt(clock, aimPose);
    sample(pen, clock, up, sole);
    lift = sole[0];
    const before = [0, 0, 0, 0];
    poseAt(clock - 16, before);
    aimSpeed[0] = (aimPose[0] - before[0]) / 0.016;
    for (let i = 1; i < 4; i++) aimSpeed[i] = (aimPose[i] - nearest(before[i], aimPose[i])) / 0.016;
    aiming = true;
    steady = false;
  }

  function follow() {
    if (!mouse || !begun || playing || reduced || !shader) return;
    following = true;
    movedAt = performance.now();
    if (!idle) idle = window.setTimeout(onIdle, IDLE);
    shader.invalidate();
  }

  function goBack() {
    following = false;
    window.clearTimeout(idle);
    idle = 0;
    for (let i = 0; i < 4; i++) aimAt[i] = park[i];
    shader?.invalidate();
  }

  function onScroll() {
    if (along !== 1 || mouse || !begun || playing || reduced || !shader) return;
    readAt = scrollY + READ * innerHeight;
    following = true;
    shader.invalidate();
  }

  function onIdle() {
    const left = movedAt + IDLE - performance.now();
    idle = left > 0 ? window.setTimeout(onIdle, left) : 0;
    if (!idle) goBack();
  }

  function onEnter(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    over = true;
    // where the stage is, so a move reads no layout; the cursor's own moves count from here, as a
    // scroll carries the page under a cursor that stays put
    const s = stage.getBoundingClientRect();
    stageAt[0] = s.left + scrollX;
    stageAt[1] = s.top + scrollY;
    client[0] = event.clientX;
    client[1] = event.clientY;
  }

  function onMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cursorAt[0] = event.pageX - stageAt[0];
    cursorAt[1] = event.pageY - stageAt[1];
    if (event.clientX !== client[0] || event.clientY !== client[1]) {
      client[0] = event.clientX;
      client[1] = event.clientY;
      mouse = true;
      follow();
    }
    if (following) shader?.invalidate();
  }

  function onLeave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    over = false;
    if (following && mouse) goBack();
  }

  /** what the last pointer to come down on the stage was: a finger presses only tabs */
  let downBy = '';
  function onDown(event: PointerEvent) {
    downBy = event.pointerType;
    if (downBy !== 'mouse') return;
    mouse = true;
    follow();
  }

  /** a finger or a pen anywhere on the page: the scroll leads again, no mouse rest parks it */
  function onTouch(event: PointerEvent) {
    if (event.pointerType === 'mouse' || !mouse) return;
    mouse = false;
    window.clearTimeout(idle);
    idle = 0;
    onScroll();
  }

  /** a press a click on a block asked for, until the double-click window has passed */
  let tentative: Ask | undefined;
  let clickTimer = 0;

  function drop() {
    window.clearTimeout(clickTimer);
    const ask = tentative;
    tentative = undefined;
    const i = ask ? asks.indexOf(ask) : -1;
    if (i < 0 || jobs[i].touch <= clock) return;
    if (!playing) settle(clock);
    asks.splice(asks.indexOf(ask!), 1);
    noteUntil = -1;
    plan();
    wake();
  }

  function onClick(event: MouseEvent) {
    const target = event.target as Element;
    const tab = target.closest('[data-tab]');
    if (tab) {
      const b = blocks.find((block) => block.tab === tab);
      if (b && (!begun || clock >= b.typed)) press(b);
      return;
    }
    // a mouse presses a block anywhere but on its own controls; a double-click or a selection
    // selects text instead, the press the first click set going taken back
    if (downBy !== 'mouse' || target.closest('a, button, input, [role="tab"]')) return;
    if (event.detail > 1 || getSelection()?.isCollapsed === false) {
      drop();
      return;
    }
    const b = blocks.find((block) => block.el.contains(target));
    if (!b || (begun && clock < b.typed)) return;
    window.clearTimeout(clickTimer);
    tentative = press(b);
    clickTimer = window.setTimeout(() => {
      if (getSelection()?.isCollapsed === false) drop();
      tentative = undefined;
    }, DOUBLE);
  }

  const listeners = new AbortController();
  const { signal } = listeners;
  const passive = { passive: true, signal };
  stage.addEventListener('pointerenter', onEnter, passive);
  stage.addEventListener('pointermove', onMove, passive);
  stage.addEventListener('pointerleave', onLeave, passive);
  stage.addEventListener('pointerdown', onDown, passive);
  stage.addEventListener('click', onClick, { signal });
  addEventListener('pointerdown', onTouch, passive);
  button.addEventListener('click', replay, { signal });

  const view = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      // the scroll moves a phone's arm only while the figure shows
      if (onScreen) {
        addEventListener('scroll', onScroll, passive);
        onScroll();
      } else removeEventListener('scroll', onScroll);
      if ((begun && phase !== 'ready') || reduced || !shader) return;
      // a stage taller than the viewport counts by the share of the viewport it fills
      const seen =
        entry.intersectionRatio >= START || entry.intersectionRect.height >= innerHeight * START;
      if (seen) {
        if (phase === 'ready') wake();
        else replay();
      } else if (!entry.isIntersecting && phase === 'rest' && !begun) ready();
    },
    { threshold: [0, 0.1, 0.2, START, 0.6] },
  );
  const resize = new ResizeObserver(refresh);
  // a section above that changes height moves the stage off whole pixels again
  const moved = new ResizeObserver(() => {
    snap();
    const s = stage.getBoundingClientRect();
    stageAt[0] = s.left + scrollX;
    stageAt[1] = s.top + scrollY;
  });

  refresh();
  colours();
  resize.observe(stage);
  moved.observe(document.body);
  view.observe(stage);
  const stopTheme = onTheme(colours);
  // her idle between the arm's frames: a blink now and then, her moon's next step
  const ticker = window.setInterval(() => {
    if (onScreen && !reduced) paint();
  }, TICK);
  void document.fonts.ready.then(() => {
    if (!signal.aborted) refresh();
  });

  return () => {
    listeners.abort();
    view.disconnect();
    resize.disconnect();
    moved.disconnect();
    stopTheme();
    window.clearTimeout(idle);
    window.clearTimeout(clickTimer);
    window.clearInterval(ticker);
    shader?.destroy();
  };
}
