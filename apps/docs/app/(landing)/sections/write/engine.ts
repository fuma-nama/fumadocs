import { cubicBezier } from 'motion/react';
import { createShaderCanvas } from '../../lib/gl';
import { camera, settle, TICK } from '../../lib/motion';
import { setStatus } from '../../lib/status';
import {
  BED,
  BED_DECK,
  COLUMN_DECK,
  type Deck,
  fragment,
  HEAD,
  MAST,
  MAST_MAX,
  PEN,
  PENCIL,
  type Vec2,
} from './arm';
import {
  CROWN_CELL,
  MATE_H,
  MATE_PAD,
  MATE_RISE,
  MATE_W,
  type MateInk,
  ORBIT_STEPS,
  paintMate,
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
/** the beats of a press, ms: the carriage drives to the plate's station, its mast running out to
 * where the slide starts (or, to turn the mast round, retracting, turning and running out again on
 * the way); the pencil tips up off the mast and down across the plate onto it, the last of it once
 * the head has stopped; it slides down the plate (or up, back to Markdown) at this pace within these
 * bounds, lifts and tips back up and down along the mast; the rig parks this long after the last,
 * arriving this long after its block's tab pops */
const DRIVE = 460;
const DEPLOY = 240;
const SLIDE_MS = 1.5;
const SLIDE: Vec2 = [260, 520];
const FOLD = 240;
const REST = 60;
const PARK = 700;
const ARRIVE = 40;
/** a long move cruises at this top speed, px/ms, between a start and a stop each this long, ms: the
 * two halves of a short move's curve, so a long one only adds the cruise; a move this short keeps
 * that curve over the drive's beat */
const TOP = 2.8;
const RAMP = 160;
const SHORT = (TOP * DRIVE) / 2.857;
/** of a deploy, the share the head has stopped for */
const SETTLE = 0.25;
/** the replay dithers the page out in 16 frames at 60 fps */
const FADE = (16 * 1000) / 60;
/** world px: how high the camera stands over the page */
const CAMERA = 4000;
/** toward the light: high, from the upper right, so shadows stay short and fall onto the plate
 * being slid or into the bay */
const LIGHT = normalize(0.13, -0.18, 0.975);
/** share of the stage in view that starts the cycle */
const START = 0.4;
/** the head on a reader's spring: this stiff (1/s), critically damped, no faster than this, stage
 * px/s; its mast turns round at this many rad/s */
const AIM = 10;
const AIM_SPEED = 1500;
const SLEW = 7;
/** stage px between the cursor and the corner of the head following it, and half the height of the
 * line of text under the cursor, which the rig keeps clear of */
const BESIDE: Vec2 = [12, 16];
const LINE = 10;
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

/** the rig on the bed's rail, and on a phone's column */
const BED_RIG: Rig = { scale: 0.6, cell: 2, ring: 21 };
const COLUMN_RIG: Rig = { scale: 0.38, cell: 1, ring: 17 };
/** a phone's column rail stops this far short of the window's top and foot */
const COLUMN_END = 32;
/** her moon takes a step round its ring every this many ticks */
const STEP = 2;
/** she blinks for a tick every this many ticks */
const BLINK = 33;
/** the pressure gauge: at rest, while the pencil slides, as it lifts */
const GAUGE: [number, number, number] = [0.2, 0.75, 1];
/** her eyes follow the head or the cursor once it is this far from her head, stage px */
const GLANCE = 60;
/** px between the head and a plate's edge: at its station, the right seam, and through a slide,
 * the top and foot; clear of the frame a held plate shows 5px inside them */
const CLEAR = 6;
/** the mast's directions, screen angles: up, down, right (parked on the bed), left (working up a
 * phone's column) */
const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;
const RIGHT = 0;
const LEFT = Math.PI;

const ease = cubicBezier(...settle);
const inOut = cubicBezier(...camera);

function clamp01(u: number): number {
  return Math.min(1, Math.max(0, u));
}

/** a gentle ease in and out, half again as fast at its middle as on average */
function smooth(u: number): number {
  return u * u * (3 - 2 * u);
}

/** every value on one curve */
function together(u: number): number {
  return inOut(u);
}

/** the pencil tips up and down at an even pace, which `tip` eases itself, everything else holds */
function tipping(u: number, i: number): number {
  return i === 3 ? u : inOut(u);
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

/** `angle` turned by whole turns to the nearest of `near`, so a turn takes the short way round */
function nearest(angle: number, near: number): number {
  const turn = 2 * Math.PI;
  return angle + Math.round((near - angle) / turn) * turn;
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** a move from `a` to `b` between `t0` and `t1`, each value on its own curve */
interface Segment {
  t0: number;
  t1: number;
  a: number[];
  b: number[];
  ease: (u: number, i: number) => number;
}

/** the value of a track of moves at time t, from `first` before any */
function sample(track: Segment[], t: number, first: number[], out: number[]) {
  let from = first;
  for (const segment of track) {
    if (t < segment.t0) break;
    if (t < segment.t1) {
      const u = (t - segment.t0) / (segment.t1 - segment.t0);
      for (let i = 0; i < out.length; i++) {
        out[i] = segment.a[i] + (segment.b[i] - segment.a[i]) * segment.ease(u, i);
      }
      return;
    }
    from = segment.b;
  }
  for (let i = 0; i < out.length; i++) out[i] = from[i];
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
  /** stage px, at rest: its plate, and the cell its source and output share, which a slide wipes */
  box: Rect;
  cell: Rect;
  rows: Vec2[];
  /** characters a source line holds before it wraps */
  wrap: number;
  /** where the carriage stops for it, along its rail, and where its mast points: up or down from
   * the bed's rail, left from a phone's column */
  stop: number;
  side: number;
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
 * plate, runs its mast out over it and unfolds her pencil across it, and slides the pencil down the
 * plate: above the line it drags, the block is the real component, below it still Markdown. A reader
 * can ask for presses too: a press slides a block back up to its Markdown, or down to its output.
 * Everything on screen is a function of the cycle's clock, which runs on the shader's frames while
 * there is something to do. Once the writer's sequence has played, the head follows a reader's mouse
 * over the stage.
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
      rows: [],
      wrap: 80,
      stop: 0,
      side: UP,
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
  shader?.texture('uSprite', silhouette());

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
  /** on a phone's column, how far the mast runs out over the blocks */
  let reachOut = 0;
  let advance = 8;
  let lineHeight = 20;
  /** inside the window's frame, where shadows fall */
  let inside: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // the plan: from a pose at a time, the asked presses in order, then the rig parks. A pose is
  // [the carriage along its rail, the mast's angle, its reach (stage px), the pencil's angle]
  const asks: Ask[] = [];
  const jobs: Job[] = [];
  const track: Segment[] = [];
  const pen: Segment[] = [];
  let park: number[] = [0, LEFT, 0, 0];
  let from: number[] = park;
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
  let started = false;
  /** the stage is on screen, where her idle plays */
  let onScreen = false;
  let active = false;
  let lastStatus = '';

  // once the sequence has played, the rig is the reader's: off its plan, its head follows a mouse's
  // cursor on a spring, then goes back to its park
  let aiming = false;
  let following = false;
  /** a mouse is over the stage */
  let over = false;
  /** what the status line says for a while, a press queued */
  let note = '';
  let noteUntil = -1;
  /** the stage on the page, the cursor on the stage and in the viewport, px */
  const stageAt: Vec2 = [0, 0];
  const cursorAt: Vec2 = [0, 0];
  const client: Vec2 = [0, 0];
  let movedAt = 0;
  let idle = 0;
  /** the pose the head is aimed at, the one on the spring, and its speeds */
  const aimAt = [0, 0, 0, 0];
  const aimPose = [0, 0, 0, 0];
  const aimSpeed: Vec2 = [0, 0];
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
  /** her seat on the stage and its height; the head of the frame, and its pencil's angle on the
   * page and tip out of it */
  const seat: [number, number, number] = [0, 0, 0];
  const head: Vec2 = [0, 0];
  const tilt: Vec2 = [0, 0];
  /** what is on screen of her and of the chain, so a frame writes only what changed: her frame and
   * moon's step, her place, and the carriage the chain was laid out for */
  let mateShown = -1;
  let mateAt = '';
  let chainAt = -1;
  /** her eyes' frame from the work, and the colours she is painted in */
  let gaze = 0;
  let ink: MateInk | undefined;
  const none: Rect = { x: 0, y: 0, w: 0, h: 0 };

  function box(el: Element, s: DOMRect): Rect {
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }

  /** whole device pixels for the window's lines: each plate's height rounded up, and the stage
   * nudged up off the fraction the sections above leave its top at, so a block rasterizes the same
   * whatever has painted over it */
  function snap() {
    const dpr = window.devicePixelRatio || 1;
    stage.style.top = '';
    for (const b of blocks) b.el.style.minHeight = '';
    const heights = blocks.map((b) => b.el.getBoundingClientRect().height);
    blocks.forEach((b, i) => {
      b.el.style.minHeight = `${Math.ceil(heights[i] * dpr - 0.01) / dpr}px`;
    });
    const top = (stage.getBoundingClientRect().top + scrollY) * dpr;
    const off = top - Math.floor(top + 0.01);
    if (off > 0.01) stage.style.top = `${-off / dpr}px`;
  }

  function layout() {
    snap();
    const s = stage.getBoundingClientRect();
    if (s.width === 0) return;
    size[0] = s.width;
    size[1] = s.height;
    stageAt[0] = s.left + scrollX;
    stageAt[1] = s.top + scrollY;
    const page = box(doc, s);
    inside = box(doc.lastElementChild!, s);
    // the carriage rides the bed's rail band, or a phone's column beside the window
    band = box(bed, s);
    const onBed = band.w > 0;
    along = onBed ? 0 : 1;
    rig = onBed ? BED_RIG : COLUMN_RIG;
    deck = onBed ? BED_DECK : COLUMN_DECK;
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
    } else {
      const c = box(column, s);
      bay = c;
      rail[0] = c.x + c.w / 2;
      rail[1] = page.y + COLUMN_END;
      rail[2] = rail[0];
      rail[3] = page.y + page.h - COLUMN_END;
      below = false;
    }
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
    // on a phone the mast runs out over the blocks' right edge, its head clear of their text
    reachOut = Math.max(
      MAST.base * scale,
      rail[0] - (box(blocks[0].src.parentElement!, s).x + box(blocks[0].src.parentElement!, s).w),
    );
    for (const b of blocks) {
      b.box = box(b.el, s);
      b.cell = box(b.src.parentElement!, s);
      b.wrap = Math.max(1, Math.floor(b.src.clientWidth / advance + 0.01));
      b.rows = [];
      for (const line of b.lines) {
        const r = line.getBoundingClientRect();
        b.rows.push([r.left - s.left, r.top - s.top]);
      }
      if (onBed) {
        // its station: the head's right side, as the camera sees it from high on the mast, just
        // clear of the plate's right seam
        b.side = b.cell.y > rail[1] ? DOWN : UP;
        const seam = Number.parseFloat(getComputedStyle(b.el).borderRightWidth) || 0;
        const right = b.box.x + b.box.w - seam - CLEAR;
        const k = CAMERA / (CAMERA - HEAD.top * scale);
        b.stop = Math.max(rail[0], foot[0] + (right - foot[0]) / k - HEAD.across * scale);
      } else {
        b.side = LEFT;
        b.stop = b.cell.y;
      }
    }
    if (onBed) {
      rail[2] = rail[0];
      for (const b of blocks) rail[2] = Math.max(rail[2], b.stop);
      blocks.forEach((b, i) => {
        if (stations[i]) stations[i].style.left = `${Math.round(b.stop - band.x - 8)}px`;
      });
    }
    caret.style.width = `${advance}px`;
    caret.style.height = `${lineHeight}px`;
    // at rest: on the bed, at the rail's left end, the mast retracted right along the band, the
    // pencil folded back along it, she standing left of it; up a phone's column, at its foot, the
    // mast retracted up the rail
    park =
      along === 0 ? [rail[0], RIGHT, MAST.base * scale, 0] : [rail[3], UP, MAST.base * scale, 0];
    if (!begun) from = park;
    plan();
  }

  /** the pencil at deployment `s` of a pose with mast angle `theta` and reach `reach` (stage px),
   * into `tilt`: its angle on the page and how far it is tipped up out of it. Folded (0) it lies back along the mast; deployed (1)
   * it lies left across the plate; between, it tips up on its pin and turns while it stands, so from
   * the camera it only ever lies along the mast or along its own line across the plate */
  function tip(theta: number, s: number, reach: number) {
    tilt[0] = s < 0.5 ? theta + Math.PI : LEFT;
    // its length on the page shrinks to the pin and grows again, each half on a gentle curve, so
    // its point never darts, even as it tips out on a moving head; folded along a mast shorter than
    // itself, it leans up off it rather than reach past the pivot
    let flat = s < 0.5 ? 1 - smooth(2 * s) : smooth(2 * s - 1);
    if (s < 0.5) flat = Math.min(flat, (reach / scale + 18) / (PENCIL.length + PENCIL.cone + 4));
    tilt[1] = Math.acos(Math.min(1, Math.max(0, flat)));
  }

  /** ms a move from pose a to b takes: a short run the drive's beat, a long one its cruise too;
   * long enough, too, that the mast runs in and out, and turns at its shortest, no faster than the
   * cruise */
  function moveTime(a: number[], b: number[]): number {
    const run = Math.abs(b[0] - a[0]);
    let time = run > SHORT ? Math.max(DRIVE, 1.3 * RAMP + run / TOP) : DRIVE;
    const peak = 2.857 / TOP;
    const retracted = MAST.base * scale;
    const turn = Math.abs(b[1] - a[1]);
    if (turn > 1e-3) {
      time = Math.max(time, (turn * retracted * peak) / 0.3);
      if (along === 0) {
        time = Math.max(time, (Math.abs(a[2] - retracted) * peak) / 0.2);
        time = Math.max(time, (Math.abs(b[2] - retracted) * peak) / 0.4);
      }
    } else if (run <= SHORT) time = Math.max(time, Math.hypot(run, b[2] - a[2]) * peak);
    else time = Math.max(time, Math.abs(b[2] - a[2]) * peak);
    return time;
  }

  /** each value's curve through a move from pose a to b this long: the carriage on the camera
   * curve, or cruising on a long run; turning, the mast retracts, the ring turns it, and it runs out
   * again; the pencil tips out over the move's end at the deploy's pace */
  function moving(a: number[], b: number[], time: number) {
    const carriage = Math.abs(b[0] - a[0]) > SHORT ? cruise(RAMP / time) : inOut;
    const turns = Math.abs(b[1] - a[1]) > 1e-3;
    const retracted = MAST.base * scale;
    const pull = Math.abs(b[2] - a[2]) > 1e-3 ? (retracted - a[2]) / (b[2] - a[2]) : 0;
    const tips = 1 - ((b[3] - a[3]) * DEPLOY) / time;
    return (u: number, i: number): number => {
      if (i === 0) return carriage(u);
      if (i === 3) return b[3] === a[3] ? 0 : clamp01((u - tips) / (1 - tips));
      if (!turns) return inOut(u);
      if (i === 1) return inOut(clamp01((u - 0.2) / 0.3));
      if (along === 1) return inOut(u);
      if (u < 0.2) return pull * inOut(u / 0.2);
      if (u < 0.45) return pull;
      return pull + (1 - pull) * inOut(clamp01((u - 0.45) / 0.4));
    };
  }

  /** the carriage's x and y at `c` along its rail */
  function xOf(c: number): number {
    return along === 0 ? c : rail[0];
  }

  function yOf(c: number): number {
    return along === 1 ? c : rail[1];
  }

  /** the head of pose `p`, stage px, into `head`: the pencil's pin under it */
  function place(p: number[]) {
    head[0] = xOf(p[0]) + Math.cos(p[1]) * p[2];
    head[1] = yOf(p[0]) + Math.sin(p[1]) * p[2];
  }

  /** the pose that drags the pencil's line along block b's cell at stage height y, the pencil at
   * deployment s */
  function strokeAt(b: Block, y: number, s: number, out: number[]) {
    out[1] = b.side;
    out[3] = s;
    if (along === 1) {
      out[0] = y;
      out[2] = reachOut;
      return out;
    }
    out[0] = b.stop;
    out[2] = Math.min(MAST_MAX * scale, Math.max(MAST.base * scale, Math.abs(y - rail[1])));
    return out;
  }

  /** the stretch of block b's cell its slide runs, stage px, into `out`: the whole cell, short of
   * where the head, as the camera sees it from high on the mast, would cross the frame a held plate
   * shows inside its edges, and, over the bed's rail, short of her where she stands below it */
  function strokeRange(b: Block, out: Vec2) {
    const k = CAMERA / (CAMERA - HEAD.top * scale);
    const half = (along === 1 ? HEAD.across : HEAD.along) * scale;
    const top = foot[1] + (b.box.y + CLEAR - foot[1]) / k + half;
    let bottom = foot[1] + (b.box.y + b.box.h - CLEAR - foot[1]) / k - half;
    if (along === 0 && b.side === UP) {
      const lift = CAMERA / (CAMERA - deck.seat[2] * scale);
      const seatY = foot[1] + (rail[1] + deck.seat[1] * scale - foot[1]) * lift;
      const crown = seatY - (SEAT_CELL[1] + MATE_RISE) * rig.cell - 2;
      bottom = Math.min(bottom, foot[1] + (crown - foot[1]) / k - half);
      bottom = Math.min(bottom, crown - PENCIL.radius * 1.16 * scale);
    }
    out[0] = Math.max(b.cell.y, top);
    out[1] = Math.min(b.cell.y + b.cell.h, bottom);
  }

  /** the time a slide over block b takes */
  function slideTime(b: Block): number {
    return Math.min(SLIDE[1], Math.max(SLIDE[0], b.cell.h * SLIDE_MS));
  }

  const range: Vec2 = [0, 0];
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
      strokeRange(b, range);
      const y0 = ask.out ? range[0] : range[1];
      const y1 = ask.out ? range[1] : range[0];
      const theta = nearest(b.side, previous[1]);
      // it arrives at the slide's start with the pencil mostly out, and tips the rest once stopped
      const start = strokeAt(b, y0, 1 - SETTLE, [0, 0, 0, 0]);
      start[1] = theta;
      const move = moveTime(previous, start);
      // the writer's press sets off so it arrives as its block's tab pops, a reader's at once; it
      // arrives no sooner than the pencil may touch, so the pencil tips out without a stop
      const go = Math.max(free, ask.earliest - (ask.reader ? 0 : move - DRIVE), ask.descend - move);
      const at = go + move;
      track.push({ t0: go, t1: at, a: previous, b: start, ease: moving(previous, start, move) });
      const out = Math.max(at, ask.descend);
      const swung = [start[0], start[1], start[2], 1];
      track.push({ t0: out, t1: out + DEPLOY * SETTLE, a: start, b: swung, ease: tipping });
      pen.push({
        t0: at - DEPLOY * 0.35,
        t1: out + DEPLOY * SETTLE,
        a: [PEN.up],
        b: [PEN.down],
        ease: inOut,
      });
      const touch = out + DEPLOY * SETTLE;
      const hit = touch + slideTime(b);
      const end = strokeAt(b, y1, 1, [0, 0, 0, 0]);
      end[1] = theta;
      track.push({ t0: touch, t1: hit, a: swung, b: end, ease: together });
      const folded = [end[0], end[1], end[2], 0];
      track.push({ t0: hit, t1: hit + FOLD, a: end, b: folded, ease: tipping });
      pen.push({ t0: hit, t1: hit + FOLD * 0.6, a: [PEN.down], b: [PEN.up], ease });
      jobs.push({ ask, go, touch, flip: touch, hit, free: hit + FOLD });
      previous = folded;
      free = hit + FOLD;
    }
    const rest = [park[0], nearest(park[1], previous[1]), park[2], 0];
    // the park answers no one, so it takes its time: a press can catch it on the way at a gentle pace
    const parking = Math.max(PARK, moveTime(previous, rest) * 1.5);
    track.push({
      t0: free + REST,
      t1: free + REST + parking,
      a: previous,
      b: rest,
      ease: moving(previous, rest, parking),
    });
    total = free + REST + parking;
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
    from = aiming
      ? [aimPose[0], aimPose[1], aimPose[2], aimPose[3]]
      : [pose[0], pose[1], pose[2], pose[3]];
    since = t;
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

  /** the pose that puts the head beside the cursor: below and right of it over a plate above the
   * bed's rail, above and right of it over one below, the mast never crossing the cursor's line;
   * on a phone's column, right of it and below its line */
  function aimFor(out: number[]) {
    const k = CAMERA / (CAMERA - 170 * scale);
    const x = foot[0] + (cursorAt[0] - foot[0]) / k;
    const y = foot[1] + (cursorAt[1] - foot[1]) / k;
    const along2 = HEAD.along * scale;
    const across = HEAD.across * scale;
    if (along === 1) {
      out[1] = LEFT;
      out[0] = Math.min(rail[3], Math.max(rail[1], y + LINE + across));
      out[2] = Math.min(
        MAST_MAX * scale,
        Math.max(MAST.base * scale, rail[0] - (x + BESIDE[0] + along2)),
      );
    } else {
      const lower = below && y > rail[1];
      out[1] = lower ? DOWN : UP;
      out[0] = Math.min(rail[2], Math.max(rail[0], x + BESIDE[0] + across));
      const hy = lower ? y - LINE - along2 : y + LINE + along2;
      out[2] = Math.min(MAST_MAX * scale, Math.max(MAST.base * scale, Math.abs(hy - rail[1])));
    }
    out[1] = nearest(out[1], aimPose[1]);
    out[3] = 0;
  }

  /** the head on its spring, one step of `dt` seconds: it turns its mast only retracted, drives and
   * runs out on a critically damped spring no faster than its top speed; whether it stopped */
  function aimStep(dt: number): boolean {
    if (following) aimFor(aimAt);
    lift = Math.min(PEN.up, lift + ((PEN.up - PEN.down) / FOLD) * 1000 * dt);
    const turn = Math.abs(aimAt[1] - aimPose[1]) > 1e-3;
    const retracted = MAST.base * scale;
    // the carriage and the mast, each on its spring
    const targets = [aimAt[0], turn ? retracted : aimAt[2]];
    for (let i = 0; i < 2; i++) {
      const j = i === 0 ? 0 : 2;
      aimSpeed[i] += (AIM * AIM * (targets[i] - aimPose[j]) - 2 * AIM * aimSpeed[i]) * dt;
      aimSpeed[i] = Math.max(-AIM_SPEED, Math.min(AIM_SPEED, aimSpeed[i]));
      aimPose[j] += aimSpeed[i] * dt;
    }
    if (turn && aimPose[2] < retracted + 1) {
      const turnBy = Math.max(-SLEW * dt, Math.min(SLEW * dt, aimAt[1] - aimPose[1]));
      aimPose[1] += turnBy;
    }
    aimPose[3] -= aimPose[3] * Math.min(1, dt * 12);
    const off = Math.hypot(aimAt[0] - aimPose[0], aimAt[2] - aimPose[2]);
    const still = !turn && off < 1 && Math.hypot(aimSpeed[0], aimSpeed[1]) < 20;
    return still && lift === PEN.up;
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
          const row = Math.floor(keys / b.wrap);
          const x = (keys % b.wrap) * advance;
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
      caret.style.animation = mode === 'solid' ? 'none' : '';
    }
    if (mode !== 'none' && (caretX !== caretAt[0] || caretY !== caretAt[1])) {
      caretAt[0] = caretX;
      caretAt[1] = caretY;
      caret.style.transform = `translate(${caretX}px, ${caretY}px)`;
    }

    // the rig
    if (aiming) for (let i = 0; i < 4; i++) pose[i] = aimPose[i];
    else sample(track, t, from, pose);
    sample(pen, t, up, sole);
    const z = aiming ? lift : sole[0];
    place(pose);
    // the line the pencil drags, where the camera sees its axis, on whole device pixels: the wipe's
    // edge and the canvas's line
    const dpr = Math.min(2, window.devicePixelRatio);
    project(head[0], head[1], z * scale);
    const lineY = Math.round(point[1] * dpr) / dpr;
    let gauge = GAUGE[0];
    let sliding: Block | null = null;
    // the writer, a press, or, with nothing left to do, a hint
    let status = !begun ? '' : typing ? 'typing quick-start.mdx' : 'press a tab';
    for (const job of jobs) {
      if (t >= job.touch && t < job.hit) {
        sliding = job.ask.block;
        gauge = GAUGE[1];
        status = job.ask.out ? job.ask.block.status : 'back to Markdown';
      } else if (t >= job.hit && t < job.free) gauge = Math.max(gauge, GAUGE[2]);
      else if (!typing && t < job.free && t >= job.go - DRIVE) status = '';
    }
    const bx = xOf(pose[0]);
    const by = yOf(pose[0]);
    project(bx + deck.seat[0] * scale, by + deck.seat[1] * scale, deck.seat[2] * scale);
    seat[0] = point[0];
    seat[1] = point[1];
    seat[2] = deck.seat[2] * scale;
    const cell = rig.cell;
    const mateX = Math.round(seat[0] - SEAT_CELL[0] * cell);
    const mateY = Math.round(seat[1] - SEAT_CELL[1] * cell);
    const crownX = mateX + CROWN_CELL[0] * cell;

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
      if (flip && t < flip.hit && sliding === b) wipe = clamp01((lineY - b.cell.y) / b.cell.h);
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

    if (aiming && following) status = 'click a block';
    if (t < noteUntil) status = note;
    if (active && status) say(status);

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
    grow(bx, by, 190 * scale, 60 * scale);
    // the mast to its head, the head, the pencil to its point
    const dx = Math.cos(pose[1]);
    const dy = Math.sin(pose[1]);
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      grow(bx + dx * pose[2] * u, by + dy * pose[2] * u, 180 * scale, 30 * scale);
    }
    grow(head[0], head[1], 186 * scale, 34 * scale);
    // the pencil from its butt to its point, tipped up out of the page by tilt[1]
    tip(pose[1], pose[3], pose[2]);
    const reach = PENCIL.length + PENCIL.cone + 8;
    const flat = Math.cos(tilt[1]);
    const rise = Math.sin(tilt[1]);
    const ex = Math.cos(tilt[0]) * flat * scale;
    const ey = Math.sin(tilt[0]) * flat * scale;
    grow(head[0] - ex * 16, head[1] - ey * 16, (z + 20 - rise * 16) * scale, 18 * scale);
    grow(head[0] + ex * reach, head[1] + ey * reach, (z + 20 + rise * reach) * scale, 18 * scale);
    // her shadow on the rig and the bay
    const shadowX = (-LIGHT[0] / LIGHT[2]) * seat[2];
    const shadowY = (-LIGHT[1] / LIGHT[2]) * seat[2];
    bounds[0] = Math.min(bounds[0], mateX + Math.min(0, shadowX));
    bounds[1] = Math.min(bounds[1], mateY + Math.min(0, shadowY));
    bounds[2] = Math.max(bounds[2], mateX + SPRITE_W * cell + Math.max(0, shadowX));
    bounds[3] = Math.max(bounds[3], mateY + SPRITE_H * cell + Math.max(0, shadowY));
    if (sliding) {
      bounds[0] = Math.min(bounds[0], sliding.cell.x);
      bounds[1] = Math.min(bounds[1], lineY - 1);
      bounds[2] = Math.max(bounds[2], sliding.cell.x + sliding.cell.w);
      bounds[3] = Math.max(bounds[3], lineY + 2);
    }

    if (along === 0) chain(bx - band.x);
    // she watches the head while it works, the cursor while it follows it
    let lookX = aiming && following ? cursorAt[0] : crownX;
    for (const job of jobs) if (t >= job.go && t < job.free) lookX = head[0];
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
    shader.set('uTheta', pose[1]);
    shader.set('uM', pose[2] / scale);
    shader.set('uPsi', tilt[0]);
    shader.set('uPitch', tilt[1]);
    shader.set('uPen', z);
    shader.set('uGauge', gauge);
    const scan = sliding?.cell ?? none;
    set4('uScan', scan.x, scan.x + scan.w, lineY, sliding ? 1 : 0);
    set4('uDoc', inside.x, inside.y, inside.w, inside.h);
    set4('uBay', bay.x, bay.y, bay.w, bay.h);
    set4('uClip', bounds[0], bounds[1], bounds[2], bounds[3]);
    // the march starts above the highest part: the nut, or the pencil's point tipped up
    shader.set('uTop', Math.max(194, z + rise * reach + PENCIL.radius + 4) * scale);
    set4('uDeck', deck.box[0], deck.box[1], deck.box[2], deck.box[3]);
    set2('uValve', deck.valve[0], deck.valve[1]);
    set2('uDial', deck.gauge[0], deck.gauge[1]);
    set2('uMotor', deck.motor[0], deck.motor[1]);
    set3('uMate', mateX, mateY, cell);
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

  /** her frame and her moon's step: her gaze, a blink now and then, the moon's orbit in steps */
  function paint() {
    if (!ink) return;
    const ticks = reduced ? 0 : Math.floor(performance.now() / TICK);
    const eyes = !reduced && ticks % BLINK === 0 ? 1 : gaze;
    const step = Math.floor(ticks / STEP) % ORBIT_STEPS;
    const shown = (eyes * ORBIT_STEPS + step) * 64 + rig.ring;
    if (shown === mateShown) return;
    mateShown = shown;
    paintMate(mateImage, eyes, step, rig.ring, ink, LIGHT);
    mate.getContext('2d')!.putImageData(mateImage, 0, 0);
    mate.style.visibility = 'visible';
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

  function say(text: string) {
    if (text === lastStatus) return;
    lastStatus = text;
    setStatus(text);
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
    // the clock runs on with the head on the reader's spring, so a press plays out as in the
    // sequence
    if (phase === 'play') {
      clock = Math.min(total, clock + dt);
      if (clock >= total) {
        phase = 'rest';
        // the sequence has played: the rig is the reader's, and reaches for a mouse over it
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
      if (still && !following) {
        // back at its park; stopped short of it, it drives the rest of the way
        const short = Math.abs(aimAt[0] - aimPose[0]) >= 1 || Math.abs(aimAt[2] - aimPose[2]) >= 1;
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
    started = true;
    from = [pose[0], pose[1], pose[2], pose[3]];
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
    const night = document.documentElement.classList.contains('dark');
    // she keeps her look in either theme: a light jacket, black clothes, an outline in the ink
    const paperBytes = bytes(style.getPropertyValue('--lp-paper'));
    const inkBytes = bytes(style.getPropertyValue('--lp-ink'));
    ink = {
      line: night ? paperBytes : inkBytes,
      pen: inkBytes,
      lit: night ? inkBytes : paperBytes,
      yellow: bytes(style.getPropertyValue('--lp-yellow')),
      paper: paperBytes,
      accent: bytes(style.getPropertyValue(night ? '--lp-yellow' : '--lp-sun')),
    };
    mateShown = -1;
    paint();
    if (!shader) return;
    const paper = rgb(style.getPropertyValue('--lp-paper'));
    const ink3 = rgb(style.getPropertyValue('--lp-ink'));
    shader.set('uLit', night ? ink3 : paper);
    shader.set('uShade', night ? paper : ink3);
    shader.set('uAccent', rgb(style.getPropertyValue(night ? '--lp-yellow' : '--lp-sun')));
    shader.set('uYellow', rgb(style.getPropertyValue('--lp-yellow')));
    shader.set('uLine', rgba(style.getPropertyValue('--lp-line-strong')));
    shader.set('uNight', night ? 1 : 0);
    shader.set('uL', LIGHT);
    shader.invalidate();
  }

  // a reader plays with the rig: a mouse in the stage draws it, its head beside the cursor; a
  // click on a block, or a press of its tab, presses the block

  /** whether the arm is free for the reader: the sequence played, every press done */
  function free(): boolean {
    return begun && !playing && (!jobs.length || clock >= jobs[jobs.length - 1].free);
  }

  /** the rig leaves its plan for the reader's spring, from where the plan has it and as fast */
  function take() {
    // it rests by the cursor a while before going back
    movedAt = performance.now();
    sample(track, clock, from, aimPose);
    sample(pen, clock, up, sole);
    lift = sole[0];
    const before = [0, 0, 0, 0];
    sample(track, clock - 16, from, before);
    aimSpeed[0] = (aimPose[0] - before[0]) / 0.016;
    aimSpeed[1] = (aimPose[2] - before[2]) / 0.016;
    aiming = true;
  }

  /** a mouse moves or clicks in the stage: once the sequence has played, the arm follows it */
  function follow() {
    if (!begun || playing || reduced || !shader) return;
    following = true;
    movedAt = performance.now();
    if (!idle) idle = window.setTimeout(onIdle, IDLE);
    shader.invalidate();
  }

  /** the mouse rests or leaves: the head springs back to its park */
  function goBack() {
    following = false;
    window.clearTimeout(idle);
    idle = 0;
    for (let i = 0; i < 4; i++) aimAt[i] = park[i];
    aimAt[1] = nearest(park[1], aimPose[1]);
    shader?.invalidate();
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
      follow();
    }
    if (following) shader?.invalidate();
  }

  function onLeave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    over = false;
    if (following) goBack();
  }

  /** what the last pointer to come down on the stage was: a finger presses only tabs */
  let downBy = '';
  function onDown(event: PointerEvent) {
    downBy = event.pointerType;
    if (downBy === 'mouse') follow();
  }

  /** a press a click on a block asked for, until the double-click window has passed */
  let tentative: Ask | undefined;
  let clickTimer = 0;

  /** a second click, or a selection, takes back the press the first asked for: the arm drifts back
   * before its pad comes down */
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

  const view = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (started || reduced || !shader) return;
      // a stage taller than the viewport counts by the share of the viewport it fills
      const seen =
        entry.intersectionRatio >= START || entry.intersectionRect.height >= innerHeight * START;
      if (seen) {
        started = true;
        if (phase === 'ready') wake();
        else replay();
      } else if (!entry.isIntersecting && phase === 'rest' && !begun) ready();
    },
    { threshold: [0, 0.1, 0.2, START, 0.6] },
  );
  const middle = new IntersectionObserver(
    ([entry]) => {
      active = entry.isIntersecting;
      // the bar says the figure's own line as it becomes active, so ours is said again
      if (active) lastStatus = '';
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  const resize = new ResizeObserver(refresh);
  // a section above that changes height moves the stage off whole pixels again
  const moved = new ResizeObserver(() => {
    snap();
    const s = stage.getBoundingClientRect();
    stageAt[0] = s.left + scrollX;
    stageAt[1] = s.top + scrollY;
  });
  const theme = new MutationObserver(colours);

  refresh();
  colours();
  resize.observe(stage);
  moved.observe(document.body);
  view.observe(stage);
  if (figure) middle.observe(figure);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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
    middle.disconnect();
    resize.disconnect();
    moved.disconnect();
    theme.disconnect();
    button?.removeEventListener('click', replay);
    stage.removeEventListener('pointerenter', onEnter);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('click', onClick);
    window.clearTimeout(idle);
    window.clearTimeout(clickTimer);
    window.clearInterval(ticker);
    shader?.destroy();
  };
}

/** a CSS colour, `#rgb`, `#rrggbb`, `#rrggbbaa` or `rgb(r g b / a)`, as the shader's */
function rgba(value: string): [number, number, number, number] {
  const text = value.trim();
  if (text.startsWith('#')) {
    const hex = text.length < 6 ? text.slice(1).replace(/./g, '$&$&') : text.slice(1);
    const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4), hex.length === 8 ? n(6) : 1];
  }
  const [r, g, b, a = 1] = text.match(/[\d.]+/g)!.map(Number);
  return [r / 255, g / 255, b / 255, a];
}

function rgb(value: string): [number, number, number] {
  const [r, g, b] = rgba(value);
  return [r, g, b];
}

/** a CSS colour as bytes, for a 2D canvas */
function bytes(value: string): [number, number, number] {
  const [r, g, b] = rgba(value);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
