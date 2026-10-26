import { cubicBezier } from 'motion/react';
import { createShaderCanvas, cssRgb, cssRgba } from '../../lib/gl';
import { clamp, type Rect, rectIn } from '../../lib/math';
import { camera, settle, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { isDark, onTheme } from '../../lib/theme';
import {
  BED,
  BED_DECK,
  BOOM,
  COLUMN_DECK,
  type Deck,
  fragment,
  PEN,
  PENCIL,
  ram,
  type Vec2,
  YOKE,
} from './arm';
import {
  ARM_BOX,
  CROWN_CELL,
  MATE_H,
  MATE_PAD,
  MATE_RISE,
  MATE_W,
  type MateInk,
  ORBIT_STEPS,
  paintMate,
  POSE_BOX,
  poseOf,
  SEAT_CELL,
  silhouette,
  SPRITE_H,
  SPRITE_W,
} from './mascot';

/** a key types in this long, two a frame at 60 Hz */
const CHAR = 1000 / 120;
/** the writer starts the next block this long after finishing one */
const GAP = 140;
/** a finished block's tab shows inverted this long */
const POP = 60;
/** the beats of a press, ms: the carriage drives to the plate's station while the arm reaches to
 * where the slide starts, her pencil standing up on its trunnion while the joints turn; it tips down
 * onto the plate and the quill lowers it, the last of that once the arm has stopped; its point slides
 * down the plate (or up, back to Markdown) at this pace within these bounds, the quill lifts it and
 * it tips up off the plate; the rig parks this long after the last, arriving this long after its
 * block's tab pops */
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
/** a long move cruises at this top speed, px/ms, between a start and a stop each this long, ms: the
 * two halves of a short move's curve, so a long one only adds the cruise; a move this short keeps
 * that curve over the drive's beat */
const TOP = 2.8;
const RAMP = 160;
const SHORT = (TOP * DRIVE) / 2.857;
/** of the drop, the share after the arm has stopped */
const SETTLE = 0.25;
/** ms a joint takes a radian at its gentlest: the boom turning on its ring, the elbow; the share
 * of the shorter of two windows of a move that run together */
const TURN_RATE = 140;
const BEND_RATE = 110;
/** up a phone's column, where the boom swings round over the page, the fastest its elbow sweeps on
 * average, stage px a ms; on a reader's springs, how far from its aim the boom still counts as
 * swinging, rad */
const SWING = 1;
const SWUNG = 0.3;
const OVERLAP = 0.35;
/** ms an arm caught mid-move by a press brakes for, along its way, before it sets off anew */
const BRAKE = 32;
/** the elbow's inner angle, rad: at both ends of every slide it stays between these; folded at
 * rest, it leaves this much */
const INNER: Vec2 = [(50 * Math.PI) / 180, (150 * Math.PI) / 180];
const TUCK = 0.06;
/** her pencil stood up off the page on its trunnion, rad; up a phone's column it tips no further
 * than this, never end-on to the camera */
const UPRIGHT = Math.PI / 2;
const STEEP = Math.PI / 3;
/** the replay dithers the page out in 16 frames at 60 fps */
const FADE = (16 * 1000) / 60;
/** world px: how high the camera stands over the page */
const CAMERA = 4000;
/** toward the light: high, from the upper right, so shadows stay short and fall onto the plate
 * being slid or into the bay */
const LIGHT = normalize(0.13, -0.18, 0.975);
/** share of the stage in view that starts the cycle */
const START = 0.4;
/** the arm on a reader's springs: this stiff (1/s), critically damped; the carriage no faster
 * than this, stage px/s, its joints than this, rad/s */
const AIM = 10;
const AIM_SPEED = 1500;
const AIM_SLEW = 7;
/** her pencil tips on a spring this stiff (1/s), up while the joints swing it round */
const AIM_TIP = 16;
/** up a phone's column the arm follows the scroll: the line a reader reads at, this share down the
 * viewport; the carriage's spring there (1/s) */
const READ = 0.45;
const SCROLL_AIM = 16;
/** in follow mode her pencil points at the cursor, its point this many px short of it */
const AIM_GAP = 10;
/** ms: a mouse that rests this long in the stage lets the rig go back to its park */
const IDLE = 2000;
/** ms the status line says a press asked for while the sequence plays is queued */
const NOTE = 1500;
/** ms: a second click within this long makes a double-click, which selects a word, not a press */
const DOUBLE = 250;
/** how big the rig is drawn: its scale, her cell (CSS px) and her moon's ring (cells wide) */
interface Rig {
  scale: number;
  cell: number;
  ring: number;
}

/** the rig on the bed's rail, and on a phone's column, smaller there only as its pencil, slanted no
 * further than the elbow opens, must be to keep its point this many px clear of the widest tab */
const BED_RIG: Rig = { scale: 0.6, cell: 2, ring: 21 };
const COLUMN_RIG: Rig = { scale: 0.6, cell: 2, ring: 13 };
const TAB_CLEAR = 24;
/** a phone's column rail stops this far short of the window's top and of its foot, for her crown
 * and her deck */
const COLUMN_END: Vec2 = [96, 44];
/** her moon takes a step round its ring every this many ticks */
const STEP = 2;
/** she blinks for a tick every this many ticks */
const BLINK = 33;
/** the pressure gauge: at rest, while the pencil slides, as it lifts */
const GAUGE: [number, number, number] = [0.2, 0.75, 1];
/** her eyes follow the pencil or the cursor once it is this far from her head, stage px */
const GLANCE = 60;
/** she raises her remote this long before a planned press sets off; her arm swings a pose every
 * this many ms */
const LEAD = TICK;
const SWAY = 48;
/** degrees from her shoulder: her remote goes low below the first, up above the second, and keeps
 * its height this much past either; px past her middle before she points it with her other hand */
const RAISE: Vec2 = [-30, 50];
const RAISE_SLACK = 8;
const HAND_SLACK = 8;
/** px: her pencil's point keeps this far inside a cell's edges; the boom's pivot this far clear of
 * the sides of a tab it stands past, she this far clear of a tab */
const INSET = 2;
const PIVOT_CLEAR = 18;
const HER_CLEAR = 6;
/** arm units round the elbow its eye, crank and yoke reach, which keep inside the window */
const ELBOW = 50;
/** the boom down a phone's column, as the camera sees it */
const DOWN = Math.PI / 2;

const ease = cubicBezier(...settle);
const inOut = cubicBezier(...camera);

/** the progress through window w (shares of a move) at u */
function within(u: number, w: Vec2): number {
  if (w[1] <= w[0]) return u >= w[1] ? 1 : 0;
  return clamp((u - w[0]) / (w[1] - w[0]));
}

/** progress over a long move with ramps of share r of its time: the first half of the camera
 * curve up to the cruise, the cruise, its second half to a stop */
function cruise(r: number): (u: number) => number {
  const v = 1 / (1 - 1.3 * r);
  const d = 0.35 * r * v;
  return (u) => {
    if (u <= r) return 2 * d * inOut(u / (2 * r));
    if (u >= 1 - r) return 1 - 2 * d * inOut((1 - u) / (2 * r));
    return d + v * (u - r);
  };
}

/** whether the segment from (x0, y0) to (x1, y1) meets box b grown by r on every side */
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

/** whether point (x, y) lies in box b grown by r on every side */
function inBox(x: number, y: number, r: number, b: Rect): boolean {
  return x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r;
}

/** `angle` turned by whole turns to the nearest of `near`, so a turn takes the short way round */
function nearest(angle: number, near: number): number {
  const turn = 2 * Math.PI;
  return angle + Math.round((near - angle) / turn) * turn;
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** a move from `a` to `b` between `t0` and `t1`, each value on its own curve, and her pencil's tilt
 * on its own; a slide instead runs her pencil's point straight from `task.a` to `task.b`, each the
 * carriage and the point from the pivot, its elbow bent to `task.bend`'s side */
interface Segment {
  t0: number;
  t1: number;
  a: number[];
  b: number[];
  ease: (u: number, i: number) => number;
  tilt?: (u: number) => number;
  /** her pencil's angle from the boom, where it takes its own way */
  bend?: (u: number) => number;
  task?: { a: number[]; b: number[]; bend: number };
}

/** a move's end pose, its angles unwrapped the way it goes, how long it takes, ms, and its curves */
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
  /** the tab's text, the block's Markdown in short */
  label: string;
  lines: HTMLElement[];
  lengths: number[];
  status: string;
  keys: number;
  /** shows its output before this plan's presses, or its Markdown */
  base: boolean;
  /** stage px, at rest: its plate, the cell its source and output share, which a slide wipes, and
   * its tab */
  box: Rect;
  cell: Rect;
  tabBox: Rect;
  rows: Vec2[];
  /** per source line, the characters its later rows start at: it wraps between words */
  breaks: number[][];
  /** its slide, stage px: the line her pencil's point runs down, its top and foot, and where the
   * carriage stands along its rail at each; which way the elbow bends for it */
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
  /** the share of its cell, from the top, its output shows over its Markdown */
  wipe: number;
  srcShown: boolean;
  pressed: boolean;
  queued: boolean;
}

/** a press asked for: by the writer finishing a block, or by a reader */
interface Ask {
  block: Block;
  /** to its output, or back to its Markdown */
  out: boolean;
  /** the block is held in its frame from here, the rig sets off and the pencil drops no earlier */
  held: number;
  earliest: number;
  descend: number;
  /** asked for while the sequence plays: it waits for the sequence's end, held from when the rig
   * sets off for it */
  queued: boolean;
  /** asked for by a reader, so its flip is told to a screen reader */
  reader: boolean;
}

/** a planned press: the rig sets off at `go`, the pencil starts its slide at `touch` (the flip
 * counts from there, `flip`), ends it at `hit`, and the rig is free at `free` */
interface Job {
  ask: Ask;
  go: number;
  touch: number;
  flip: number;
  hit: number;
  free: number;
}

/**
 * `quick-start.mdx`, written and pressed into its page. A caret types a block; the rig drives to its
 * plate, stands its boom up and reaches her pencil out over it, lowers it onto the plate and draws
 * its point straight down it: above the line it drags, the block is the real component, below it
 * still Markdown. A reader can ask for presses too: a press slides a block back up to its Markdown,
 * or down to its output. Everything on screen is a function of the cycle's clock, which runs on the
 * shader's frames while there is something to do. Once the writer's sequence has played, her pencil
 * points at a reader's mouse over the stage.
 */
export function createPress(stage: HTMLElement): () => void {
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas[data-arm]')!;
  const doc = stage.querySelector<HTMLElement>('[data-doc]')!;
  /** the rail band at the bed's foot, and a phone's column: the one the layout shows carries the rig */
  const bed = stage.querySelector<HTMLElement>('[data-bay]')!;
  const column = stage.querySelector<HTMLElement>('[data-bay-phone]')!;
  /** the drag chain on the bed: its fixed run, the run the carriage pulls, the bend */
  const fixedRun = stage.querySelector<HTMLElement>('[data-chain="fixed"]');
  const pulledRun = stage.querySelector<HTMLElement>('[data-chain="pulled"]');
  const bend = stage.querySelector<SVGElement>('[data-chain="bend"]');
  /** the detents on the bed's rail, one where the carriage stops for each plate */
  const stations = stage.querySelectorAll<SVGElement>('[data-station]');
  /** her, and her moon, painted a pixel a cell */
  const mate = stage.querySelector<HTMLCanvasElement>('canvas[data-mate]')!;
  const mateImage = new ImageData(MATE_W, MATE_H);
  mate.width = MATE_W;
  mate.height = MATE_H;
  const caret = stage.querySelector<HTMLElement>('[data-caret]')!;
  const button = stage.querySelector<HTMLButtonElement>('[data-replay]');
  /** what a screen reader hears of a reader's presses */
  const voice = stage.querySelector<HTMLElement>('[data-voice]');
  const figure = stage.closest<HTMLElement>('[data-figure]');
  /** the figure's own line, which the status bar says once there is nothing going on */
  const compiled = figure?.dataset.status ?? '';
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
      box: { x: 0, y: 0, w: 0, h: 0 },
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
  const size: Vec2 = [0, 0];
  let scale = 1;
  let foot: Vec2 = [0, 0];
  /** the carriage's rail: along x (0) on the bed or y (1) up a phone's column, from (x0, y0) to
   * (x1, y1) */
  let along = 0;
  const rail = [0, 0, 0, 0];
  let rig = BED_RIG;
  /** the carriage's deck: on the bed's rail, or up a phone's column */
  let deck: Deck = BED_DECK;
  /** the bed's band, where the drag chain lies, and the bay the carriage rides, where her shadow
   * falls: the band, or a phone's column; whether the bed has plates below its band */
  let band: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let bay: Rect = band;
  let below = false;
  /** the arm's links, stage px: the boom, and her pencil from the elbow to its point; on the bed,
   * how far along its rail the carriage can be for the boom to turn through the band, and how far
   * right the elbow may reach */
  let boom = 1;
  let fore = 1;
  let turnMax = Infinity;
  let reachMax = Infinity;
  let advance = 8;
  let lineHeight = 20;
  /** up a phone's column, the page's y a reader reads at, as the last scroll left it */
  let readAt = 0;
  /** inside the window's frame, where shadows fall */
  let inside: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // the plan: from a pose at a time, the asked presses in order, then the rig parks. A pose is
  // [the carriage along its rail, the boom's angle, her pencil's angle from the boom, as the camera
  // sees them, and how far it is tipped up off the page]
  const asks: Ask[] = [];
  const jobs: Job[] = [];
  const track: Segment[] = [];
  const pen: Segment[] = [];
  let park: number[] = [0, 0, TUCK - Math.PI, 0];
  /** up a phone's column, how far her pencil folded back along the boom opens off it, rad, to put
   * its point on the window's border */
  let fold = TUCK;
  let from: number[] = park;
  /** the plan a press took over from mid-move, its first pose, and when: the arm brakes along it */
  let brake: { track: Segment[]; from: number[]; at: number } | null = null;
  const other = [0, 0, 0, 0];
  let since = 0;
  let total = 0;
  let clock = 0;
  /** rest: nothing to do; ready: an empty file waiting for the view; fade: the page dithering out */
  let phase: 'rest' | 'ready' | 'fade' | 'play' = 'rest';
  /** the writer has started: until then the page is the server's finished one; the writer's
   * sequence plays, until its plan comes to rest */
  let begun = false;
  let playing = false;
  let fading = 0;
  let last = -1;
  /** the stage is on screen, where her idle plays */
  let onScreen = false;

  // once the sequence has played, the rig is the reader's: off its plan, on springs that point her
  // pencil at a mouse's cursor, then back to its park
  let aiming = false;
  let following = false;
  /** a mouse is over the stage */
  let over = false;
  /** the last real input was a mouse that moved, not a touch: the rig follows its cursor on either
   * rail; up a phone's column, without one, the scroll */
  let mouse = false;
  /** what the status line says for a while, a press queued */
  let note = '';
  let noteUntil = -1;
  /** the stage on the page, the cursor on the stage and in the viewport, px */
  const stageAt: Vec2 = [0, 0];
  const cursorAt: Vec2 = [0, 0];
  const client: Vec2 = [0, 0];
  let movedAt = 0;
  let idle = 0;
  /** the pose the arm is aimed at, the one on its springs, and its speeds; how high the quill holds
   * her pencil */
  const aimAt = [0, 0, 0, 0];
  const aimPose = [0, 0, 0, 0];
  const aimSpeed = [0, 0, 0, 0];
  let lift: number = PEN.up;

  // the frame's state
  const pose = [0, 0, 0, 0];
  const up: number[] = [PEN.up];
  const sole: number[] = [PEN.up];
  const bounds = [0, 0, 0, 0];
  const point: [number, number, number] = [0, 0, 1];
  const caretAt: Vec2 = [-1, -1];
  let caretMode = '';
  /** the shader's vectors, written in place */
  const v2: [number, number] = [0, 0];
  const v3: [number, number, number] = [0, 0, 0];
  const v4: [number, number, number, number] = [0, 0, 0, 0];
  /** her seat on the stage and its height; the pivot, the elbow and her pencil's point, stage px;
   * the elbow ram's clevis, barrel end and crank pin, arm units */
  const seat: [number, number, number] = [0, 0, 0];
  const pivotAt: Vec2 = [0, 0];
  const elbowAt: Vec2 = [0, 0];
  const tipAt: Vec2 = [0, 0];
  const rams = [0, 0, 0, 0, 0, 0];
  /** what is on screen of her and of the chain, so a frame writes only what changed: her frame and
   * moon's step, her place, and the carriage the chain was laid out for */
  let mateShown = -1;
  let mateAt = '';
  let chainAt = -1;
  /** her eyes' frame from the work, and the colours she is painted in */
  let gaze = 0;
  let ink: MateInk | undefined;
  /** her remote: the hand she holds it in (-1 idle, 0 her left, 1 her right) and how high (0 ready,
   * 1 low, 2 out, 3 up), shown and wanted; its light, wanted while she commands; when her arm may
   * swing to its next pose; what she points it at, and where her sprite was; the pose her
   * silhouette was cast in, and each pose's, cast once */
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
  /** the reader's springs have come to rest */
  let steady = false;
  const none: Rect = { x: 0, y: 0, w: 0, h: 0 };

  /** where a source line's rows after its first start, in characters, as the browser wrapped it */
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

  /** whole device pixels for the window's lines: each plate's height rounded up, and the stage
   * nudged up off the fraction the sections above leave its top at, so a block rasterizes the same
   * whatever has painted over it */
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
    // up a phone's column, how far left of the rail her pencil's point lies on a stroke
    let span = 0;
    const s = stage.getBoundingClientRect();
    if (s.width === 0) return;
    size[0] = s.width;
    size[1] = s.height;
    stageAt[0] = s.left + scrollX;
    stageAt[1] = s.top + scrollY;
    const page = rectIn(doc, s);
    inside = rectIn(doc.lastElementChild!, s);
    // the carriage rides the bed's rail band, or a phone's column beside the window
    band = rectIn(bed, s);
    const onBed = band.w > 0;
    along = onBed ? 0 : 1;
    rig = onBed ? BED_RIG : COLUMN_RIG;
    scale = rig.scale;
    foot = [page.x + page.w / 2, s.height * 0.3];
    if (onBed) {
      rail[0] = band.x + BED.start;
      rail[1] = band.y + BED.rail;
      // the far end of its travel is the last plate's station, set below
      rail[2] = band.x + band.w;
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
      // her pencil lies across the plates from the column's middle, its point clear of the widest
      // tab: slanted off the stroke line as far as that needs, the rig smaller only where the elbow
      // would open wider than it may
      let tabs = 0;
      for (const b of blocks) {
        const t = rectIn(b.tab, s);
        tabs = Math.max(tabs, t.x + t.w);
      }
      span = rail[0] - tabs - TAB_CLEAR;
      scale = Math.min(rig.scale, span / (Math.cos(INNER[1] - Math.PI / 2) * PENCIL.reach));
      // she stands as tall as on the bed, unless the boom is then too short for her pencil to pass
      // over her head, on the narrowest phones
      const crown = (SEAT_CELL[1] + MATE_RISE) * rig.cell + PENCIL.radius * 1.16 * scale + 8;
      if (BOOM * scale < crown) rig = { ...rig, cell: 1 };
      // her deck as wide as she is
      const half = Math.max(COLUMN_DECK.box[2], ((SPRITE_W / 2) * rig.cell + 2) / scale);
      deck = { ...COLUMN_DECK, box: [0, COLUMN_DECK.box[1], half, COLUMN_DECK.box[3]] };
    }
    boom = BOOM * scale;
    fore = PENCIL.reach * scale;
    // on the bed the elbow and the ram's crank keep inside its end, also while the boom turns
    reachMax = onBed ? band.x + band.w - 32 * scale - 6 : Infinity;
    turnMax = reachMax - boom;
    chainAt = -1;
    mateAt = '';
    mate.style.width = `${MATE_W * rig.cell}px`;
    mate.style.height = `${MATE_H * rig.cell}px`;
    // a monospace advance, measured on ten characters
    const probe = document.createElement('span');
    probe.textContent = '0000000000';
    blocks[0].lines[0].append(probe);
    advance = probe.getBoundingClientRect().width / 10;
    probe.remove();
    lineHeight = Number.parseFloat(getComputedStyle(blocks[0].lines[0]).lineHeight) || 20;
    for (const b of blocks) {
      b.box = rectIn(b.el, s);
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
      // up a phone's column her pencil lies flat across each plate's right part from an elbow on the
      // column's middle, slanted away from the boom: the boom up the column over a plate it can
      // reach so, down it under the lower ones; the carriage carries the whole slide
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
    // at rest: on the bed, at the rail's left end, the boom along the band toward the right, her
    // pencil folded back under it, she standing left of it; up a phone's column, as low as keeps
    // the elbow in the window, the boom hanging down the rail and her pencil folded back up along
    // it, its point, as the camera sees it, on the window's border
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

  /** block b's slide on the bed: where the carriage stops, to either side of the line her pencil's
   * point runs down and far enough from it that the elbow bends comfortably at both its ends, the
   * line as near its cell's middle as that allows; the pivot clear of the tabs the boom stands up
   * past, she clear of the tabs her head reaches and of her pencil at both ends, and, where plates
   * lie both sides of the rail, the stop where the boom has room to turn through the band */
  function station(b: Block, end: number) {
    const up = b.cell.y < rail[1];
    const near = up ? rail[1] - b.range[1] : b.range[0] - rail[1];
    const far = up ? rail[1] - b.range[0] : b.range[1] - rail[1];
    const row: Rect[] = [];
    for (const o of blocks) if (o.cell.y < rail[1] === up) row.push(o.tabBox);
    const turns = blocks.some((o) => o.cell.y > rail[1]);
    const half = (SPRITE_W / 2) * rig.cell;
    const crown = (SEAT_CELL[1] + MATE_RISE) * rig.cell + 2;
    const radius = PENCIL.radius * 1.16 * scale;
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
          // her, as the camera sees her at that stop
          project(
            stop + deck.seat[0] * scale,
            rail[1] + deck.seat[1] * scale,
            deck.seat[2] * scale,
          );
          const her: Rect = { x: point[0] - half, y: point[1] - crown, w: 2 * half, h: crown };
          if (!clearOfTabs(stop)) continue;
          let clear = true;
          for (const y of b.range) {
            reachTo(x - stop, y - rail[1], bendTo, joints);
            const ex = stop + boom * Math.cos(joints[1]);
            const ey = rail[1] + boom * Math.sin(joints[1]);
            if (crosses(x, y, ex, ey, radius + HER_CLEAR, her) || !elbowIn(ex, ey)) clear = false;
          }
          if (!clear) continue;
          let score = margin - Math.abs(x - middle) * 0.0015;
          if (turns && stop > turnMax) score -= 0.3;
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

  /** whether she, her moon's ring and all, keeps clear of every tab with the carriage at `c` along
   * its rail, as the camera sees her */
  function clearOfTabs(c: number): boolean {
    project(xOf(c) + deck.seat[0] * scale, yOf(c) + deck.seat[1] * scale, deck.seat[2] * scale);
    const cell = rig.cell;
    const x = point[0] - (SEAT_CELL[0] + MATE_PAD[0]) * cell;
    const y = point[1] - (SEAT_CELL[1] + MATE_PAD[1]) * cell;
    return !blocks.some(
      ({ tabBox: t }) =>
        x + MATE_W * cell > t.x - HER_CLEAR &&
        x < t.x + t.w + HER_CLEAR &&
        y + MATE_H * cell > t.y &&
        y < t.y + t.h,
    );
  }

  /** whether the elbow at (x, y), with its eye, crank and yoke round it, is inside the window */
  function elbowIn(x: number, y: number): boolean {
    const r = ELBOW * scale;
    return (
      x - r > inside.x &&
      y - r > inside.y &&
      x + r < inside.x + inside.w &&
      y + r < inside.y + inside.h
    );
  }

  /** the carriage's x and y at `c` along its rail */
  function xOf(c: number): number {
    return along === 0 ? c : rail[0];
  }

  function yOf(c: number): number {
    return along === 1 ? c : rail[1];
  }

  /** the elbow's inner angle with the end of a second link this long r from the pivot */
  function innerAt(r: number, l2 = fore): number {
    return Math.acos(clamp((boom * boom + l2 * l2 - r * r) / (2 * boom * l2), -1, 1));
  }

  /** the joints that put the end of a second link this long at (x, y) from the pivot, the elbow
   * bent to `bend`'s side (-1: the pencil turned anticlockwise from the boom, as the camera sees
   * it), into out[1] and out[2]; out of reach, the arm points straight at it */
  function reachTo(x: number, y: number, bend: number, out: number[], l2 = fore) {
    const d = clamp(Math.hypot(x, y), Math.abs(boom - l2) + 0.5, boom + l2 - 0.5);
    const a = Math.acos(clamp((boom * boom + d * d - l2 * l2) / (2 * boom * d), -1, 1));
    out[1] = Math.atan2(y, x) - bend * a;
    out[2] = bend * (Math.PI - innerAt(d, l2));
  }

  /** the boom's angle `angle`: on the bed always on the band's side, never round past her; up a
   * phone's column on the plates' side, from up the column round to down it, never out past the
   * stage's edge */
  function boomAngle(angle: number): number {
    if (along === 0) return Math.atan2(Math.sin(angle), Math.cos(angle));
    return angle - 2 * Math.PI * Math.ceil((angle + Math.PI / 2 - 0.5) / (2 * Math.PI));
  }

  /** the pose that puts her pencil's point at `task` (the carriage, and the point from the pivot),
   * the elbow bent to `bend`'s side, its angles the nearest to pose `near`'s */
  function solve(task: number[], bendTo: number, near: number[]): number[] {
    const out = [task[0], 0, 0, 0];
    reachTo(task[1], task[2], bendTo, out);
    out[1] = boomAngle(out[1]);
    out[2] = nearest(out[2], near[2]);
    return out;
  }

  /** the pivot, the elbow and her pencil's point of pose p, stage px */
  function place(p: number[]) {
    pivotAt[0] = xOf(p[0]);
    pivotAt[1] = yOf(p[0]);
    elbowAt[0] = pivotAt[0] + boom * Math.cos(p[1]);
    elbowAt[1] = pivotAt[1] + boom * Math.sin(p[1]);
    tipAt[0] = elbowAt[0] + fore * Math.cos(p[1] + p[2]);
    tipAt[1] = elbowAt[1] + fore * Math.sin(p[1] + p[2]);
  }

  /** whether pose p has its boom along its rail, as at the park */
  function stowed(p: number[]): boolean {
    return Math.abs(along === 0 ? Math.sin(p[1]) : Math.cos(p[1])) < 0.34;
  }

  /** the most the boom points along the band, its cosine, turning from angle a to b */
  function widest(a: number, b: number): number {
    if (along === 1) return 0;
    if (Math.min(a, b) <= 0 && Math.max(a, b) >= 0) return 1;
    return Math.max(Math.cos(a), Math.cos(b));
  }

  /** up a phone's column, her pencil's angle from the boom at `angle` folded back flat along it on
   * the window's side, as at rest, the way round nearest `near` */
  function foldAt(angle: number, near: number): number {
    return nearest(Math.PI - fold * Math.sin(angle), near);
  }

  /** the share of a move at which the carriage, on its curve from c0 to c1, passes c */
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

  /** ms the carriage takes over a run of this many px: a short one the drive's beat, a long one
   * cruising */
  function driveTime(run: number): number {
    if (run < 1) return 0;
    return run > SHORT ? Math.max(DRIVE, 1.3 * RAMP + run / TOP) : DRIVE;
  }

  /** a move from pose a to pose b, `pace` times a press's, at least this long: the carriage on the
   * camera curve, or cruising on a long run; her pencil tips up off the page at the start, the boom
   * and the elbow turn while it stands (on the bed the boom only where the carriage leaves the elbow
   * inside the bed's end), and it tips down at the end. Off the band the joints turn as early as
   * they can, from it as late */
  function move(a: number[], b: number[], pace = 1, least = 0): Leg {
    const turn = boomAngle(b[1]);
    const limit = reachMax - boom * widest(a[1], turn);
    // up a phone's column her pencil folds back flat along the boom as the move starts, as at rest,
    // goes round with it folded, and unfolds as it ends: never stood up end-on. On the bed the trip
    // home brings the elbow down out of the plates before the carriage drives off, her stood pencil
    // turning to point off along the band meanwhile, away from the tabs, then folds it home
    const flat = along === 1;
    const home = !flat && stowed([b[0], turn]) && !stowed(a) && a[0] <= limit;
    const fa = flat ? foldAt(a[1], a[2]) : a[2];
    const fb = flat ? foldAt(turn, fa) : home ? nearest(-turn, a[2]) : a[2];
    const end = [b[0], turn, nearest(b[2], fb), b[3]];
    const run = Math.abs(b[0] - a[0]);
    // a move that goes nowhere only tips her pencil across
    const stays = run < 0.5 && Math.abs(end[1] - a[1]) < 1e-3 && Math.abs(end[2] - a[2]) < 1e-3;
    // her pencil tips in the time its drawn length takes to change, so a part tip near upright,
    // where that length changes fastest, runs no quicker than a whole one
    let upT = Math.cos(a[3]) * TIP_UP * pace;
    let downT = Math.cos(b[3]) * TIP_DOWN * pace;
    // the elbow's turns before and after the boom's
    const preT = Math.abs(fa - a[2]) * BEND_RATE * pace;
    const postT = Math.abs(end[2] - fb) * BEND_RATE * pace;
    if (flat) {
      upT = preT;
      downT = postT;
    }
    if (stays) {
      upT = 0;
      downT = 0;
    }
    const turnT =
      Math.abs(end[1] - a[1]) * (flat ? Math.max(TURN_RATE, boom / SWING) : TURN_RATE) * pace;
    const bendT = Math.abs((flat || home ? fb - fa : end[2] - a[2]) * BEND_RATE * pace);
    const jointT = home ? preT + Math.max(turnT, bendT) + postT : Math.max(turnT, bendT);
    let time = Math.max(
      least,
      pace * driveTime(run) + (home ? upT + jointT : 0),
      upT + jointT + downT - OVERLAP * (Math.min(upT, jointT) + Math.min(jointT, downT)),
      160,
    );
    let curve = run > SHORT ? cruise(RAMP / time) : inOut;
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
    const carriage = curve;
    return {
      end,
      time,
      ease: (u, i) => (i === 0 ? carriage(within(u, drive)) : inOut(within(u, turns))),
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

  /** the legs of a move from pose a to b: one, unless the boom turns along the band where neither
   * end leaves the elbow room before the bed's end; then by where it has the room, turning there */
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

  /** the time a slide over block b takes */
  function slideTime(b: Block): number {
    return Math.min(SLIDE[1], Math.max(SLIDE[0], (b.range[1] - b.range[0]) * SLIDE_MS));
  }

  /** the value of a track of moves at time t, from `first` before any, into out */
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

  /** the legs of a move pushed onto the track from time t, the pose it ends at and when */
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

  /** the presses asked for, from `from` at `since`, then the park */
  function plan() {
    track.length = 0;
    pen.length = 0;
    jobs.length = 0;
    let previous = from;
    let free = since;
    for (const ask of asks) {
      const b = ask.block;
      // the slide runs down the cell to its output, up it back to its Markdown
      const c0 = ask.out ? b.stop : b.stopEnd;
      const c1 = ask.out ? b.stopEnd : b.stop;
      const a = [c0, b.tipX - xOf(c0), (ask.out ? b.range[0] : b.range[1]) - yOf(c0)];
      const z = [c1, b.tipX - xOf(c1), (ask.out ? b.range[1] : b.range[0]) - yOf(c1)];
      const legs = route(previous, solve(a, b.bend, previous));
      let move = 0;
      for (const leg of legs) move += leg.time;
      // the writer's press sets off so it arrives as its block's tab pops, a reader's at once; it
      // arrives no sooner than the pencil may touch, so the quill lowers it without a stop
      const go = Math.max(free, ask.earliest - (ask.reader ? 0 : move - DRIVE), ask.descend - move);
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
      const hit = touch + slideTime(b);
      const done = solve(z, b.bend, start);
      track.push({
        t0: touch,
        t1: hit,
        a: start,
        b: done,
        ease: inOut,
        task: { a, b: z, bend: b.bend },
      });
      // the quill lifts it, and it tips up off the plate, out of the way; up a phone's column it
      // folds back flat along the boom instead
      const stood =
        along === 1
          ? [done[0], done[1], foldAt(done[1], done[2]), 0]
          : [done[0], done[1], done[2], UPRIGHT];
      const away = Math.max(TIP_UP, Math.abs(stood[2] - done[2]) * BEND_RATE);
      track.push({ t0: hit, t1: hit + away, a: done, b: stood, ease: inOut });
      pen.push({ t0: hit, t1: hit + LIFT, a: [PEN.down], b: [PEN.up], ease });
      jobs.push({ ask, go, touch, flip: touch, hit, free: hit + away });
      previous = stood;
      free = hit + away;
    }
    // the park answers no one, so it takes its time: a press can catch it on the way at a gentle pace
    const [, parked] = push(route(previous, park, 1.5, PARK), previous, free + REST);
    total = parked;
  }

  /** whether a block shows its output once every press asked for it is done */
  function settled(b: Block): boolean {
    let out = b.base;
    for (const ask of asks) if (ask.block === b) out = ask.out;
    return out;
  }

  /** a reader's press on a block: it flips between its output and its Markdown; the press asked
   * for, if a new one */
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
        const out = !settled(b);
        ask = { block: b, out, held: t, earliest: t, descend: t, queued: true, reader: true };
        asks.push(ask);
        note = `queued ${b.label}`;
        noteUntil = t + NOTE;
        if (voice) voice.textContent = `${b.label}: queued`;
      }
      plan();
      apply();
      return ask;
    }
    // off a reader's spring, or once the arm has left for its park, the press sets off from where
    // the arm is
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
    const ask = {
      block: b,
      out: !settled(b),
      held: t,
      earliest: t,
      descend: t,
      queued: false,
      reader: true,
    };
    asks.splice(next, 0, ask);
    plan();
    wake();
    return ask;
  }

  function tell(b: Block, out: boolean) {
    if (voice) voice.textContent = `${b.label}: showing ${out ? 'output' : 'Markdown'}`;
  }

  /** whether a block shows its output at time t, a flip counting from its start */
  function shown(b: Block, t: number): boolean {
    let out = b.base;
    for (const job of jobs) if (job.ask.block === b && job.flip <= t) out = job.ask.out;
    return out;
  }

  /** a new plan from where everything stands now: each block keeps what it shows, the presses whose
   * slide hasn't started yet wait their turn */
  function settle(t: number) {
    const waiting: Ask[] = [];
    for (let i = 0; i < jobs.length; i++) if (jobs[i].touch > t) waiting.push(jobs[i].ask);
    for (const b of blocks) b.base = shown(b, t);
    asks.length = 0;
    for (const ask of waiting) asks.push(ask);
    // caught mid-move, the arm brakes along its way first, its speed falling to nothing, so it never
    // stops dead: it covers half the way the old plan would have in that time
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

  /** the screen point of world point (x, y) at height z, and the scale there, into `point` */
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

  /** whether stage point (x, y) is on a tab or on her, grown by her pencil's radius */
  function blocked(x: number, y: number): boolean {
    const r = PENCIL.radius * 1.16 * scale + 2;
    for (const b of blocks) if (inBox(x, y, r, b.tabBox)) return true;
    const cell = rig.cell;
    const left = seat[0] - SEAT_CELL[0] * cell;
    const top = seat[1] - (SEAT_CELL[1] + MATE_RISE) * cell;
    return inBox(x, y, r, {
      x: left,
      y: top,
      w: SPRITE_W * cell,
      h: (SPRITE_H + MATE_RISE) * cell,
    });
  }

  /** the pose that points her pencil at the cursor, its point AIM_GAP short of it and short of
   * every tab and of her, from where its elbow bends comfortably, into `out`: on the bed the
   * carriage right of the cursor, the arm on the cursor's side of the rail; up a phone's column the
   * carriage level with it. Up the column without a mouse, the line a reader reads at instead */
  function aimFor(out: number[]) {
    if (along === 1 && !mouse) return readFor(out);
    out[3] = 0;
    const k = CAMERA / (CAMERA - lift * scale);
    const x = clamp(foot[0] + (cursorAt[0] - foot[0]) / k, inside.x + 6, inside.x + inside.w - 6);
    const y = clamp(foot[1] + (cursorAt[1] - foot[1]) / k, inside.y + 6, inside.y + inside.h - 6);
    let bendTo: number;
    if (along === 1) {
      // up a phone's column the boom along it, up it from under the cursor, or down it from over
      const up = y + boom <= rail[3];
      bendTo = up ? -1 : 1;
      out[0] = clamp(y + (up ? boom : -boom), rail[1], rail[3]);
    } else {
      bendTo = below && y > rail[1] ? 1 : -1;
      // the cursor's distance from the pivot where the elbow's inner angle is about 100 degrees
      const r = Math.sqrt(boom * boom + fore * fore + 0.35 * boom * fore);
      const h = Math.abs(y - rail[1]);
      out[0] = clamp(
        x + Math.max(60 * scale, Math.sqrt(Math.max(0, r * r - h * h))),
        rail[0],
        rail[2],
      );
      // the nearest stop that keeps her clear of the tabs
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
      // its point steps back off a tab, or off her
      let g = gap;
      while (g < 220 && blocked(x - ((x - ex) / length) * g, y - ((y - ey) / length) * g)) g += 4;
      if (g === gap) break;
      gap = g;
    }
    out[1] = boomAngle(out[1]);
    out[2] = nearest(out[2], aimPose[2]);
  }

  /** up a phone's column, the parked fold carried to the line a reader reads at, into `out`: the
   * carriage where her pencil's point, as the camera sees it, marks that line on the window's
   * border, as far as the rail and the window let it */
  function readFor(out: number[]) {
    const k = CAMERA / (CAMERA - PEN.up * scale);
    const first = blocks[0].range[0];
    const last = blocks[blocks.length - 1].range[1];
    const y = foot[1] + (clamp(readAt - stageAt[1], first, last) - foot[1]) / k;
    out[0] = clamp(y - boom + fore * Math.cos(fold), rail[1], park[0]);
    out[1] = DOWN;
    out[2] = Math.PI - fold;
    out[3] = 0;
  }

  /** how far her pencil, along its line on the page from the trunnion of the pose last placed, must
   * tip up off the page to keep clear of every tab and of her */
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

  /** the arm on its springs, one step of `dt` seconds: the carriage no faster than its top speed,
   * the joints than their slew, the elbow kept inside the bed's end, and her pencil tipped up as far
   * as it must to keep clear, and up while the joints swing it round; whether it stopped */
  function aimStep(dt: number): boolean {
    if (following) aimFor(aimAt);
    lift = Math.min(PEN.up, lift + ((PEN.up - PEN.down) / LIFT) * 1000 * dt);
    const turn = boomAngle(aimAt[1]);
    const swinging = Math.abs(turn - aimPose[1]) > SWUNG;
    // up a phone's column her pencil folds back flat along the boom while the boom swings round; on
    // the bed, going home, the carriage waits while the elbow comes down out of the plates
    const targets = [
      along === 0 && !following && swinging ? aimPose[0] : aimAt[0],
      turn,
      along === 1 && swinging ? foldAt(aimPose[1], aimPose[2]) : nearest(aimAt[2], aimPose[2]),
    ];
    const stiff = along === 1 && !mouse ? SCROLL_AIM : AIM;
    // up a phone's column the boom's elbow sweeps no faster than a move's
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
    // on the bed it stands up while the joints swing it round; up a phone's column it folds instead,
    // and lies clear of her and of the tabs folded, and never stands up end-on
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

  /** the state at the clock */
  function apply() {
    const t = clock;
    const live = begun;
    // the writer: the lines typed so far show, the one being typed is cut at the caret
    let caretX = 0;
    let caretY = 0;
    let typing = false;
    for (const b of blocks) {
      let keys = !live || t < b.type ? -1 : Math.min(b.keys, Math.floor((t - b.type) / CHAR));
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
          b.lines[i].style.visibility = !live || i < shown ? '' : 'hidden';
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
    const lastBlock = blocks[blocks.length - 1];
    const mode =
      !live || t >= lastBlock.typed + 600 ? 'none' : typing && phase === 'play' ? 'solid' : 'blink';
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

    // the rig
    if (aiming) for (let i = 0; i < 4; i++) pose[i] = aimPose[i];
    else poseAt(t, pose);
    sample(pen, t, up, sole);
    const z = aiming ? lift : sole[0];
    place(pose);
    // the line her pencil's point drags, where the camera sees it, on whole device pixels: the
    // wipe's edge and the canvas's line
    const dpr = Math.min(2, window.devicePixelRatio);
    project(tipAt[0], tipAt[1], z * scale);
    const lineY = Math.round(point[1] * dpr) / dpr;
    let gauge = GAUGE[0];
    let sliding: Block | null = null;
    // the writer, a press, or, with nothing left to do, the figure's own line
    let status = !begun ? '' : typing ? 'typing quick-start.mdx' : compiled;
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
    const cell = rig.cell;
    const mateX = Math.round(seat[0] - SEAT_CELL[0] * cell);
    const mateY = Math.round(seat[1] - SEAT_CELL[1] * cell);
    const crownX = mateX + CROWN_CELL[0] * cell;
    aimHer(t, mateX, mateY);
    sway(performance.now());
    const herPose = hand < 0 ? 0 : poseOf(hand, height);

    // the strips
    for (const b of blocks) {
      let framed = false;
      let queued = false;
      let flip: Job | null = null;
      for (const job of jobs) {
        if (job.ask.block !== b) continue;
        if (t >= (job.ask.queued ? job.go : job.ask.held) && t < job.hit) framed = true;
        if (job.ask.queued && t < job.go) queued = true;
        if (job.flip <= t) flip = job;
      }
      // a finished block: its tab pops, inverted for a moment, and its frame holds it as one strip
      const tabState = !live ? 2 : t < b.typed ? 0 : t < b.typed + POP ? 1 : 2;
      if (tabState !== b.tabState) {
        b.tabState = tabState;
        b.tab.style.visibility = tabState === 0 ? 'hidden' : '';
        if (tabState === 1) b.tab.dataset.inverted = '';
        else delete b.tab.dataset.inverted;
      }
      if (framed !== b.framed) {
        b.framed = framed;
        if (framed) b.el.dataset.framed = '';
        else delete b.el.dataset.framed;
      }
      // the output over the Markdown: shown above the pencil's line while it slides
      const out = flip ? flip.ask.out : b.base;
      let wipe = out ? 1 : 0;
      if (flip && t < flip.hit && sliding === b) wipe = clamp((lineY - b.cell.y) / b.cell.h);
      if (wipe !== b.wipe) {
        b.wipe = wipe;
        b.out.style.visibility = wipe <= 0 ? 'hidden' : '';
        b.out.style.clipPath = wipe > 0 && wipe < 1 ? `inset(0 0 ${(1 - wipe) * 100}% 0)` : '';
        b.src.style.clipPath = wipe > 0 && wipe < 1 ? `inset(${wipe * 100}% 0 0 0)` : '';
      }
      const src = wipe < 1 && (!live || t >= b.type);
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
      // a press waiting for the sequence's end latches its tab
      if (queued !== b.queued) {
        b.queued = queued;
        if (queued) b.tab.dataset.queued = '';
        else delete b.tab.dataset.queued;
      }
    }

    if (t < noteUntil) status = note;
    if (status) report(stage, status);

    bounds[0] = Infinity;
    bounds[1] = Infinity;
    bounds[2] = -Infinity;
    bounds[3] = -Infinity;
    grow(
      bx + deck.box[0] * scale,
      by + deck.box[1] * scale,
      0,
      Math.hypot(deck.box[2], deck.box[3]) * scale,
    );
    grow(bx, by, 140 * scale, 36 * scale);
    // the boom with its ram to the elbow, its counterweight, the quill and its yoke, and her pencil
    // from its butt to its point
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      grow(bx + (elbowAt[0] - bx) * u, by + (elbowAt[1] - by) * u, 160 * scale, 54 * scale);
    }
    grow(
      bx - Math.cos(pose[1]) * 54 * scale,
      by - Math.sin(pose[1]) * 54 * scale,
      152 * scale,
      30 * scale,
    );
    grow(elbowAt[0], elbowAt[1], (z + YOKE + 12) * scale, 54 * scale);
    const fx = Math.cos(pose[1] + pose[2]);
    const fy = Math.sin(pose[1] + pose[2]);
    // her pencil from its trunnion to its point, tipped up off the page by pose[3]
    const flat = Math.cos(pose[3]);
    const rise = Math.sin(pose[3]) * (PENCIL.reach - PENCIL.wrist);
    const wrist = PENCIL.wrist * scale;
    const length = (fore - wrist) * flat;
    for (let i = 0; i <= 3; i++) {
      const u = i / 3;
      grow(
        elbowAt[0] + fx * (wrist + length * u),
        elbowAt[1] + fy * (wrist + length * u),
        (z + rise * u + 22) * scale,
        26 * scale,
      );
    }
    // her shadow on the rig and the bay
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
    set2('uB', bx, by);
    shader.set('uS', scale);
    const ex = BOOM * Math.cos(pose[1]);
    const ey = BOOM * Math.sin(pose[1]);
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
    set4('uClip', bounds[0], bounds[1], bounds[2], bounds[3]);
    // the march starts over the highest part: the quill's yoke, or her pencil's point tipped up
    shader.set('uTop', Math.max(170, z + YOKE + 12, z + rise + PENCIL.radius + 6) * scale);
    set4('uDeck', deck.box[0], deck.box[1], deck.box[2], deck.box[3]);
    set2('uValve', deck.valve[0], deck.valve[1]);
    set2('uDial', deck.gauge[0], deck.gauge[1]);
    set2('uMotor', deck.motor[0], deck.motor[1]);
    set3('uMate', mateX - MATE_PAD[0] * cell, mateY - MATE_PAD[1] * cell, cell);
    shader.set('uMateZ', seat[2]);
  }

  /** the drag chain for the carriage at `c` along the band: its bend halfway between the carriage
   * and the start of its travel, the fixed run from there to its anchor, the pulled run from there
   * to the carriage, its links moving with it */
  function chain(c: number) {
    const at = Math.round(c);
    if (at === chainAt || !fixedRun || !pulledRun || !bend) return;
    chainAt = at;
    const b = Math.round((at + BED.start) / 2);
    const end = band.w - BED.anchor;
    fixedRun.style.clipPath = `inset(0 0 0 ${b}px)`;
    pulledRun.style.clipPath = `inset(0 ${end - at}px 0 ${b}px)`;
    pulledRun.style.backgroundPositionX = `${at}px`;
    bend.style.transform = `translateX(${b - 9}px)`;
  }

  /** her frame and her moon's step: her pose and remote's light, her gaze, a blink now and then,
   * the moon's orbit in steps; a new pose casts its silhouette on the rig */
  function paint() {
    if (!ink) return;
    const now = performance.now();
    sway(now);
    const herPose = hand < 0 ? 0 : poseOf(hand, height);
    const lit = wantLit && herPose > 0 && hand === wantHand && height > 0;
    const ticks = reduced ? 0 : Math.floor(now / TICK);
    const eyes = !reduced && ticks % BLINK === 0 ? 1 : gaze;
    const step = Math.floor(ticks / STEP) % ORBIT_STEPS;
    const shown = (((herPose * 2 + (lit ? 1 : 0)) * 4 + eyes) * ORBIT_STEPS + step) * 64 + rig.ring;
    if (shown === mateShown) return;
    mateShown = shown;
    paintMate(mateImage, herPose, lit, eyes, step, rig.ring, ink, LIGHT);
    mate.getContext('2d')!.putImageData(mateImage, 0, 0);
    mate.style.visibility = 'visible';
    if (herPose !== castPose) {
      castPose = herPose;
      shader?.texture('uSprite', castOf(herPose));
    }
  }

  function castOf(pose: number): ImageData {
    casts[pose] ??= silhouette(pose);
    return casts[pose];
  }

  /**
   * Where she wants her remote at time t, her sprite at (x, y): pointed at what the arm works at,
   * from the hand on its side and as high as it lies from her shoulder, lower while that arm would
   * touch a tab. A press: the slide's start from just before it sets off, the pencil's point as it
   * slides, the slide's end till it's done, lit till the pencil lifts. The reader's springs: the
   * cursor, lit while the arm moves to it, or up a phone's column the line it reads at. Nothing to
   * point at: idle.
   */
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
    const cell = rig.cell;
    const middle = x + (SPRITE_W / 2) * cell;
    const held = wantHand;
    if (held < 0 || Math.abs(aimed[0] - middle) > HAND_SLACK) wantHand = aimed[0] > middle ? 0 : 1;
    const e =
      (Math.atan2(
        y + 30.5 * cell - aimed[1],
        Math.abs(aimed[0] - x - (wantHand === 0 ? 23 : 6) * cell),
      ) *
        180) /
      Math.PI;
    const was = wantHand === held ? wantHeight : 2;
    wantHeight =
      e > RAISE[1] + (was === 3 ? -RAISE_SLACK : RAISE_SLACK)
        ? 3
        : e < RAISE[0] + (was === 1 ? RAISE_SLACK : -RAISE_SLACK)
          ? 1
          : 2;
    while (wantHeight >= 0 && !armClear(x, y, poseOf(wantHand, wantHeight))) wantHeight--;
    if (wantHeight < 0) wantHand = -1;
  }

  /** her arm a pose nearer the one she wants, a pose every SWAY ms: down to change hands or to idle,
   * through ready from idle; at once lower while it would touch a tab where she now stands */
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

  /** whether her arm in `pose`, her sprite at (x, y), keeps clear of every tab as her canvas does */
  function armClear(x: number, y: number, pose: number): boolean {
    const cell = rig.cell;
    const [x0, y0, x1, y1] = ARM_BOX[pose];
    for (const { tabBox: t } of blocks) {
      if (
        x + x1 * cell > t.x - HER_CLEAR &&
        x + x0 * cell < t.x + t.w + HER_CLEAR &&
        y + y1 * cell > t.y &&
        y + y0 * cell < t.y + t.h
      )
        return false;
    }
    return true;
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

  /** measure the stage again, and draw the state at the clock in it, the arm back on its plan */
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
    // the clock runs on with the arm on the reader's springs, so a press plays out as in the
    // sequence
    if (phase === 'play') {
      clock = Math.min(total, clock + dt);
      if (clock >= total) {
        phase = 'rest';
        // the sequence has played: the rig is the reader's, and reaches for a mouse over it; up a
        // phone's column it rests until the reader scrolls
        if (playing) {
          playing = false;
          if (over) follow();
        }
      }
    }
    // a reader's mouse takes the rig once it is free
    if (following && !aiming && free()) take();
    let still = false;
    if (aiming) {
      still = aimStep(dt / 1000);
      steady = still;
      if (still && !following) {
        // back at its park; stopped short of it, it drives the rest of the way
        const short = Math.abs(aimAt[0] - aimPose[0]) >= 1;
        settle(clock);
        if (short) wake();
      }
    }
    apply();
    if ((aiming && !still) || phase === 'play') shader!.invalidate();
    else last = -1;
  }

  /** the writer's presses: each block as it is typed */
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
    // she keeps her look in either theme: a light jacket, black clothes, an outline in the ink
    const paperBytes = bytes(paper);
    const inkBytes = bytes(ink3);
    ink = {
      line: night ? paperBytes : inkBytes,
      pen: inkBytes,
      lit: night ? inkBytes : paperBytes,
      yellow: bytes(yellow),
      paper: paperBytes,
      accent: bytes(accent),
    };
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

  // a reader plays with the rig: a mouse in the stage draws it, her pencil pointing at the cursor;
  // a click on a block, or a press of its tab, presses the block

  /** whether the arm is free for the reader: the sequence played, every press done */
  function free(): boolean {
    return begun && !playing && (!jobs.length || clock >= jobs[jobs.length - 1].free);
  }

  /** the rig leaves its plan for the reader's springs, from where the plan has it and as fast */
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

  /** a mouse moves or clicks in the stage: once the sequence has played, the arm follows it */
  function follow() {
    if (!mouse || !begun || playing || reduced || !shader) return;
    following = true;
    movedAt = performance.now();
    if (!idle) idle = window.setTimeout(onIdle, IDLE);
    shader.invalidate();
  }

  /** the mouse rests or leaves: the arm springs back to its park */
  function goBack() {
    following = false;
    window.clearTimeout(idle);
    idle = 0;
    for (let i = 0; i < 4; i++) aimAt[i] = park[i];
    shader?.invalidate();
  }

  /** up a phone's column, with no mouse moving, the arm follows the scroll once the sequence has
   * played */
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

  /** a finger or a pen anywhere on the page: the scroll leads again, and the mouse's rest no longer
   * parks the arm */
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

  /** a second click, or a selection, takes back the press the first asked for: the arm drifts back
   * before its pencil comes down */
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

  const passive = { passive: true };
  stage.addEventListener('pointerenter', onEnter, passive);
  stage.addEventListener('pointermove', onMove, passive);
  stage.addEventListener('pointerleave', onLeave, passive);
  stage.addEventListener('pointerdown', onDown, passive);
  stage.addEventListener('click', onClick);
  addEventListener('pointerdown', onTouch, passive);

  const view = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      // the scroll moves a phone's arm only while the figure shows
      if (onScreen) {
        addEventListener('scroll', onScroll, passive);
        onScroll();
      } else removeEventListener('scroll', onScroll);
      // started: the writer begun and past its empty file
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
  button?.addEventListener('click', replay);
  // her idle between the arm's frames: a blink now and then, her moon's next step
  const ticker = window.setInterval(() => {
    if (onScreen && !reduced) paint();
  }, TICK);
  let disposed = false;
  void document.fonts.ready.then(() => {
    if (!disposed) refresh();
  });

  return () => {
    disposed = true;
    view.disconnect();
    resize.disconnect();
    moved.disconnect();
    stopTheme();
    button?.removeEventListener('click', replay);
    stage.removeEventListener('pointerenter', onEnter);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('click', onClick);
    removeEventListener('scroll', onScroll);
    removeEventListener('pointerdown', onTouch);
    window.clearTimeout(idle);
    window.clearTimeout(clickTimer);
    window.clearInterval(ticker);
    shader?.destroy();
  };
}

/** a colour as bytes, for a 2D canvas */
function bytes([r, g, b]: readonly [number, number, number]): [number, number, number] {
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
