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
import { createShaderCanvas, cssRgba, type ShaderCanvas } from '../../lib/gl';
import { camera, clamp, type Rect, rectIn, settle, TICK } from '../../lib/motion';
import { onActive, report } from '../../lib/status';
import { isDark, onTheme } from '../../lib/theme';
import {
  BED,
  BED_DECK,
  BOOM,
  COLUMN_DECK,
  fragment,
  HUB,
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
/** a long move cruises at TOP px/ms between RAMP ms ramps; the drive's curve is at its steepest
 * STEEPEST times its mean speed, so under SHORT px it never passes TOP */
const TOP = 2.8;
const RAMP = 160;
const STEEPEST = 2.857;
const SHORT = (TOP * DRIVE) / STEEPEST;
/** of the drop, the share after the arm has stopped */
const SETTLE = 0.25;
/** ms a radian takes at its gentlest: the boom's turn, the elbow's bend */
const TURN_RATE = 140;
const BEND_RATE = 110;
/** a phone's elbow sweep (px/ms); rad off its aim a boom still swings; windows' overlap share */
const SWING = 1;
const SWUNG = 0.3;
const OVERLAP = 0.35;
/** the elbow's inner angle at both ends of a slide, and pointing at a cursor, rad; folded at rest
 * it leaves TUCK */
const INNER: Vec2 = [(50 * Math.PI) / 180, (150 * Math.PI) / 180];
const AIMED = (100 * Math.PI) / 180;
const TUCK = 0.06;
/** her pencil stood up on its trunnion; up a phone's column never further, never end-on */
const UPRIGHT = Math.PI / 2;
const STEEP = Math.PI / 3;
const FADE = (16 * 1000) / 60;
/** world px: how high the camera stands over the page */
const CAMERA = 4000;
/** high from the upper right, so shadows stay short and fall on the plate or into the bay */
const LIGHT = normalize(0.13, -0.18, 0.975);
/** a reader's springs: stiffness (1/s), top speeds (px/s, rad/s), and her pencil's tip; up a
 * phone's column the arm follows the viewport's middle on a stiffer one */
const AIM = 10;
const AIM_SPEED = 1500;
const AIM_SLEW = 7;
const AIM_TIP = 16;
const SCROLL_AIM = 16;
const AIM_GAP = 10;
/** CSS px an arm unit takes, and one of her sprite's cells */
const SCALE = 0.6;
const CELL = 2;
/** her moon's ring, cells wide, on the bed and up a phone's column */
const RING: Vec2 = [21, 13];
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

/** spans in order, the overlapping ones joined */
function merge(spans: Vec2[]): Vec2[] {
  spans.sort((a, b) => a[0] - b[0]);
  const out: Vec2[] = [];
  for (const [from, to] of spans) {
    const last = out.at(-1);
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else out.push([from, to]);
  }
  return out;
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
  /** px from one source row to the next */
  leading: number;
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
 * cycle's clock, run on the shader's frames; after the sequence the rig is the reader's. The arm's
 * canvas and its context are made as the stage first comes on screen. */
export function createPress(stage: HTMLElement): () => void {
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
  mate.style.width = `${MATE_W * CELL}px`;
  mate.style.height = `${MATE_H * CELL}px`;
  const typingLine = `typing ${stage.dataset.file}`;
  const caret = stage.querySelector<HTMLElement>('[data-caret]')!;
  const button = stage.querySelector<HTMLButtonElement>('[data-replay]')!;
  const voice = stage.querySelector<HTMLElement>('[data-voice]')!;
  const figure = stage.closest<HTMLElement>('[data-figure]');
  /** the figure's own line, once there is nothing going on */
  const compiled = figure?.dataset.status ?? '';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const range = document.createRange();
  const boom = BOOM * SCALE;
  const fore = PENCIL.reach * SCALE;

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
      leading: 0,
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

  let shader: ShaderCanvas | null = null;
  let canvas: HTMLCanvasElement | null = null;
  /** the stage shows */
  let visible = false;
  /** the caret blinks only while it shows on screen: one infinite animation anywhere off screen
   * keeps the page's whole animation timeline on the main thread */
  function blink() {
    caret.classList.toggle('animate-lp-caret', visible && caretMode === 'blink');
  }
  /** the figure has been the one read, so the writer starts once the arm can draw */
  let seen = false;
  /** canvas px per CSS px */
  let density = 1;

  // metrics, stage px
  let laidOut = false;
  let foot: Vec2 = [0, 0];
  /** the rail: along x (0) on the bed, y (1) up a phone's column, from (x0, y0) to (x1, y1) */
  let along = 0;
  const rail = [0, 0, 0, 0];
  let deck = BED_DECK;
  /** the bed's band (the drag chain), the bay the carriage rides (her shadow); plates below it */
  let band: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let bay: Rect = band;
  let below = false;
  let inside: Rect = { x: 0, y: 0, w: 0, h: 0 };
  /** carriage spans on the bed where she would stand on a tab, and at a stop the hub too */
  let herOff: Vec2[] = [];
  let stopOff: Vec2[] = [];

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

  let aiming = false;
  let following = false;
  /** the stage's top left in the viewport, read once a frame while it follows; the pointer's over
   * the bed */
  const view: Vec2 = [0, 0];
  const pointer: Vec2 = [0, 0];
  const cursorAt: Vec2 = [0, 0];
  const aimAt = [0, 0, 0, 0];
  const aimPose = [0, 0, 0, 0];
  const aimSpeed = [0, 0, 0, 0];
  const targets = [0, 0, 0];
  let lift: number = PEN.up;

  const pose = [0, 0, 0, 0];
  const up: number[] = [PEN.up];
  const sole: number[] = [PEN.up];
  const bounds: [number, number, number, number] = [0, 0, 0, 0];
  const point: [number, number, number] = [0, 0, 1];
  let caretMode = '';
  const caretAt: Vec2 = [-1, -1];
  const caretSize: Vec2 = [0, 0];
  let said = '';
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

  function layout() {
    const s = stage.getBoundingClientRect();
    if (s.width === 0) return;
    laidOut = true;
    const page = rectIn(doc, s);
    inside = rectIn(doc.lastElementChild!, s);
    for (const b of blocks) {
      b.tabBox = rectIn(b.tab, s);
      b.cell = rectIn(b.src.parentElement!, s);
      b.range = [b.cell.y, b.cell.y + b.cell.h];
      b.leading = Number.parseFloat(getComputedStyle(b.src).lineHeight);
    }
    band = rectIn(bed, s);
    along = band.w > 0 ? 0 : 1;
    foot = [page.x + page.w / 2, s.height * 0.3];
    chainAt = -1;
    mateAt = '';
    if (along === 0) {
      deck = BED_DECK;
      bay = band;
      rail[0] = band.x + BED.start;
      rail[1] = band.y + BED.rail;
      // anywhere short of this the boom turns with its elbow and crank inside the band's end
      rail[2] = band.x + band.w - (BOOM + ELBOW) * SCALE;
      rail[3] = rail[1];
      below = blocks.some((b) => b.cell.y > rail[1]);
      offTabs();
      park = [clear(rail[0], herOff), 0, TUCK - Math.PI, 0];
      for (const b of blocks) station(b);
      // the detents the carriage stops on, home's first; stops within one's width share it
      const stops = [park[0]];
      for (const b of blocks) stops.push(b.stop);
      const width = stations[0]?.getBoundingClientRect().width ?? 0;
      for (let i = 0; i < stations.length && i < stops.length; i++) {
        let shared = false;
        for (let j = 0; j < i; j++) if (Math.abs(stops[j] - stops[i]) < width) shared = true;
        stations[i].style.left = `${Math.round(stops[i] - band.x - width / 2)}px`;
        stations[i].style.visibility = shared ? 'hidden' : 'visible';
      }
    } else {
      deck = COLUMN_DECK;
      bay = rectIn(column, s);
      rail[0] = bay.x + bay.w / 2;
      rail[2] = rail[0];
      // her crown, as the camera sees it, at the window's top; the deck's foot at its bottom
      const k = CAMERA / (CAMERA - deck.seat[2] * SCALE);
      rail[1] = foot[1] + (page.y + (SEAT_CELL[1] + MATE_RISE) * CELL - foot[1]) / k;
      rail[3] = page.y + page.h - (deck.box[1] + deck.box[3]) * SCALE;
      below = false;
      // her pencil flat across the plates as far as the window lets it, the boom up the column
      // under a plate it reaches, else down over it
      let left = Infinity;
      for (const b of blocks) left = Math.min(left, b.cell.x);
      const reach = Math.min(fore, rail[0] - left);
      const drop = boom + Math.sqrt(fore * fore - reach * reach);
      for (const b of blocks) {
        b.tipX = rail[0] - reach;
        const up = b.range[1] + drop <= rail[3];
        b.bend = up ? -1 : 1;
        b.stop = clamp(b.range[0] + (up ? drop : -drop), rail[1], rail[3]);
        b.stopEnd = clamp(b.range[1] + (up ? drop : -drop), rail[1], rail[3]);
      }
      // at rest as low as keeps the elbow in the window, her pencil open to the window's border
      const lifted = CAMERA / (CAMERA - PEN.up * SCALE);
      const border = foot[0] + (inside.x + inside.w + 1 - foot[0]) / lifted;
      fold = Math.asin(clamp((rail[0] - border) / fore, 0, 1));
      park = [page.y + page.h - boom - ELBOW * SCALE, boomAngle(DOWN), Math.PI - fold, 0];
    }
    if (!begun || phase === 'ready') from = park;
    plan();
    listen();
  }

  /** the carriage spans where her canvas would cover a tab, and at a stop the hub over the boom's
   * root too; on the bed her box moves with the carriage, scaled by the camera, and lands on whole
   * pixels */
  function offTabs() {
    const k = CAMERA / (CAMERA - deck.seat[2] * SCALE);
    const left =
      foot[0] * (1 - k) + deck.seat[0] * SCALE * k - (SEAT_CELL[0] + MATE_PAD[0]) * CELL - 0.5;
    const width = MATE_W * CELL + 1;
    const top =
      foot[1] +
      (rail[1] + deck.seat[1] * SCALE - foot[1]) * k -
      (SEAT_CELL[1] + MATE_PAD[1]) * CELL;
    const her: Vec2[] = [];
    const hub: Vec2[] = [];
    for (const { tabBox: t } of blocks) {
      if (t.y < top + MATE_H * CELL && t.y + t.h > top)
        her.push([(t.x - left - width) / k, (t.x + t.w - left) / k]);
      hub.push([t.x - HUB * SCALE, t.x + t.w + HUB * SCALE]);
    }
    stopOff = merge(her.concat(hub));
    herOff = merge(her);
  }

  /** c, or the nearest carriage on the rail clear of `off` */
  function clear(c: number, off: Vec2[]): number {
    for (const [start, end] of off) {
      if (c <= start || c >= end) continue;
      const back = start >= rail[0];
      if (end <= rail[2] && (!back || end - c < c - start)) return end;
      return back ? start : c;
    }
    return c;
  }

  /** block b's stop on the bed: the pivot off the slide's line by as much as keeps the elbow's
   * inner angle within INNER at both its ends, on the side the tabs move it least */
  function station(b: Block) {
    const up = b.cell.y < rail[1];
    const near = up ? rail[1] - b.range[1] : b.range[0] - rail[1];
    const far = up ? rail[1] - b.range[0] : b.range[1] - rail[1];
    const d =
      (Math.sqrt(Math.max(0, span(INNER[0]) ** 2 - near * near)) +
        Math.sqrt(Math.max(0, span(INNER[1]) ** 2 - far * far))) /
      2;
    const middle = b.cell.x + b.cell.w / 2;
    let least = Infinity;
    for (const side of [1, -1]) {
      const ideal = middle + side * d;
      const stop = clear(clamp(ideal, rail[0], rail[2]), stopOff);
      if (Math.abs(stop - ideal) >= least) continue;
      least = Math.abs(stop - ideal);
      b.stop = stop;
      b.stopEnd = stop;
      b.tipX = clamp(stop - side * d, b.cell.x, b.cell.x + b.cell.w);
      b.bend = side * (up ? -1 : 1);
    }
  }

  /** her pencil's point's distance from the pivot with the elbow's inner angle at `inner` */
  function span(inner: number): number {
    return Math.sqrt(boom * boom + fore * fore - 2 * boom * fore * Math.cos(inner));
  }

  /** whether box [x0, x1) by [y0, y1) lies on a tab */
  function onTab(x0: number, y0: number, x1: number, y1: number): boolean {
    for (const { tabBox: t } of blocks) {
      if (x1 > t.x && x0 < t.x + t.w && y1 > t.y && y0 < t.y + t.h) return true;
    }
    return false;
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

  function foldAt(angle: number, near: number): number {
    return nearest(Math.PI - fold * Math.sin(angle), near);
  }

  /** a move from pose a to b: her pencil tips up, the joints turn while it stands, it tips down; on
   * the bed the trip home first brings the elbow out of the plates, her pencil along the band */
  function move(a: number[], b: number[], pace = 1, least = 0): Leg {
    const turn = boomAngle(b[1]);
    // up a phone's column her pencil folds along the boom, never end-on
    const flat = along === 1;
    const home = !flat && stowed([b[0], turn]) && !stowed(a);
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
    const time = Math.max(
      least,
      pace * driveT + (home ? upT + jointT : 0),
      upT + jointT + downT - OVERLAP * (Math.min(upT, jointT) + Math.min(jointT, downT)),
      160,
    );
    // the joints turn as soon as her pencil stands, or out of the stowed pose as late as they can
    const start = stowed(a)
      ? time - downT + OVERLAP * Math.min(jointT, downT) - jointT
      : upT - OVERLAP * Math.min(upT, jointT);
    const joints: Vec2 = [start / time, (start + jointT) / time];
    const up: Vec2 = [0, upT / time];
    const down: Vec2 = [1 - downT / time, 1];
    // the boom's turn: on the trip home between the elbow's, and the carriage only after them
    const turns: Vec2 = home ? [joints[0] + preT / time, joints[1] - postT / time] : joints;
    const drive: Vec2 = home ? [joints[1], 1] : [0, 1];
    const curve = run > SHORT ? cruise(RAMP / (time * (1 - drive[0]))) : inOut;
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

  function push(leg: Leg, a: number[], t: number) {
    track.push({
      t0: t,
      t1: t + leg.time,
      a,
      b: leg.end,
      ease: leg.ease,
      tilt: leg.tilt,
      bend: leg.bend,
    });
  }

  function plan() {
    if (!laidOut) return;
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
      const leg = move(previous, solve(a, b.bend, previous));
      // the writer's press arrives as its block's tab pops, a reader's sets off at once; neither
      // arrives before the pencil may touch, so the quill lowers it without a stop
      const go = Math.max(
        free,
        ask.earliest - (ask.reader ? 0 : leg.time - DRIVE),
        ask.descend - leg.time,
      );
      push(leg, previous, go);
      const start = leg.end;
      const reached = Math.max(go + leg.time, ask.descend);
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
    const leg = move(previous, park, 1.5, PARK);
    push(leg, previous, free + REST);
    total = free + REST + leg.time;
  }

  /** a reader's press: the block flips between output and Markdown, by the arm when it can */
  function press(b: Block) {
    if (reduced || !shader) {
      b.base = !shown(b, clock);
      for (let i = asks.length - 1; i >= 0; i--) if (asks[i].block === b) asks.splice(i, 1);
      plan();
      apply();
      tell(b, b.base);
      return;
    }
    const t = clock;
    if (playing) {
      // the sequence plays through: the press waits for its end, a second one takes it back
      let i = asks.length - 1;
      while (i >= 0 && !(asks[i].block === b && asks[i].queued)) i--;
      const job = jobs[i];
      if (i >= 0 && (!job || job.go > t)) asks.splice(i, 1);
      else {
        const out = !shown(b, Infinity);
        asks.push({ block: b, out, held: t, earliest: t, descend: t, queued: true, reader: true });
        voice.textContent = `${b.label}: queued`;
      }
      plan();
      apply();
      return;
    }
    // off a reader's springs, or once the arm has left for home, it sets off from where it is
    if (aiming || !jobs.length || t >= jobs[jobs.length - 1].free + REST) replan(t);
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
    asks.splice(next, 0, {
      block: b,
      out,
      held: t,
      earliest: t,
      descend: t,
      queued: false,
      reader: true,
    });
    plan();
    wake();
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

  /** a new plan from now and the arm's pose: blocks keep what they show, presses not yet sliding
   * wait their turn */
  function replan(t: number) {
    const waiting: Ask[] = [];
    for (let i = 0; i < jobs.length; i++) if (jobs[i].touch > t) waiting.push(jobs[i].ask);
    for (const b of blocks) b.base = shown(b, t);
    asks.length = 0;
    for (const ask of waiting) asks.push(ask);
    since = t;
    from = [...(aiming ? aimPose : pose)];
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

  /** whether her pencil at (x, y) lies on a tab or on her */
  function blocked(x: number, y: number): boolean {
    const r = PEN_R * SCALE;
    for (const b of blocks) if (inBox(x, y, r, b.tabBox)) return true;
    const x0 = seat[0] - SEAT_CELL[0] * CELL;
    const y0 = seat[1] - (SEAT_CELL[1] + MATE_RISE) * CELL;
    return (
      x > x0 - r &&
      x < x0 + SPRITE_W * CELL + r &&
      y > y0 - r &&
      y < y0 + (SPRITE_H + MATE_RISE) * CELL + r
    );
  }

  /** the pose pointing her pencil at the cursor, AIM_GAP short of it, her clear of the tabs */
  function aimFor(out: number[]) {
    if (along === 1) return readFor(out);
    out[3] = 0;
    cursorAt[0] = pointer[0] - view[0];
    cursorAt[1] = pointer[1] - view[1];
    const k = CAMERA / (CAMERA - lift * SCALE);
    const x = clamp(foot[0] + (cursorAt[0] - foot[0]) / k, inside.x, inside.x + inside.w);
    const y = clamp(foot[1] + (cursorAt[1] - foot[1]) / k, inside.y, inside.y + inside.h);
    const bendTo = below && y > rail[1] ? 1 : -1;
    const r = span(AIMED);
    const h = Math.abs(y - rail[1]);
    const reach = Math.sqrt(Math.max(0, r * r - h * h));
    out[0] = clear(clamp(x + Math.max(60 * SCALE, reach), rail[0], rail[2]), herOff);
    reachTo(x - out[0], y - rail[1], bendTo, out, fore + AIM_GAP);
    out[1] = boomAngle(out[1]);
    out[2] = nearest(out[2], aimPose[2]);
  }

  /** up a phone's column, the park's fold carried to the line in the viewport's middle */
  function readFor(out: number[]) {
    const k = CAMERA / (CAMERA - PEN.up * SCALE);
    const top = blocks[0].range[0];
    const bottom = blocks[blocks.length - 1].range[1];
    const y = foot[1] + (clamp(innerHeight / 2 - view[1], top, bottom) - foot[1]) / k;
    out[0] = clamp(y - boom + fore * Math.cos(fold), rail[1], park[0]);
    out[1] = DOWN;
    out[2] = Math.PI - fold;
    out[3] = 0;
  }

  /** how far her pencil stands up for its drawn length to stop short of a tab or her */
  function tipFor(p: number[]): number {
    const dx = Math.cos(p[1] + p[2]);
    const dy = Math.sin(p[1] + p[2]);
    const wrist = PENCIL.wrist * SCALE;
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
    targets[0] = along === 0 && !following && swinging ? aimPose[0] : aimAt[0];
    targets[1] = turn;
    targets[2] =
      along === 1 && swinging ? foldAt(aimPose[1], aimPose[2]) : nearest(aimAt[2], aimPose[2]);
    const stiff = along === 1 ? SCROLL_AIM : AIM;
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
    place(aimPose);
    // up a phone's column it lies folded, never stood up end-on
    const swing = along === 1 ? 0 : 0.25 * (Math.abs(aimSpeed[1]) + Math.abs(aimSpeed[2]));
    const tipped = along === 1 ? 0 : tipFor(aimPose);
    const need = Math.min(along === 1 ? STEEP : UPRIGHT, Math.max(aimAt[3], tipped, swing));
    aimSpeed[3] += (AIM_TIP * AIM_TIP * (need - aimPose[3]) - 2 * AIM_TIP * aimSpeed[3]) * dt;
    aimPose[3] = clamp(aimPose[3] + aimSpeed[3] * dt, 0, UPRIGHT);
    if (Math.abs(need - aimPose[3]) > 0.004 || Math.abs(aimSpeed[3]) > 0.05) still = false;
    return still && lift === PEN.up;
  }

  /** the box of a line's character k, or of its last when k is past it; none in an empty line */
  function charBox(line: HTMLElement, k: number): DOMRect | undefined {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    let last: Text | undefined;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (k < node.length) {
        range.setStart(node, k);
        range.setEnd(node, k + 1);
        return range.getBoundingClientRect();
      }
      k -= node.length;
      if (node.length > 0) last = node;
    }
    if (!last) return;
    range.setStart(last, last.length - 1);
    range.setEnd(last, last.length);
    return range.getBoundingClientRect();
  }

  function apply() {
    const t = clock;
    let lineY = 0;
    let z: number = PEN.up;
    if (laidOut) {
      if (aiming) for (let i = 0; i < 4; i++) pose[i] = aimPose[i];
      else sample(track, t, from, pose);
      sample(pen, t, up, sole);
      z = aiming ? lift : sole[0];
      place(pose);
      // the line her pencil's point drags, on whole canvas pixels: the wipe's edge and the canvas's
      project(tipAt[0], tipAt[1], z * SCALE);
      lineY = Math.round(point[1] * density) / density;
    }

    // the source typed so far; the caret's line shows once a key of it is typed
    let typing = false;
    let caretBlock: Block | undefined;
    let caretLine = 0;
    let caretKeys = 0;
    for (const b of blocks) {
      let keys = !begun || t < b.type ? -1 : Math.min(b.keys, Math.floor((t - b.type) / CHAR));
      if (keys >= 0 && keys < b.keys) typing = true;
      let shown = 0;
      for (let i = 0; i < b.lines.length && keys >= 0; i++) {
        if (keys <= b.lengths[i]) {
          if (keys > 0) shown = i + 1;
          caretBlock = b;
          caretLine = i;
          caretKeys = keys;
          keys = -1;
        } else {
          shown = i + 1;
          keys -= b.lengths[i] + 1;
        }
      }
      if (shown !== b.shownLines) {
        for (let i = 0; i < b.lines.length; i++) {
          b.lines[i].style.visibility = !begun || i < shown ? '' : 'hidden';
          b.lines[i].style.clipPath = '';
        }
        b.shownLines = shown;
        b.clip = '';
      }
    }
    const caretOff = blocks[blocks.length - 1].typed + 600;
    const mode = !begun || t >= caretOff || phase !== 'play' ? 'none' : typing ? 'solid' : 'blink';
    // the caret's character, measured: a long line wraps, its rows before the caret's show whole
    let clip = '';
    if (caretBlock && mode !== 'none') {
      const line = caretBlock.lines[caretLine];
      const length = caretBlock.lengths[caretLine];
      const s = stage.getBoundingClientRect();
      const box = line.getBoundingClientRect();
      const char = charBox(line, caretKeys);
      if (char) caretSize[0] = char.width;
      caretSize[1] = caretBlock.leading || char?.height || box.height;
      const x = char ? (caretKeys < length ? char.left : char.right) - box.left : 0;
      const top = char ? char.top - box.top - (caretSize[1] - char.height) / 2 : 0;
      if (caretKeys > 0 && caretKeys < length)
        clip = `polygon(0 0, 100% 0, 100% ${top}px, ${x}px ${top}px, ${x}px ${top + caretSize[1]}px, 0 ${top + caretSize[1]}px)`;
      const caretX = box.left - s.left + x;
      const caretY = box.top - s.top + top;
      if (caretX !== caretAt[0] || caretY !== caretAt[1]) {
        caretAt[0] = caretX;
        caretAt[1] = caretY;
        caret.style.transform = `translate(${caretX}px, ${caretY}px)`;
        caret.style.width = `${caretSize[0]}px`;
        caret.style.height = `${caretSize[1]}px`;
      }
    }
    for (const b of blocks) {
      const want = b === caretBlock ? clip : '';
      if (want !== b.clip) {
        b.lines[b.shownLines - 1].style.clipPath = want;
        b.clip = want;
      }
    }
    if (mode !== caretMode) {
      caretMode = mode;
      caret.style.visibility = mode === 'none' ? 'hidden' : 'visible';
      blink();
    }

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
    if (status && status !== said) {
      said = status;
      report(stage, status);
    }

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
    if (!laidOut) return;

    const bx = pivotAt[0];
    const by = pivotAt[1];
    project(bx + deck.seat[0] * SCALE, by + deck.seat[1] * SCALE, deck.seat[2] * SCALE);
    seat[0] = point[0];
    seat[1] = point[1];
    seat[2] = deck.seat[2] * SCALE;
    const mateX = Math.round(seat[0] - SEAT_CELL[0] * CELL);
    const mateY = Math.round(seat[1] - SEAT_CELL[1] * CELL);
    const crownX = mateX + CROWN_CELL[0] * CELL;
    aimHer(t, mateX, mateY);
    sway(performance.now());
    const herPose = hand < 0 ? 0 : poseOf(hand, height);

    bounds.fill(Infinity, 0, 2);
    bounds.fill(-Infinity, 2);
    const [dx, dy, hw, hh] = deck.box;
    grow(bx + dx * SCALE, by + dy * SCALE, 0, Math.hypot(hw, hh) * SCALE);
    grow(bx, by, 140 * SCALE, 36 * SCALE);
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      grow(bx + (elbowAt[0] - bx) * u, by + (elbowAt[1] - by) * u, 160 * SCALE, 54 * SCALE);
    }
    const cos = Math.cos(pose[1]);
    const sin = Math.sin(pose[1]);
    grow(bx - cos * 54 * SCALE, by - sin * 54 * SCALE, 152 * SCALE, 30 * SCALE);
    grow(elbowAt[0], elbowAt[1], (z + YOKE + 12) * SCALE, 54 * SCALE);
    const fx = Math.cos(pose[1] + pose[2]);
    const fy = Math.sin(pose[1] + pose[2]);
    const rise = Math.sin(pose[3]) * (PENCIL.reach - PENCIL.wrist);
    const wrist = PENCIL.wrist * SCALE;
    const length = (fore - wrist) * Math.cos(pose[3]);
    for (let i = 0; i <= 3; i++) {
      const u = i / 3;
      const l = wrist + length * u;
      grow(elbowAt[0] + fx * l, elbowAt[1] + fy * l, (z + rise * u + 22) * SCALE, 26 * SCALE);
    }
    const shadowX = (-LIGHT[0] / LIGHT[2]) * seat[2];
    const shadowY = (-LIGHT[1] / LIGHT[2]) * seat[2];
    const [x0, y0, x1, y1] = POSE_BOX[herPose];
    bounds[0] = Math.min(bounds[0], mateX + x0 * CELL + Math.min(0, shadowX));
    bounds[1] = Math.min(bounds[1], mateY + y0 * CELL + Math.min(0, shadowY));
    bounds[2] = Math.max(bounds[2], mateX + x1 * CELL + Math.max(0, shadowX));
    bounds[3] = Math.max(bounds[3], mateY + y1 * CELL + Math.max(0, shadowY));
    if (sliding) {
      bounds[0] = Math.min(bounds[0], sliding.cell.x);
      bounds[1] = Math.min(bounds[1], lineY - 1);
      bounds[2] = Math.max(bounds[2], sliding.cell.x + sliding.cell.w);
      bounds[3] = Math.max(bounds[3], lineY + 2);
    }

    if (along === 0) chain(bx - band.x);
    // she watches her pencil while it works, the cursor while it points at it
    let lookX = aiming && following ? (along === 0 ? cursorAt[0] : tipAt[0]) : crownX;
    for (const job of jobs) if (t >= job.go && t < job.free) lookX = tipAt[0];
    gaze = lookX < crownX - GLANCE ? 2 : lookX > crownX + GLANCE ? 3 : 0;
    paint();
    const at = `translate(${mateX - MATE_PAD[0] * CELL}px, ${mateY - MATE_PAD[1] * CELL}px)`;
    if (at !== mateAt) {
      mateAt = at;
      mate.style.transform = at;
    }

    if (!shader) return;
    set3('uCam', foot[0], foot[1], CAMERA);
    shader.set('uB', pivotAt);
    shader.set('uS', SCALE);
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
    shader.set('uTop', Math.max(170, z + YOKE + 12, z + rise + PENCIL.radius + 6) * SCALE);
    shader.set('uDeck', deck.box);
    shader.set('uValve', deck.valve);
    shader.set('uDial', deck.gauge);
    shader.set('uMotor', deck.motor);
    set3('uMate', mateX - MATE_PAD[0] * CELL, mateY - MATE_PAD[1] * CELL, CELL);
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

  /** her canvas, painted when anything of it changed: her moon steps and she blinks on the frames
   * the arm draws */
  function paint() {
    if (!ink) return;
    const herPose = hand < 0 ? 0 : poseOf(hand, height);
    const lit = wantLit && herPose > 0 && hand === wantHand && height > 0;
    const ticks = reduced ? 0 : Math.floor(performance.now() / TICK);
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
        aimed[0] = along === 0 ? cursorAt[0] : tipAt[0];
        aimed[1] = along === 0 ? cursorAt[1] : tipAt[1];
        wantLit = along === 0 && !steady;
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
    const middle = x + (SPRITE_W / 2) * CELL;
    const held = wantHand;
    if (held < 0 || Math.abs(aimed[0] - middle) > HAND_SLACK) wantHand = aimed[0] > middle ? 0 : 1;
    const across = Math.abs(aimed[0] - x - (wantHand === 0 ? 23 : 6) * CELL);
    const e = (Math.atan2(y + 30.5 * CELL - aimed[1], across) * 180) / Math.PI;
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
    return !onTab(x + x0 * CELL, y + y0 * CELL, x + x1 * CELL, y + y1 * CELL);
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
    const was = along;
    layout();
    // a resize inside the page (a props table opening) leaves her in the reader's hands, her springs
    // aimed anew; only a move between the bed and the column puts her back on the plan
    if (along !== was) {
      aiming = false;
      following = false;
    } else if (aiming && !following) for (let i = 0; i < 4; i++) aimAt[i] = park[i];
    apply();
    shader?.invalidate();
  }

  function onFrame(time: number) {
    const now = time * 1000;
    const dt = last < 0 ? 1000 / 60 : Math.min(48, now - last);
    last = now;
    if (following) {
      const s = stage.getBoundingClientRect();
      view[0] = s.left;
      view[1] = s.top;
    }
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
        playing = false;
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
        replan(clock);
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
    from = begun ? [...pose] : park;
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

  /** the writer starts: from the empty file, or dithering the server's page out first */
  function begin() {
    if (reduced || !shader || !laidOut) return;
    if (phase === 'ready') wake();
    else if (!begun) replay();
  }

  /** the theme's colours, for her next frame and the shader's */
  function colours() {
    const style = getComputedStyle(stage);
    ink = mateInk(style);
    mateShown = -1;
    if (!shader) return;
    shader.set('uLit', unit(ink.lit));
    shader.set('uShade', unit(ink.line));
    shader.set('uAccent', unit(ink.accent));
    shader.set('uYellow', unit(ink.yellow));
    shader.set('uLine', cssRgba(style.getPropertyValue('--lp-line-strong')));
    shader.set('uNight', isDark() ? 1 : 0);
    shader.set('uL', LIGHT);
    shader.invalidate();
  }

  function free(): boolean {
    return begun && !playing && (!jobs.length || clock >= jobs[jobs.length - 1].free);
  }

  /** the rig leaves its plan for the reader's springs, from where and as fast as the plan has it */
  function take() {
    sample(track, clock, from, aimPose);
    sample(pen, clock, up, sole);
    lift = sole[0];
    const before = [0, 0, 0, 0];
    sample(track, clock - 16, from, before);
    aimSpeed[0] = (aimPose[0] - before[0]) / 0.016;
    for (let i = 1; i < 4; i++) aimSpeed[i] = (aimPose[i] - nearest(before[i], aimPose[i])) / 0.016;
    aiming = true;
    steady = false;
  }

  function follow() {
    if (along === 1 || !begun || playing || reduced || !shader) return;
    following = true;
    shader.invalidate();
  }

  function goBack() {
    following = false;
    for (let i = 0; i < 4; i++) aimAt[i] = park[i];
    shader?.invalidate();
  }

  /** up a phone's column the arm follows the reading after the sequence */
  function onScroll() {
    if (!begun || playing || reduced || !shader) return;
    following = true;
    shader.invalidate();
  }

  function onMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    pointer[0] = event.clientX;
    pointer[1] = event.clientY;
    follow();
  }

  function onLeave(event: PointerEvent) {
    if (event.pointerType === 'mouse' && following) goBack();
  }

  function onClick(event: MouseEvent) {
    const tab = (event.target as Element).closest('[data-tab]');
    const b = tab && blocks.find((block) => block.tab === tab);
    if (b && (!begun || clock >= b.typed)) press(b);
  }

  /** the arm's canvas and context, made as the stage first comes on screen and kept: off screen
   * its drawing buffer shrinks away */
  function show() {
    canvas = document.createElement('canvas');
    canvas.className = 'pointer-events-none absolute inset-0 z-2 size-full';
    canvas.ariaHidden = 'true';
    stage.append(canvas);
    shader = createShaderCanvas(canvas, {
      fragment,
      onFrame,
      density: 1,
      onResize(dpr) {
        density = dpr;
        refresh();
        if (seen) begin();
      },
      onVisible(ratio) {
        visible = ratio > 0;
        blink();
        listen();
        // an empty file till the stage comes back into view
        if (!visible && !begun && !reduced) ready();
      },
    });
    if (!shader) {
      canvas.remove();
      canvas = null;
      button.hidden = true;
      // no WebGL2: the server's page stays, done, and a press flips its block at once
      for (const b of blocks) b.base = true;
      begun = false;
      playing = false;
      asks.length = 0;
      jobs.length = 0;
      phase = 'rest';
      apply();
      return;
    }
    shader.texture('uSprite', (casts[castPose] ??= silhouette(castPose)));
    colours();
  }

  const listeners = new AbortController();
  const { signal } = listeners;
  const passive = { passive: true, signal };

  /** the scroll moves a phone's arm only while its figure shows */
  function listen() {
    if (visible && along === 1) addEventListener('scroll', onScroll, passive);
    else removeEventListener('scroll', onScroll);
  }

  stage.addEventListener('pointermove', onMove, passive);
  stage.addEventListener('pointerleave', onLeave, passive);
  stage.addEventListener('click', onClick, { signal });
  button.addEventListener('click', replay, { signal });

  const near = new IntersectionObserver((entries) => {
    if (!entries[entries.length - 1].isIntersecting) {
      // an empty file till the stage comes into view
      if (!begun && !reduced) ready();
      return;
    }
    near.disconnect();
    show();
  });
  near.observe(stage);
  // the writer starts as its figure becomes the one read
  const stopActive = onActive((active) => {
    if (active !== figure) return;
    seen = true;
    begin();
  });
  const stopTheme = onTheme(colours);
  if (document.fonts.status === 'loading')
    void document.fonts.ready.then(() => {
      if (!signal.aborted && shader) refresh();
    });

  return () => {
    listeners.abort();
    near.disconnect();
    stopActive();
    stopTheme();
    shader?.destroy();
    // a remount makes its own canvas, so this one's context goes now
    canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    canvas?.remove();
  };
}

function unit([r, g, b]: readonly [number, number, number]): [number, number, number] {
  return [r / 255, g / 255, b / 255];
}
