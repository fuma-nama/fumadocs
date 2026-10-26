import { cubicBezier } from 'motion/react';
import { createShaderCanvas } from '../../lib/gl';
import { settle, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { ditherKeyframes } from '../../ui/dither';
import { createFlaps, type Flaps } from './flap';
import { cables, PLUG, pointAt, RADIUS, type Route, type Vec3 } from './cable';
import { CARDS, fragment, ROPE_POINTS } from './scene';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** the camera: how far it stands from the wall, CSS px */
const CAM = 2400;
/** depths: the crate's front face, the riser's chain, the hopper's front, cables off the wall */
const CRATE_Z = 200;
const CHAIN_Z = 44;
const HOPPER_Z = 40;
const WALL = 8;
const LID_T = 30;
const LID_OPEN = 1.62;
const LATCH_OPEN = 2.15;
const LIGHT = normalize([-0.25, -0.42, 0.87]);
/** a riser's gripper spacing, chain speed (px per ms) on a riser and on a beam, its spin-up and
 * spin-down */
const PITCH = 36;
const SPEED = 1.1;
const BEAM_SPEED = 2.4;
const ACCEL = 380;
const DECEL = 460;
/** chain travel of a file rising out of the crate (whole pitches, it meets its gripper); how far off
 * the chain a gripper's jaw holds it, clear of the sprockets' teeth at both ends */
const RISE = 3 * PITCH;
const JAW = 20;
/** a file rises out of the crate at the crate's depth, in front of the open lid; its jaw takes it
 * back to the chain over this much travel once it holds it */
const SETTLE = 48;
/**
 * A riser hands its files to the hopper one at a time: it fills, stops with the first file at its
 * head, then steps a pitch at a time, and while it stands the file at the head slides off its jaw,
 * across the riser in front of it and into the side of the hopper, behind its front. It steps once
 * a tick for its first files, then comes up to speed like a ratchet, each step this much shorter,
 * down to the quickest; a step takes this share of its tick. A file slides at least this fast (px
 * per ms) after a short start, at this depth, fast enough to clear the file under it before that
 * one rises into its row; it finishes its slide behind the hopper's front while the next one starts.
 */
const SLOW = 3;
const RAMP = 0.7;
const QUICK = 52;
const STEP = 0.32;
const SLIDE = 2.2;
const SLIDE_START = 0.16;
const SLIDE_Z = 58;
/**
 * A beam lifts each file out of the crate to just under its row, pops it into the jaw once the
 * file ahead is clear of it, and lets it fall into the hopper with a push: the lift's chain travel,
 * the pop's part of it, the room a pitch leaves between files on the beam for that pop, and the
 * fall's start speed (px per ms) and pull
 */
const LIFT = 300;
const POP = 40;
const FALL = 2;
const PULL = 0.004;
/** the reels on the editor's edge: radius, and cable speed when they wind (px per ms) */
const REEL = 8;
const WIND = 1.6;
/**
 * An act starts once the reader is at what it works on. The run starts once the stage has reached
 * the middle of the screen, or this share of the crate under the machine is on screen: after this
 * long there (ms) once the reader pauses this long, or after this long however they scroll. A
 * reader flinging past is there for less, it doesn't start. On a phone or a tablet the rewrites
 * wait for this share of the editor, the page's change for this share of its window. The command
 * is typed only when this share of it is on screen as the run starts
 */
const CRATE = 0.5;
const DWELL = 200;
const PAUSE = 100;
const LONG = 300;
const EDITOR = 0.6;
const PAGE = 0.25;
const COMMAND = 0.5;
/** the caret's moment before the command is typed */
const TYPE = 60;

const ease = cubicBezier(...settle);

interface Card {
  el: HTMLElement;
  w: number;
  h: number;
  /** a phone's beam hangs wide files smaller, so they stay inside the gutters */
  scale: number;
  /** how far a riser's file slides until the hopper's front hides it */
  slide: number;
  /** the row that takes it, and the rows it shows */
  inlet: HTMLElement | undefined;
  reveals: HTMLElement[];
  at: string;
}

/** where a piece of text starts and ends, stage px: its first row's left and top, its last row's */
interface Ends {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** an import rewired: the line that pointed at the package, the line that points at your copy */
interface Strike {
  /** its file's tab */
  tab: number;
  diff: HTMLElement;
  /** the part of the old line that changes, and the new line's, written as it is typed */
  from: HTMLElement;
  cut: HTMLElement;
  after: string;
  /** what it shows, and where the cut's text was when it was last measured */
  state: string;
  key: string;
  ends: Ends;
}

interface Cable {
  sealed: Route;
  done: Route;
  /** where the gutter reaches your folder's row: along the crate's route, along your folder's */
  branch: number;
  turn: number;
  /** the row it plugs into */
  row: HTMLElement;
}

interface Scene {
  args: string;
  /** the command, a span per character, and where each character ends: x, top, height */
  command: HTMLElement;
  ends: Float32Array;
  done: string;
  fetch: string;
  /** what your edit changes */
  name: string;
  cell: HTMLElement;
  column: HTMLElement;
  editor: HTMLElement;
  /** the editor's tabs and their files, its title, the tab of the file you edit and the one shown */
  tabs: HTMLButtonElement[];
  panels: HTMLElement[];
  title: HTMLElement;
  open: number;
  shown: number;
  tree: HTMLElement;
  /** the window's list, it scrolls when the folders you open make it longer */
  list: HTMLElement;
  counter: HTMLElement;
  flaps: Flaps;
  rows: Map<string, HTMLElement>;
  added: HTMLElement[];
  cards: Card[];
  strikes: Strike[];
  /** per cable: the tab of its file, the row it plugs into */
  cabled: number[];
  targets: HTMLElement[];
  editCut: HTMLElement;
  /** the page's window, and the page before your edit and after it */
  preview: HTMLElement;
  page: HTMLElement;
  after: HTMLElement;
  /** the preview shows your edit */
  edited: boolean;
}

interface Beats {
  type: number;
  typed: number;
  latch: [number, number];
  lid: number;
  /** the chain starts, cruises until `stop`, and has moved `travel` in the end; a riser's first file
   * reaches its head at `feed`. Per file: when it leaves the chain, when it is in the hopper */
  belt: number;
  stop: number;
  feed: number;
  travel: number;
  release: number[];
  landed: number[];
  /** a riser's files: how fast each slides, and how long it takes to start */
  slides: number[];
  starts: number[];
  /** per rewired import its rewrite, per cable its move */
  strikes: number[];
  plugs: number[];
  /** your edit: selected, typed in `editFor`, and when the page shows it */
  edit: number;
  editFor: number;
  page: number;
  end: number;
}

export function createCli(root: HTMLElement): () => void {
  const canvas = root.querySelector('canvas')!;
  // its frames step the scene once the scene is set up
  let ready = false;
  // the stage, the windows, and your project's list, whose folders move the rows the cables reach;
  // text set again in another font. Made before the canvas's own observer, so a canvas that
  // resizes with the stage draws after this layout, in the same frame
  const resize = new ResizeObserver(layout);
  // the scene steps in the canvas's own frame, so the files and the machine move together
  const shader = createShaderCanvas(canvas, { fragment, onFrame });
  if (!shader) return () => {};
  const gl = shader;
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = matchMedia('(min-width: 1024px)');
  const find = (name: string, from: ParentNode = root) =>
    from.querySelector<HTMLElement>(`[data-${name}]`)!;
  // the runs to pick and their command sit in the figure's header, above the stage
  const header = root.closest('[data-figure]') ?? root;

  const caret = find('caret', header);
  const crate = find('crate');
  const label = find('label');
  const plate = find('plate');
  const replay = find('replay', header);
  const commandBox = replay.parentElement!;
  const chips = header.querySelectorAll<HTMLButtonElement>('[data-play]');

  const scenes: Scene[] = [];
  for (const cell of root.querySelectorAll<HTMLElement>('[data-tree-cell]')) {
    const index = Number(cell.dataset.treeCell);
    const column = root.querySelector<HTMLElement>(`[data-column="${index}"]`)!;
    const tree = find('tree', cell);
    const rows = new Map<string, HTMLElement>();
    for (const el of tree.querySelectorAll<HTMLElement>('[data-path]'))
      rows.set(el.dataset.path!, el);
    const added: HTMLElement[] = [];
    for (const el of tree.querySelectorAll<HTMLElement>('[data-added]')) added.push(el);
    const row = (path: string) => {
      const el = rows.get(path);
      const trigger = el?.firstElementChild;
      return trigger instanceof HTMLButtonElement ? trigger : el;
    };
    const cards: Card[] = [];
    for (const el of root.querySelectorAll<HTMLElement>(`[data-card][data-scene="${index}"]`)) {
      const reveals: HTMLElement[] = [];
      for (const path of el.dataset.reveals!.split(' ')) {
        const at = rows.get(path);
        if (at?.dataset.added !== undefined) reveals.push(at);
      }
      cards.push({
        el,
        w: 0,
        h: 0,
        scale: 1,
        slide: 0,
        inlet: row(el.dataset.card!),
        reveals,
        at: '',
      });
    }
    const editor = find('editor', column);
    const tabs = [...editor.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const strikes: Strike[] = [];
    for (const el of editor.querySelectorAll<HTMLElement>('[data-rewire]')) {
      const cut = find('cut', el);
      strikes.push({
        tab: Number(el.closest<HTMLElement>('[data-panel]')!.dataset.panel),
        diff: el,
        from: find('from', el),
        cut,
        after: cut.dataset.new!,
        state: '',
        key: '',
        ends: { x0: 0, y0: 0, x1: 0, y1: 0 },
      });
    }
    // a cable per file whose imports now resolve into your project
    const cabled: number[] = [];
    const targets: HTMLElement[] = [];
    for (const tab of tabs) {
      if (tab.dataset.target === undefined) continue;
      cabled.push(Number(tab.dataset.tab));
      targets.push(row(tab.dataset.target)!);
    }
    const open = tabs.findIndex((tab) => tab.ariaSelected === 'true');
    const counter = root.querySelector<HTMLElement>(`[data-counter][data-scene="${index}"]`)!;
    const command = header.querySelector<HTMLElement>(`[data-command="${index}"]`)!;
    scenes[index] = {
      args: cell.dataset.args!,
      command,
      ends: new Float32Array(command.children.length * 3 + 3),
      done: cell.dataset.done!,
      fetch: cell.dataset.fetch!,
      name: cell.dataset.editName!,
      cell,
      column,
      editor,
      tabs,
      panels: [...editor.querySelectorAll<HTMLElement>('[data-panel]')],
      title: find('title', editor),
      open,
      shown: open,
      tree,
      list: find('list', tree),
      counter,
      flaps: createFlaps(counter),
      rows,
      added,
      cards,
      strikes,
      cabled,
      targets,
      editCut: find('cut', find('edit-line', editor)),
      preview: find('preview', column),
      page: find('page', column),
      after: find('after', column),
      edited: true,
    };
  }
  let scene = scenes[0];
  const editCaret = find('edit-caret');

  // geometry, stage px; world points are CSS px with z toward the viewer
  const stage: [number, number] = [0, 0];
  let foot: [number, number] = [0, 0];
  /** the chain from its tail: a riser going up, or on a phone a beam going right */
  const chain = {
    tail: [0, 0] as [number, number],
    dir: [0, -1] as [number, number],
    /** the side its boom stands on, the files hang on the other */
    side: [1, 0] as [number, number],
    length: 1,
  };
  let beam = false;
  /** the files' spacing on the chain and its speed: a phone's short beam carries them spaced by
   * the widest and the room for a pop, faster, so the delivery keeps about its time */
  let pitch = PITCH;
  let speed = SPEED;
  let hopper: Vec3 = [0, 0, 0];
  /** the hopper's mouth, stage px: a file falling in shrinks to fit it */
  let mouth = 0;
  let inside: Vec3 = [0, 0, 0];
  /** a riser's file leaves its jaw from here, at the depth it slides at; a beam's file is lifted to
   * just under the files on it, and falls this far into the hopper */
  let slideFrom: Vec3 = [0, 0, 0];
  let band = 0;
  let fall = 0;
  const editEnds: Ends = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const wires: Cable[] = [];
  let beats = schedule();

  // state
  let phase: 'rest' | 'ready' | 'play' | 'hold' = 'rest';
  let clock = 0;
  /** the next act to start: 0 the command, 1 the delivery, 2 the rewrites and your edit, 3 the
   * page it changes */
  let act = 0;
  let last = -1;
  /** the stage has reached the middle of the screen; how much of each part an act waits for is on
   * screen, from their observers; since when the reader is at the stage, when they last scrolled */
  let middle = false;
  const ratios = new WeakMap<Element, number>();
  let dwell = 0;
  let since = 0;
  let scrolled = 0;
  let disposed = false;
  let shownStatus = '';
  let landedShown = -1;
  let flashed = -1;
  let flashUntil = 0;
  let flashRow: HTMLElement | undefined;
  let caretMode = '';
  let caretAt = '';
  let typedShown = -1;
  let caretHeight = 0;
  let editCaretKey = '';
  /** the tab the play last turned to: a tab you pick mid-play stays until the next beat */
  let beatTab = -1;
  const scratch: [number, number, number] = [0, 0, 0];
  const point: Vec3 = [0, 0, 0];
  const holeDepth = new Float32Array(CARDS);

  function project(x: number, y: number, z: number): [number, number, number] {
    const k = CAM / (CAM - z);
    scratch[0] = foot[0] + (x - foot[0]) * k;
    scratch[1] = foot[1] + (y - foot[1]) * k;
    scratch[2] = k;
    return scratch;
  }

  function unproject(x: number, y: number, z: number): Vec3 {
    const k = CAM / (CAM - z);
    return [foot[0] + (x - foot[0]) / k, foot[1] + (y - foot[1]) / k, z];
  }

  function box(el: Element, s: DOMRect): Rect {
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }

  /** screen bounds of a world box, with its shadow on the wall */
  function bounds(min: Vec3, max: Vec3, pad = 6): [number, number, number, number] {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const p: Vec3 = [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]];
      const s = p[2] / LIGHT[2];
      for (const q of [p, [p[0] - LIGHT[0] * s, p[1] - LIGHT[1] * s, 0]]) {
        const [x, y] = project(q[0], q[1], q[2]);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  }

  /** a box whose front face, at z, frames `rect` with a border */
  function housing(name: string, rect: Rect, z: number, depth: number, border: number) {
    const a = unproject(rect.x - border, rect.y - border, z);
    const b = unproject(rect.x + rect.w + border, rect.y + rect.h + border, z);
    gl.set(`${name}C`, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z - depth]);
    gl.set(`${name}B`, [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2, depth]);
  }

  function colours() {
    const style = getComputedStyle(html);
    const night = html.classList.contains('dark');
    const paper = rgb(style.getPropertyValue('--lp-paper'));
    const ink = rgb(style.getPropertyValue('--lp-ink'));
    gl.set('uLit', night ? ink : paper);
    gl.set('uShade', night ? paper : ink);
    gl.set('uPen', ink);
    // shadows are dots in the tone of the sheet's lines
    const line = night ? 0.75 : 0.82;
    gl.set('uLine', [
      paper[0] + (ink[0] - paper[0]) * line,
      paper[1] + (ink[1] - paper[1]) * line,
      paper[2] + (ink[2] - paper[2]) * line,
    ]);
    gl.set('uAccent', rgb(style.getPropertyValue(night ? '--lp-orange' : '--lp-sun')));
    gl.invalidate();
  }

  /** chain travel at time t, ms: spin-up, cruise, spin-down, then a riser's steps */
  function travel(t: number): number {
    const t0 = t - beats.belt;
    if (t0 <= 0) return 0;
    const v = speed;
    if (t0 < ACCEL) return (v * t0 * t0) / (2 * ACCEL);
    const cruise = beats.stop - beats.belt;
    if (t0 < cruise) return (v * ACCEL) / 2 + v * (t0 - ACCEL);
    const d = Math.min(t0 - cruise, DECEL);
    const run = (v * ACCEL) / 2 + v * (cruise - ACCEL) + v * d - (v * d * d) / (2 * DECEL);
    if (beam || t <= beats.feed) return run;
    // each step brings the next file to the head as its turn comes
    const turns = beats.release;
    let k = 1;
    while (k < turns.length && t >= turns[k]) k++;
    let step = 0;
    if (k < turns.length) {
      const length = (turns[k] - turns[k - 1]) * STEP;
      step = inOutQuad(clamp((t - turns[k] + length) / length));
    }
    return run + (k - 1 + step) * pitch;
  }

  /** where a riser's file is along its slide, `out` ms after it left its jaw */
  function slid(b: Beats, i: number, out: number): number {
    const v = b.slides[i];
    const start = b.starts[i];
    return out < start ? (v * out * out) / (2 * start) : v * (out - start / 2);
  }

  /** a beam's file: from leaving its jaw until it is in the hopper */
  function fallTime(): number {
    return (Math.sqrt(FALL * FALL + 2 * PULL * fall) - FALL) / PULL;
  }

  /** a cable's plug travel and its wind, from its start: out of the crate, along the floor, up the gutter */
  function windTime(c: Cable): number {
    return (c.sealed.length - c.branch) / WIND + 160;
  }

  function schedule(): Beats {
    // the command starts being typed almost at once: the run shows it started
    const typed = TYPE + scene.command.children.length * 25;
    const latch: [number, number] = [typed + 120, typed + 120 + TICK];
    const lid = latch[1] + 2 * TICK;
    const belt = lid + 480;
    const v = speed;
    const n = scene.cards.length;
    const rise = beam ? LIFT : RISE;
    const release: number[] = [];
    const landed: number[] = [];
    const slides: number[] = [];
    const starts: number[] = [];
    let stop: number;
    let feed: number;
    let distance: number;
    if (beam) {
      // the beam runs until its last file lets go, then spins down; the files fall on their own
      const last = rise + (n - 1) * pitch + chain.length;
      stop = belt + ACCEL + (last - (v * ACCEL) / 2) / v;
      for (let i = 0; i < n; i++) {
        release.push(stop - ((n - 1 - i) * pitch) / v);
        landed.push(release[i] + fallTime());
      }
      feed = release[0];
      distance = last + (v * DECEL) / 2;
    } else {
      // the riser fills, stops with its first file at the head, then steps a pitch at a time
      const first = rise + chain.length;
      feed = belt + ACCEL + (first - (v * ACCEL) / 2 - (v * DECEL) / 2) / v + DECEL;
      stop = feed - DECEL;
      let turn = TICK;
      let at = feed;
      for (let i = 0; i < n; i++) {
        const card = scene.cards[i];
        // the next file rises into this one's row a third into the next step
        const clear = turn * (1 - STEP * 0.67);
        starts.push(turn * SLIDE_START);
        slides.push(
          i < n - 1 ? Math.max(SLIDE, (card.w * card.scale + 6) / (clear - starts[i] / 2)) : SLIDE,
        );
        release.push(at);
        landed.push(at + starts[i] / 2 + card.slide / slides[i]);
        at += turn;
        if (i + 1 >= SLOW) turn = Math.max(QUICK, turn * RAMP);
      }
      distance = first + (n - 1) * pitch;
    }
    const strikes: number[] = [];
    const plugs: number[] = [];
    let t = landed[n - 1] + TICK / 2;
    let free = t;
    for (let i = 0; i < scene.strikes.length; i++) {
      const strike = scene.strikes[i];
      strikes.push(t);
      // a file's cable moves once its last import is rewritten, while the diff is read
      const c = scene.cabled.indexOf(strike.tab);
      if (c >= 0 && scene.strikes[i + 1]?.tab !== strike.tab) {
        plugs[c] = t + 300 + strike.after.length * 70 + 60;
        free = wires[c] ? plugs[c] + windTime(wires[c]) + 260 : t + strikeTime(strike);
      }
      t += strikeTime(strike) + 160;
    }
    const edit = Math.max(free, t) + 120;
    // typed within the run's last beat: a long edit types faster
    const editFor = Math.min(scene.editCut.dataset.new!.length * 40, 240);
    return {
      type: TYPE,
      typed,
      latch,
      lid,
      belt,
      stop,
      feed,
      travel: distance,
      release,
      landed,
      slides,
      starts,
      strikes,
      plugs,
      edit,
      editFor,
      page: edit + 300 + editFor + 120,
      end: edit + 980,
    };
  }

  /** an import's rewrite: selected, struck, the new line typed, then a moment to read the diff */
  function strikeTime(s: Strike) {
    return 300 + s.after.length * 70 + 640;
  }

  function layout() {
    const s = root.getBoundingClientRect();
    if (s.width === 0) return;
    const desktop = desktopQuery.matches;
    foot = [s.width * (desktop ? 0.56 : 0.5), 0];
    gl.set('uEye', [foot[0], foot[1], CAM]);
    gl.set('uLight', LIGHT);
    gl.set('uCell', 2);
    // where each character of the command ends, the first entry where it starts
    {
      const chars = scene.command.children;
      const first = chars[0] as HTMLElement;
      scene.ends[0] = first.offsetLeft;
      scene.ends[1] = first.offsetTop;
      scene.ends[2] = first.offsetHeight;
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i] as HTMLElement;
        scene.ends[i * 3 + 3] = char.offsetLeft + char.offsetWidth;
        scene.ends[i * 3 + 4] = char.offsetTop;
        scene.ends[i * 3 + 5] = char.offsetHeight;
      }
      caretAt = '';
      typedShown = -1;
      caretHeight = caret.offsetHeight;
    }

    // every row in, to find where the cables plug; the play hides them again
    for (const el of scene.added) el.style.display = '';

    // the crate's front face is its slot
    const slot = box(crate, s);
    // as deep as about a third of its width: the bigger crate of a wide stage stays a box
    const depth = desktop ? Math.max(92, Math.round(slot.w * 0.37)) : 80;
    const a = unproject(slot.x, slot.y, CRATE_Z);
    const b = unproject(slot.x + slot.w, slot.y + slot.h, CRATE_Z);
    const floor = b[1];
    const size: Vec3 = [(b[0] - a[0]) / 2, (b[1] - a[1] - LID_T) / 2, depth / 2];
    const centre: Vec3 = [(a[0] + b[0]) / 2, floor - size[1], CRATE_Z - size[2]];
    const top = floor - 2 * size[1];
    gl.set('uFloor', [floor, CRATE_Z + 24]);
    gl.set('uCrate', centre);
    gl.set('uCrateSize', size);
    gl.set('uLidT', LID_T);
    const tag = box(label, s);
    gl.set('uLabel', [tag.x, tag.y, tag.x + tag.w, tag.y + tag.h]);
    housing('uLabel', tag, CRATE_Z + 3, 3, 6);
    // the sockets stand above the corner caps, right of the label's plate; the right one's cable
    // drops clear of its cap
    const socket = centre[0] + size[0] - 30;
    const beside = unproject(tag.x + tag.w + 6, 0, CRATE_Z)[0] + 15;
    const sockets: Vec3[] = [
      [socket, floor - 37, CRATE_Z],
      [Math.max(socket - 30, beside), floor - 37, CRATE_Z],
    ];
    gl.set('uSocket[0]', sockets[0]);
    gl.set('uSocket[1]', sockets[1]);

    for (const card of scene.cards) {
      card.w = card.el.offsetWidth;
      card.h = card.el.offsetHeight;
      card.at = '';
    }

    // the drive unit frames the registry's plate and turns the chain
    const sign = box(plate, s);
    gl.set('uPlate', [sign.x, sign.y, sign.x + sign.w, sign.y + sign.h]);
    housing('uDrive', sign, CHAIN_Z + 22, 18, 8);
    // the hopper frames the counter, its spout rests on the title bar of your project
    const counter = box(scene.counter, s);
    gl.set('uCounter', [counter.x, counter.y, counter.x + counter.w, counter.y + counter.h]);
    housing('uCounter', counter, HOPPER_Z + 24, 4, 5);
    const treeBox = box(scene.tree, s);
    // placed by its front face, the one around the counter: far down a tall stage the perspective
    // would otherwise move it off its window
    const middle = counter.x + counter.w / 2;
    const face = HOPPER_Z + 22;
    hopper = unproject(middle, counter.y - 14, face);
    hopper[2] = HOPPER_Z;
    const neck = unproject(middle, treeBox.y, face);
    // a funnel wide enough to take a file falling flat, its lip inside the gutters
    const gutter = Number.parseFloat(getComputedStyle(root).paddingLeft);
    const lip = HOPPER_Z + 25;
    // on a phone it stands beside the crate: clear of the lid's ram
    const ram = project(centre[0] + size[0] + 16, 0, CRATE_Z - 30)[0];
    const left = desktop ? gutter : Math.max(gutter, ram + 8);
    const halfWidth = Math.min(
      (counter.w + (desktop ? 80 : 40)) / 2 / (CAM / (CAM - HOPPER_Z)),
      unproject(s.width - gutter, 0, lip)[0] - hopper[0] - 4,
      hopper[0] - unproject(left, 0, lip)[0] - 4,
    );
    mouth = halfWidth * 2 * (CAM / (CAM - HOPPER_Z));
    gl.set('uFrame', [gutter, s.width - gutter]);
    gl.set('uHopper', hopper);
    gl.set('uHopperSize', [
      halfWidth,
      Math.min(counter.w / 2 + 6, halfWidth),
      neck[1] - hopper[1],
      22,
    ]);

    // a desktop's riser climbs from above the open lid to the head beside the hopper, the files
    // clamped on its left; a phone's beam runs from under the drive unit to over the hopper, the
    // files hanging under it
    beam = !desktop;
    gl.set('uJaw', JAW);
    gl.set('uJawBox', beam ? [13, 2.5] : [2.5, 13]);
    const front = CHAIN_Z + 22;
    let tail: Vec3;
    let head: Vec3;
    if (beam) {
      // low enough that the drive's gear on top of its tail clears the plate
      tail = unproject(sign.x + 80, sign.y + sign.h + 38, CHAIN_Z);
      head = unproject(middle, sign.y + sign.h + 38, CHAIN_Z);
      chain.dir = [1, 0];
      chain.side = [0, -1];
      chain.length = head[0] - tail[0] - 6;
      gl.set('uDriveGear', [tail[0], tail[1] - 23, front]);
    } else {
      head = unproject(sign.x + sign.w + 25, counter.y - 4, CHAIN_Z);
      const lid = project(centre[0], top - 2 * size[2] - 6, centre[2] - size[2])[1];
      tail = [head[0], unproject(0, lid - 14 - scene.cards[0].h / 2, CHAIN_Z)[1], CHAIN_Z];
      chain.dir = [0, -1];
      chain.side = [1, 0];
      // files let go of their jaw this far below the head sprocket: they slide off between its
      // teeth and your project's window
      chain.length = tail[1] - head[1] - 33;
      gl.set('uDriveGear', [unproject(sign.x + sign.w + 8, 0, front)[0] - 12, head[1], front]);
    }
    chain.tail = [tail[0], tail[1]];
    gl.set('uChain', [tail[0], tail[1], chain.dir[0], chain.dir[1]]);
    gl.set('uChainLength', [Math.hypot(head[0] - tail[0], head[1] - tail[1]), CHAIN_Z]);
    gl.set('uChainSide', chain.side);
    inside = [centre[0], top + 30, centre[2]];
    // under a beam the files hang centred: wide ones shrink to stay inside the gutters, on the
    // beam and on their way up from the crate, nearer and so larger
    const [tailX, , k] = project(tail[0], tail[1], CHAIN_Z);
    const headX = project(head[0], head[1], CHAIN_Z)[0];
    const [crateX, , near] = project(inside[0], inside[1], inside[2]);
    const climb = Math.min(crateX, project(tail[0], tail[1], inside[2])[0]) - gutter - 4;
    const reach = s.width - gutter - 4 - headX;
    // and a riser's widest, hanging left of their jaws, stay inside the gutter too
    const hang = tailX - JAW * k - gutter - 4;
    let widest = 0;
    for (const card of scene.cards) {
      card.scale = beam
        ? Math.min(
            0.8,
            (2 * Math.min(tailX - gutter - 4, reach)) / (card.w * k),
            (2 * climb) / (card.w * near),
          )
        : Math.min(1, hang / (card.w * k), (2 * (crateX - gutter - 4)) / (card.w * near));
      widest = Math.max(widest, card.w * card.scale * k);
    }
    // a beam spaces its files by the widest and the room for a pop between them
    pitch = beam ? widest + 4 + POP : PITCH;
    speed = beam ? BEAM_SPEED : SPEED;
    gl.set('uPitch', pitch);
    gripper(chain.length);
    if (beam) {
      band = 0;
      for (const card of scene.cards) band = Math.max(band, card.h * card.scale);
      fall = hopper[1] + 16 - point[1];
    } else {
      // a file sliding off the head is gone once its left edge passes the hopper's front edge, at
      // the height of the file's bottom
      const [jawX, jawY] = project(point[0], point[1], CHAIN_Z);
      slideFrom = unproject(jawX, jawY, SLIDE_Z);
      const bottom = project(0, slideFrom[1] + scene.cards[0].h, SLIDE_Z)[1];
      const y = unproject(0, bottom, face)[1];
      const taper = clamp((y - hopper[1]) / (neck[1] - hopper[1]));
      const edge = hopper[0] - mix(halfWidth, Math.min(counter.w / 2 + 6, halfWidth), taper);
      const inlet = unproject(project(edge, y, face)[0], 0, SLIDE_Z)[0];
      for (const card of scene.cards) card.slide = inlet + card.w * card.scale - slideFrom[0] + 1;
    }

    const editor = box(scene.editor, s);
    for (const strike of scene.strikes) strike.key = '';
    editCaretKey = '';
    {
      // the edit caret is a character cell of the code
      const range = document.createRange();
      range.selectNodeContents(scene.editCut);
      const cut = range.getBoundingClientRect();
      editCaret.style.width = `${cut.width / Math.max(scene.editCut.textContent!.length, 1)}px`;
      editCaret.style.height = `${cut.height}px`;
    }

    // cables: off a reel on the editor's edge beside a file's tab, down the gutter, along the
    // floor to the crate
    wires.length = 0;
    if (desktop) {
      // both lanes keep to the tree's side of the gutter: the run to the floor swings out toward the
      // viewer, far enough to pass under your project's window
      const lanes = [treeBox.x + treeBox.w + 10, treeBox.x + treeBox.w + 21];
      const front = [CRATE_Z + 40, CRATE_Z + 58];
      const view = box(scene.list, s);
      for (let i = 0; i < scene.cabled.length; i++) {
        const tab = box(scene.tabs[scene.cabled[i]], s);
        const reel: Vec3 = [editor.x - REEL - 2, tab.y + tab.h / 2, WALL];
        const row = box(scene.targets[i], s);
        const lane = lanes[i];
        // a row scrolled out of the list keeps its plug on the list's edge
        const plug = Math.min(view.y + view.h - 10, Math.max(view.y + 10, row.y + row.h / 2));
        const target: Vec3 = [treeBox.x + treeBox.w + 3, plug, WALL];
        const { sealed, done, branch, turn } = cables({
          reel: [reel[0] - REEL, reel[1], WALL],
          lane,
          wall: WALL,
          floor,
          front: front[i],
          forward: unproject(project(lane, 0, WALL)[0], 0, front[i])[0],
          socket: [sockets[i][0], sockets[i][1], CRATE_Z + 2],
          target,
        });
        wires.push({ sealed, done, branch, turn, row: scene.targets[i] });
        gl.set(`uReel[${i}]`, reel);
        gl.set(`uJack[${i}]`, [target[0] - 3, target[1], WALL]);
      }
    }
    gl.set('uCables', wires.length);

    // where the machine may draw, its shadow included; windows stay clean
    gl.set(
      'uBox[0]',
      bounds(
        [centre[0] - size[0] - 20, top - LID_T - 2 * size[2] - 10, 0],
        [centre[0] + size[0] + 24, floor, CRATE_Z + 10],
      ),
    );
    const unit = unproject(sign.x - 10, sign.y - 10, 0);
    gl.set('uBox[1]', bounds([unit[0], unit[1], 0], [head[0] + 34, tail[1] + 24, CHAIN_Z + 42]));
    gl.set(
      'uBox[2]',
      bounds(
        [hopper[0] - halfWidth - 6, hopper[1] - 8, 0],
        [hopper[0] + halfWidth + 6, neck[1] + 8, HOPPER_Z + 30],
      ),
    );
    gl.set(
      'uBox[3]',
      desktop
        ? bounds([treeBox.x + treeBox.w - 12, editor.y, 0], [editor.x + 12, floor, 24])
        : [0, 0, 0, 0],
    );
    const windows = [scene.tree, scene.editor, find('preview', scene.column)];
    for (let i = 0; i < windows.length; i++) {
      const r = box(windows[i], s);
      gl.set(`uWindow[${i}]`, [r.x, r.y, r.x + r.w, r.y + r.h]);
    }

    beats = schedule();
    // a waiting run waits where its act now starts
    if (phase === 'hold') clock = actAt(act) - 1;
    landedShown = -1;
    render(phase === 'rest' ? beats.end : clock);
    // rows that moved this frame have their cables drawn on them now, not a frame late; a stage
    // that changed size is drawn as its canvas resizes, right after
    if (s.width === stage[0] && s.height === stage[1]) gl.draw();
    stage[0] = s.width;
    stage[1] = s.height;
    check();
  }

  /** the scene at time t, ms */
  function render(t: number) {
    const live = phase !== 'rest';
    const b = beats;

    // the command, typed: the characters not typed yet keep their place, unseen
    const length = scene.command.children.length;
    const shown = live ? Math.round(clamp((t - b.type) / (b.typed - b.type)) * length) : length;
    if (shown !== typedShown) {
      typedShown = shown;
      if (shown < length) scene.command.style.setProperty('--typed', String(shown));
      else scene.command.style.removeProperty('--typed');
    }
    const typing = !live || t > b.lid ? 'none' : t < b.type || t > b.typed ? 'blink' : 'solid';
    if (typing !== caretMode) {
      caretMode = typing;
      caret.style.visibility = typing === 'none' ? 'hidden' : 'visible';
      // it blinks only while it shows: a hidden caret's animation would still tick
      caret.classList.toggle('lp-caret', typing === 'blink');
    }
    const end = shown * 3;
    const at = `translate(${scene.ends[end].toFixed(1)}px, ${(scene.ends[end + 1] + (scene.ends[end + 2] - caretHeight) / 2).toFixed(1)}px)`;
    if (at !== caretAt) {
      caretAt = at;
      caret.style.transform = at;
    }

    // latches, then the lid on its ram
    gl.set('uLatch', [
      live ? LATCH_OPEN * spring(clamp((t - b.latch[0]) / 260)) : LATCH_OPEN,
      live ? LATCH_OPEN * spring(clamp((t - b.latch[1]) / 260)) : LATCH_OPEN,
    ]);
    gl.set('uLid', live ? lidAngle(t - b.lid) : LID_OPEN);

    // the chain and the files it carries
    const distance = live ? travel(t) : b.travel;
    gl.set('uPhase', distance);
    gl.set('uSpin', distance / 13);
    let holes = 0;
    let landed = 0;
    const cards = scene.cards;
    const rise = beam ? LIFT : RISE;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const s = distance - rise - i * pitch;
      const out = t - b.release[i];
      if (live && t >= b.landed[i]) landed++;
      if (!live || s <= -rise || t >= b.landed[i]) {
        if (card.el.style.visibility !== '') card.el.style.visibility = '';
        continue;
      }
      // a riser clamps it by its right edge, a beam holds it by the middle of its top; centred in
      // the crate and over the hopper
      let anchor = beam ? card.w / 2 : card.w;
      let fit = 1;
      let x: number;
      let y: number;
      let z = CHAIN_Z;
      if (out >= 0 && beam) {
        // let go over the hopper with a push, it falls in
        const u = out / (b.landed[i] - b.release[i]);
        gripper(chain.length);
        x = mix(point[0], hopper[0], ease(u));
        y = point[1] + FALL * out + (PULL * out * out) / 2;
        z = mix(CHAIN_Z, HOPPER_Z, u);
        fit = mix(1, Math.min(1, (mouth - 12) / (card.w * card.scale)), ease(u));
      } else if (out >= 0) {
        // off its jaw, across the riser in front of it and into the hopper's side
        x = slideFrom[0] + slid(b, i, out);
        y = slideFrom[1];
        z = SLIDE_Z;
      } else if (s < 0 && beam) {
        // under the tail: up out of the crate to just under the files on the beam, then into the
        // jaw once the one ahead has moved clear
        gripper(0);
        const lift = rise - POP;
        z = inside[2];
        if (s < -POP) {
          const u = (s + rise) / lift;
          x = mix(inside[0], point[0], ease(Math.min(1, u * 2)));
          y = mix(inside[1], point[1] + band + 6, 1 - (1 - u) * (1 - u));
        } else {
          x = point[0];
          y = mix(point[1] + band + 6, point[1], (s + POP) / POP);
        }
      } else if (s < 0) {
        // straight up out of the crate in front of the lid, to its jaw at the chain's speed
        const u = (s + rise) / rise;
        gripper(0);
        x = inside[0];
        y = bezier(inside[1], point[1] + RISE / 2, point[1], u);
        z = inside[2];
        anchor = card.w / 2;
      } else {
        gripper(s);
        x = point[0];
        y = point[1];
        if (s < SETTLE) {
          // the jaw takes it back to the chain, from over the crate on a riser
          const v = ease(s / SETTLE);
          z = mix(inside[2], CHAIN_Z, v);
          if (!beam) {
            x = mix(inside[0], point[0], v);
            anchor = mix(card.w / 2, anchor, v);
          }
        }
      }
      const [sx, sy, depth] = project(x, y, z);
      const k = depth * fit * card.scale;
      const left = sx - anchor * k;
      const transform = `translate(${left.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${k.toFixed(4)})`;
      if (transform !== card.at) {
        card.at = transform;
        card.el.style.transform = transform;
      }
      if (card.el.style.visibility !== 'visible') card.el.style.visibility = 'visible';
      // a file sliding off the head passes in front of the riser
      const layer = String(Math.round(z));
      if (card.el.style.zIndex !== layer) card.el.style.zIndex = layer;
      if (holes < CARDS) {
        gl.set(`uCard[${holes}]`, [left, sy, left + card.w * k, sy + card.h * k]);
        holeDepth[holes] = z;
        holes++;
      }
    }
    for (let i = 0; i < CARDS / 4; i++) {
      gl.set(`uCardZ[${i}]`, [
        holeDepth[i * 4],
        holeDepth[i * 4 + 1],
        holeDepth[i * 4 + 2],
        holeDepth[i * 4 + 3],
      ]);
    }
    gl.set('uCards', holes);
    land(t, live, landed);

    // the editor turns to the file each beat acts on: the first to rewire, each one rewired, the
    // one you edit
    if (live) {
      let tab = scene.strikes.length > 0 ? scene.strikes[0].tab : scene.open;
      for (let i = 0; i < scene.strikes.length; i++)
        if (t >= b.strikes[i]) tab = scene.strikes[i].tab;
      if (t >= b.edit) tab = scene.open;
      if (tab !== beatTab) {
        beatTab = tab;
        pick(scene, tab);
      }
    }

    // each import: its old line selected, struck, the new line under it typed; then its file's
    // cable moves from the crate to your folder
    let writing: Strike | undefined;
    for (let i = 0; i < scene.strikes.length; i++) {
      const strike = scene.strikes[i];
      const u = live ? t - b.strikes[i] : Infinity;
      const chars = u < 300 ? 0 : Math.min(strike.after.length, 1 + Math.floor((u - 300) / 70));
      const text = strike.after.slice(0, chars);
      const state = `${u >= 220 ? 'diff' : ''}|${u >= 60 && u < 220 ? 'selected' : ''}|${text}`;
      if (state === strike.state) continue;
      strike.state = state;
      strike.diff.toggleAttribute('data-diff', u >= 220);
      const selected = u >= 60 && u < 220;
      strike.from.style.background = selected ? 'var(--lp-yellow)' : '';
      strike.from.style.color = selected ? '#121210' : '';
      if (strike.cut.textContent !== text) strike.cut.textContent = text;
      if (u >= 220 && u < strikeTime(strike)) writing = strike;
    }

    const spin: [number, number] = [0, 0];
    const plugged: [number, number] = [0, 0];
    for (let i = 0; i < wires.length; i++) {
      const c = wires[i];
      const u = live ? t - b.plugs[i] : Infinity;
      const wind = windTime(c);
      // reeled in along its path, a pause at your folder, then pushed into its socket
      let route = c.sealed;
      let end = c.sealed.length;
      if (u >= 0) {
        if (u < wind - 160)
          end = c.sealed.length - (c.sealed.length - c.branch) * reelIn(u / (wind - 160));
        else {
          route = c.done;
          const jog = c.done.length - c.turn;
          const v = clamp((u - wind) / 150);
          end = c.done.length - jog * (1 - (u < wind ? 0 : springOut(v)));
          plugged[i] = u >= wind - 2 * TICK ? 1 : 0;
          if (u >= wind + 150) plugged[i] = 1;
        }
      }
      spin[i] = (c.sealed.length - end) / REEL;
      upload(i, route, end);
      if (u >= wind + 150 && u < wind + 150 + TICK) flash(c.row, t);
    }
    gl.set('uReelSpin', spin);
    gl.set('uJackOn', plugged);

    // your edit, and the page it changes
    const e = t - b.edit;
    const cut = scene.editCut;
    const next = cut.dataset.new!;
    let value = live && e < 300 ? cut.dataset.old! : next;
    const select = live && e >= 120 && e < 300;
    let typed = -1;
    if (live && e >= 300 && e < 300 + b.editFor) {
      typed = Math.min(next.length, 1 + Math.floor(((e - 300) / b.editFor) * next.length));
      value = next.slice(0, typed);
    }
    if (cut.textContent !== value) cut.textContent = value;
    const background = select ? 'var(--lp-yellow)' : '';
    if (cut.style.background !== background) {
      cut.style.background = background;
      cut.style.color = select ? '#121210' : '';
    }
    // the caret after the text being typed, found again whenever its line reflows
    const editing = live && e >= 0 && e < 300 + b.editFor + 200;
    const target = editing ? cut : writing?.cut;
    const caretKey = target ? `${editing ? 'edit' : writing!.tab}|${target.textContent}` : '';
    if (caretKey !== editCaretKey) {
      editCaretKey = caretKey;
      editCaret.style.visibility = target ? 'visible' : '';
      // solid while it types, like an editor's; it blinks while the run waits, never hidden
      editCaret.classList.toggle('lp-caret', !!target && phase === 'hold');
      if (target) {
        measure(target, editEnds);
        editCaret.style.transform = `translate(${editEnds.x1.toFixed(1)}px, ${editEnds.y1.toFixed(1)}px)`;
      }
    }
    const edited = !live || t >= b.page;
    if (edited !== scene.edited) {
      scene.edited = edited;
      scene.page.toggleAttribute('data-edited', edited);
      if (edited && live)
        scene.after.animate(ditherKeyframes(2), { duration: 3 * TICK, easing: 'linear' });
    }

    status(t, live);
    gl.invalidate();
  }

  /** the editor shows the file of tab `i`: its tab picked, its lines, its path in the title */
  function pick(s: Scene, i: number) {
    if (s.shown === i) return;
    s.shown = i;
    for (let k = 0; k < s.tabs.length; k++) {
      s.tabs[k].ariaSelected = String(k === i);
      s.panels[k].inert = k !== i;
    }
    s.title.textContent = s.tabs[i].dataset.file!;
  }

  /** where `el`'s text is now; a layout read, so only when its text changed */
  function measure(el: HTMLElement, out: Ends) {
    const s = root.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = range.getClientRects();
    const first = rects[0] ?? el.getBoundingClientRect();
    const last = rects[rects.length - 1] ?? first;
    out.x0 = first.left - s.left;
    out.y0 = first.top - s.top;
    out.x1 = last.right - s.left;
    out.y1 = last.top - s.top;
  }

  /** where a file is held `s` along the chain: in its gripper's jaw, the top right corner of a file
   * on a riser, the middle of its top under a beam */
  function gripper(s: number) {
    point[0] = chain.tail[0] + chain.dir[0] * s - chain.side[0] * JAW;
    point[1] = chain.tail[1] + chain.dir[1] * s - chain.side[1] * JAW + (beam ? 2 : -12);
    point[2] = CHAIN_Z;
  }

  /** the visible part of cable `i`: its route up to `end`, projected */
  function upload(i: number, r: Route, end: number) {
    let n = 0;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const put = (p: Vec3, plug: boolean) => {
      const [sx, sy, k] = project(p[0], p[1], p[2]);
      const radius = (plug ? 6 : RADIUS) * k;
      gl.set(`uRope[${i * ROPE_POINTS + n}]`, [sx, sy, p[2], radius]);
      n++;
      x0 = Math.min(x0, sx - radius - 2);
      y0 = Math.min(y0, sy - radius - 2);
      x1 = Math.max(x1, sx + radius + 2);
      y1 = Math.max(y1, sy + radius + 2);
    };
    for (let j = 0; j < r.points.length && r.at[j] < end - PLUG && n < ROPE_POINTS - 2; j++) {
      put(r.points[j], false);
    }
    put(pointAt(r, end - PLUG, point), true);
    put(pointAt(r, end, point), true);
    gl.set(`uRopeCount[${i}]`, n);
    gl.set(`uRopeBox[${i * 2}]`, [x0, y0]);
    gl.set(`uRopeBox[${i * 2 + 1}]`, [x1, y1]);
  }

  /** the landed files: rows come in, the counter flips, the row that took the last one flashes */
  function land(t: number, live: boolean, landed: number) {
    if (landed !== landedShown) {
      const animate = live && landedShown >= 0 && landed > landedShown;
      landedShown = landed;
      scene.flaps.set(live ? landed : scene.cards.length, animate);
      for (const el of scene.added) el.style.display = live ? 'none' : '';
      if (live) {
        for (let i = 0; i < landed; i++) {
          for (const row of scene.cards[i].reveals) row.style.display = '';
        }
      }
      if (live && landed > 0 && landed - 1 !== flashed) {
        flashed = landed - 1;
        flash(scene.cards[landed - 1].inlet, t);
      }
    }
    if (flashRow && t >= flashUntil) flash(undefined, t);
  }

  /** the row that just took a file, or a cable, shows in the active fill for a tick */
  function flash(row: HTMLElement | undefined, t: number) {
    if (row) flashUntil = t + TICK;
    if (flashRow === row) return;
    if (flashRow) {
      flashRow.style.background = '';
      flashRow.style.color = '';
    }
    flashRow = row;
    if (row) {
      row.style.background = 'var(--lp-yellow)';
      row.style.color = '#121210';
    }
  }

  function status(t: number, live: boolean) {
    const b = beats;
    let text = scene.done;
    if (live) {
      if (t < b.latch[0]) text = `npx @fumadocs/cli ${scene.args}`;
      else if (t < b.belt) text = 'opening fumadocs-ui';
      else if (phase === 'hold' && t < b.edit)
        text = `fetched ${scene.fetch} from fumadocs.dev/registry`;
      else if (t < b.strikes[0]) text = `fetching ${scene.fetch} from fumadocs.dev/registry`;
      else if (t < b.edit) text = 'rewriting imports';
      else if (t < b.end - 200) text = `editing ${scene.name}`;
    }
    if (text !== shownStatus) {
      shownStatus = text;
      report(root, text);
    }
  }

  function onFrame(time: number) {
    if (!ready || phase !== 'play') return;
    const now = time * 1000;
    const dt = last < 0 ? 0 : Math.min(50, now - last);
    last = now;
    clock += dt;
    // an act waits just before its start until the reader sees what it acts on
    while (act < 4 && clock >= actAt(act)) {
      if (!onScreen(act)) {
        clock = actAt(act) - 1;
        hold();
        return;
      }
      act++;
    }
    if (clock < beats.end) render(clock);
    else rest();
  }

  /** when act `i` starts: the command, the latches once it's typed, the first rewrite once every
   * file has landed, the page once your edit is typed */
  function actAt(i: number): number {
    if (i === 0) return 0;
    if (i === 1) return beats.typed + 60;
    if (i === 2) return beats.strikes[0] ?? beats.edit;
    return beats.page;
  }

  /** the reader is at the stage */
  function arrived(): boolean {
    return middle || (ratios.get(crate) ?? 0) >= CRATE;
  }

  /** act `i` can start: the reader is at what it works on; on a desktop, the rest follows */
  function onScreen(i: number): boolean {
    if (i < 2) return arrived();
    if (desktopQuery.matches) return true;
    if (i === 2) return (ratios.get(scene.editor) ?? 0) >= EDITOR;
    return (ratios.get(scene.preview) ?? 0) >= PAGE;
  }

  /** the run waits, calm: the command typed; every file landed and the counter at its total; or
   * your edit typed */
  function hold() {
    phase = 'hold';
    editCaretKey = '';
    render(clock);
    flash(undefined, clock);
  }

  /** the reader moved: a waiting run goes on once they're at its next act, one not started yet starts
   * once the stage has stayed at the middle of the screen a moment */
  function check() {
    if (phase === 'ready') {
      if (!arrived()) since = 0;
      else {
        since ||= performance.now();
        if (!dwell) dwell = window.setTimeout(arrive, DWELL);
      }
    } else if (phase === 'hold' && onScreen(act)) {
      act++;
      phase = 'play';
      last = -1;
      gl.invalidate();
    }
  }

  function arrive() {
    dwell = 0;
    if (phase !== 'ready' || !arrived()) return;
    // a reader still scrolling on: once they pause, or once they've been here a while
    const now = performance.now();
    const wait = Math.min(PAUSE - (now - scrolled), LONG - (now - since));
    if (wait > 0) {
      dwell = window.setTimeout(arrive, wait);
      return;
    }
    play();
    // the command off screen: it reads typed, the delivery starts
    if ((ratios.get(commandBox) ?? 0) < COMMAND) {
      clock = actAt(1);
      act = 2;
    }
  }

  function rest() {
    phase = 'rest';
    flash(undefined, 0);
    landedShown = -1;
    render(beats.end);
  }

  function play() {
    if (reduce.matches) {
      rest();
      return;
    }
    // the first frame comes with the canvas's next one, so files and machine start together. It
    // starts where the reader is at the command: a click on it, or their reaching the stage
    phase = 'play';
    clock = 0;
    act = 1;
    last = -1;
    landedShown = -1;
    flashed = -1;
    editCaretKey = '';
    beatTab = -1;
    for (const strike of scene.strikes) strike.key = '';
    gl.invalidate();
  }

  function show(index: number) {
    const next = scenes[index];
    if (next === scene) return;
    // the leaving scene rests on its finished state for the next time
    phase = 'rest';
    landedShown = -1;
    render(beats.end);
    scene = next;
    for (let i = 0; i < scenes.length; i++) {
      const on = scenes[i] === scene;
      scenes[i].cell.inert = !on;
      scenes[i].column.inert = !on;
      scenes[i].counter.hidden = !on;
      chips[i].ariaPressed = String(on);
    }
    for (const s of scenes) s.command.inert = s !== scene;
    layout();
  }

  function onTab(event: Event) {
    const tab = event.currentTarget as HTMLButtonElement;
    const i = Number(tab.dataset.tab);
    if (event instanceof KeyboardEvent) {
      const step =
        event.key === 'ArrowDown' || event.key === 'ArrowRight'
          ? 1
          : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
            ? -1
            : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = scene.tabs[(i + step + scene.tabs.length) % scene.tabs.length];
      next.focus();
      pick(scene, Number(next.dataset.tab));
      return;
    }
    pick(scene, i);
  }

  function onPlay(event: MouseEvent) {
    const index = Number((event.currentTarget as HTMLElement).dataset.play);
    show(index);
    play();
  }

  // where the reader is, without reading the layout as they scroll: the stage in the band from the
  // menu down to the middle of the screen, and how much of each part an act waits for is on screen,
  // between the menu and the status bar
  const style = getComputedStyle(root);
  const menu = Number.parseFloat(style.getPropertyValue('--lp-menu-h')) || 0;
  const bar = Number.parseFloat(style.getPropertyValue('--lp-status-h')) || 0;
  const atMiddle = new IntersectionObserver(
    (entries) => {
      middle = entries[entries.length - 1].isIntersecting;
      // the canvas pauses itself off screen, the clock skips that time
      last = -1;
      check();
    },
    { rootMargin: `-${menu}px 0px -50% 0px` },
  );
  const parts = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      check();
    },
    {
      rootMargin: `-${menu}px 0px -${bar}px 0px`,
      threshold: [0, PAGE, CRATE, COMMAND, EDITOR, 1],
    },
  );
  // the reader's last scroll, its time only: no layout read
  const onScroll = (event: Event) => {
    scrolled = event.timeStamp;
  };

  const theme = new MutationObserver(colours);
  resize.observe(root);
  for (const s of scenes) {
    resize.observe(s.tree);
    resize.observe(s.list.firstElementChild!);
    resize.observe(s.editor);
    resize.observe(s.preview);
    // a scroll event comes before this frame paints: the cables follow their rows in it
    s.list.addEventListener('scroll', layout, { passive: true });
  }
  void document.fonts.ready.then(() => {
    if (!disposed) layout();
  });
  theme.observe(html, { attributes: true, attributeFilter: ['class'] });
  atMiddle.observe(root);
  parts.observe(crate);
  parts.observe(commandBox);
  for (const s of scenes) {
    parts.observe(s.editor);
    parts.observe(s.preview);
  }
  addEventListener('scroll', onScroll, { passive: true });
  replay.addEventListener('click', play);
  for (const chip of chips) chip.addEventListener('click', onPlay);
  for (const s of scenes) {
    for (const tab of s.tabs) {
      tab.addEventListener('click', onTab);
      tab.addEventListener('keydown', onTab);
    }
  }
  ready = true;
  colours();
  layout();
  // every load waits for the reader, the figure on screen or not
  if (!reduce.matches) {
    phase = 'ready';
    landedShown = -1;
    render(0);
  }

  return () => {
    disposed = true;
    atMiddle.disconnect();
    parts.disconnect();
    clearTimeout(dwell);
    removeEventListener('scroll', onScroll);
    resize.disconnect();
    theme.disconnect();
    replay.removeEventListener('click', play);
    for (const chip of chips) chip.removeEventListener('click', onPlay);
    for (const s of scenes) {
      s.list.removeEventListener('scroll', layout);
      for (const tab of s.tabs) {
        tab.removeEventListener('click', onTab);
        tab.removeEventListener('keydown', onTab);
      }
      s.flaps.destroy();
    }
    gl.destroy();
  };
}

/** the lid: a pressure pop, the swing on its ram, a knock on the stop */
function lidAngle(t: number): number {
  if (t <= 0) return 0;
  if (t < 140) return 0.05 * Math.sin((t / 140) * Math.PI);
  const u = (t - 140) / 560;
  if (u < 1) return LID_OPEN * inOutQuad(u);
  const v = (t - 700) / 300;
  if (v >= 1) return LID_OPEN;
  return LID_OPEN - 0.09 * Math.exp(-4 * v) * Math.sin(v * Math.PI * 3);
}

/** the reel's motor: it spins up, runs, and slows down before the folder */
function reelIn(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const a = 0.18;
  if (u < a) return (u * u) / (2 * a * (1 - a));
  if (u > 1 - a) return 1 - ((1 - u) * (1 - u)) / (2 * a * (1 - a));
  return (u - a / 2) / (1 - a);
}

function inOutQuad(u: number) {
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
}

/** an underdamped spring from 0 to 1: it overshoots ~7% and settles */
function spring(u: number): number {
  if (u >= 1) return 1;
  if (u <= 0) return 0;
  return 1 - Math.exp(-4.6 * u) * (Math.cos(5.39 * u) + 0.853 * Math.sin(5.39 * u));
}

/** the plug pushed home: a firm push that bottoms out with a small rebound */
function springOut(u: number): number {
  if (u >= 1) return 1;
  if (u <= 0) return 0;
  return 1 - Math.exp(-6 * u) * Math.cos(9 * u);
}

function bezier(a: number, b: number, c: number, t: number) {
  const s = 1 - t;
  return s * s * a + 2 * s * t * b + t * t * c;
}

function clamp(v: number) {
  return Math.min(1, Math.max(0, v));
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function rgb(value: string): [number, number, number] {
  const hex = value.trim().slice(1);
  const n = Number.parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
