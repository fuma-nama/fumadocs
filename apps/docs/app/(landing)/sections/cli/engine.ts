import { cubicBezier } from 'motion/react';
import { ditherKeyframes } from '../../lib/dither';
import { createShaderCanvas, cssRgb } from '../../lib/gl';
import { clamp, mix, type Rect, rectIn, settle, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { isDark, onTheme } from '../../lib/theme';
import {
  bezier,
  type Cable,
  CARDS,
  fragment,
  PLUG,
  pointAt,
  RADIUS,
  ROPE_POINTS,
  type Route,
  routes,
  type Vec3,
} from './scene';

/** CSS px: the camera's distance from the wall, and depths toward the viewer */
const CAM = 2400;
const CRATE_Z = 200;
const CHAIN_Z = 44;
const HOPPER_Z = 40;
const WALL = 8;
const LID_T = 30;
const LID_OPEN = 1.62;
const LATCH_OPEN = 2.15;
const LIGHT = normalize([-0.25, -0.42, 0.87]);
/** a riser's gripper spacing; px per ms on a riser and on a beam; spin-up and spin-down, ms */
const PITCH = 36;
const SPEED = 1.1;
const BEAM_SPEED = 2.4;
const ACCEL = 380;
const DECEL = 460;
/** whole pitches, so a file rising out of the crate meets its gripper; jaws clear the sprockets */
const RISE = 3 * PITCH;
const JAW = 20;
const SETTLE = 48;
/** a riser steps a tick for its first files, then shorter each step; a file slides off fast enough
 * to clear the next before that one rises into its row */
const SLOW = 3;
const RAMP = 0.7;
const QUICK = 52;
const STEP = 0.32;
const SLIDE = 2.2;
const SLIDE_START = 0.16;
const SLIDE_Z = 58;
/** a beam's lift, its last part a pop into the jaw; a file's fall, start speed and pull */
const LIFT = 300;
const POP = 40;
const FALL = 2;
const PULL = 0.004;
const REEL = 8;
const WIND = 1.6;
/** shares on screen, and ms: a reader flinging past doesn't start the run */
const CRATE = 0.5;
const DWELL = 200;
const PAUSE = 100;
const LONG = 300;
const EDITOR = 0.6;
const PAGE = 0.25;
const COMMAND = 0.5;
const TYPE = 60;

const ease = cubicBezier(...settle);
/** the frame round your change: shown as it dithers in, dithered out a second later */
const MARK = ditherKeyframes(2).reverse();
for (const frame of MARK) frame.opacity = 1;

interface Card {
  el: HTMLElement;
  w: number;
  h: number;
  scale: number;
  /** how far a riser's file slides until the hopper's front hides it */
  slide: number;
  inlet: HTMLElement | undefined;
  reveals: HTMLElement[];
  at: string;
}

/** an import rewired: the old line struck, the new one typed */
interface Strike {
  tab: number;
  diff: HTMLElement;
  from: HTMLElement;
  cut: HTMLElement;
  after: string;
  state: string;
}

export function createCli(root: HTMLElement): () => void {
  // made before the canvas's own observer, so a canvas that resizes with the stage draws after this
  // layout, in the same frame; its first round only reports the sizes the setup has just measured
  let observed = false;
  const resize = new ResizeObserver(() => {
    if (observed) layout();
    observed = true;
  });
  const shader = createShaderCanvas(root.querySelector('canvas')!, { fragment, onFrame });
  if (!shader) return () => {};
  const gl = shader;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = matchMedia('(min-width: 1024px)');
  const find = (name: string, from: ParentNode = root) =>
    from.querySelector<HTMLElement>(`[data-${name}]`)!;
  // the runs to pick and their command sit in the figure's header, above the stage
  const figure = root.closest('[data-figure]') ?? root;
  const caret = find('caret', figure);
  const crate = find('crate');
  const label = find('label');
  const plate = find('plate');
  const replay = find('replay', figure);
  const commandBox = replay.parentElement!;
  const chips = figure.querySelectorAll<HTMLButtonElement>('[data-play]');
  const editCaret = find('edit-caret');
  /** each run's counter, made the first time it shows, after the stage is measured */
  const counters = new Map<HTMLElement, Flaps>();

  /** run `index`'s parts, in the stage and in the header */
  function load(index: number) {
    const own = `[data-scene="${index}"]`;
    const cell = root.querySelector<HTMLElement>(`[data-tree-cell]${own}`)!;
    const tree = find('tree', cell);
    const rows = new Map<string, HTMLElement>();
    for (const el of tree.querySelectorAll<HTMLElement>('[data-path]'))
      rows.set(el.dataset.path!, el);
    // a folder takes its files at its trigger
    const row = (path: string) => {
      const el = rows.get(path);
      const trigger = el?.firstElementChild;
      return trigger instanceof HTMLButtonElement ? trigger : el;
    };
    const cards: Card[] = [];
    for (const el of root.querySelectorAll<HTMLElement>(`[data-card]${own}`)) {
      const reveals: HTMLElement[] = [];
      for (const path of el.dataset.reveals!.split(' ')) {
        const at = rows.get(path);
        if (at?.dataset.added !== undefined) reveals.push(at);
      }
      const inlet = row(el.dataset.card!);
      cards.push({ el, w: 0, h: 0, scale: 1, slide: 0, inlet, reveals, at: '' });
    }
    const editor = root.querySelector<HTMLElement>(`[data-editor]${own}`)!;
    const tabs = [...editor.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const panels = [...editor.querySelectorAll<HTMLElement>('[data-panel]')];
    const tabOf = (el: Element) => panels.indexOf(el.closest<HTMLElement>('[data-panel]')!);
    const strikes: Strike[] = [];
    for (const diff of editor.querySelectorAll<HTMLElement>('[data-rewire]')) {
      const cut = find('cut', diff);
      const from = find('from', diff);
      strikes.push({ tab: tabOf(diff), diff, from, cut, after: cut.dataset.new!, state: '' });
    }
    // a cable per file whose imports now resolve into your project
    const cables: { tab: number; row: HTMLElement }[] = [];
    for (let i = 0; i < tabs.length; i++) {
      const target = tabs[i].dataset.target;
      if (target) cables.push({ tab: i, row: row(target)! });
    }
    const command = figure.querySelector<HTMLElement>(`[data-command]${own}`)!;
    const editLine = find('edit-line', editor);
    const page = find('page', editor);
    return {
      index,
      command,
      line: command.textContent!,
      /** the caret's x and y after each character of the command */
      ends: new Float32Array(command.children.length * 2 + 2),
      done: cell.dataset.done!,
      fetch: cell.dataset.fetch!,
      component: cell.dataset.component!,
      editor,
      tabs,
      panels,
      title: find('title', editor),
      /** the browser's tab, the tab of the file you edit, and the one shown */
      browser: tabOf(page),
      open: tabOf(editLine),
      shown: tabs.findIndex((tab) => tab.ariaSelected === 'true'),
      tree,
      list: find('list', tree),
      counter: root.querySelector<HTMLElement>(`[data-counter]${own}`)!,
      added: [...tree.querySelectorAll<HTMLElement>('[data-added]')],
      cards,
      strikes,
      cables,
      editCut: find('cut', editLine),
      page,
      after: find('after', editor),
      mark: find('mark', page),
      spinner: editor.querySelector<SVGSVGElement>('[data-spinner]')!,
      edited: page.hasAttribute('data-edited'),
    };
  }
  let scene = load(0);

  // world points are stage px, z toward the viewer; the camera is level with the stage's top
  const stage = [0, 0];
  let footX = 0;
  /** a riser going up, or a phone's beam going right; the files hang opposite `side` */
  const chain = { tail: [0, 0], dir: [0, -1], side: [1, 0], length: 1 };
  let beam = false;
  let pitch = PITCH;
  let speed = SPEED;
  let hopper: Vec3 = [0, 0, 0];
  let mouth = 0;
  let inside: Vec3 = [0, 0, 0];
  let slideFrom: Vec3 = [0, 0, 0];
  let band = 0;
  let fall = 0;
  const wires: Cable[] = [];
  let beats = schedule();

  let phase: 'rest' | 'ready' | 'play' | 'hold' = 'rest';
  let clock = 0;
  /** the next act: 0 the command, 1 the delivery, 2 the rewrites and your edit, 3 the page */
  let act = 0;
  let last = -1;
  let middle = false;
  const ratios = new WeakMap<Element, number>();
  let dwell = 0;
  let since = 0;
  let scrolled = 0;
  let landedShown = -1;
  let flashed = -1;
  let flashUntil = 0;
  let flashRow: HTMLElement | undefined;
  let caretMode = '';
  let caretAt = '';
  let typedShown = -1;
  let editCaretKey = '';
  /** the tab the play last turned to: a tab you pick mid-play stays until the next beat */
  let beatTab = -1;
  const scratch: Vec3 = [0, 0, 0];
  const point: Vec3 = [0, 0, 0];
  /** the carried files' depths, four to a uniform */
  const depths: [number, number, number, number][] = [];
  for (let i = 0; i < CARDS / 4; i++) depths.push([0, 0, 0, 0]);

  function project(x: number, y: number, z: number): Vec3 {
    const k = CAM / (CAM - z);
    scratch[0] = footX + (x - footX) * k;
    scratch[1] = y * k;
    scratch[2] = k;
    return scratch;
  }

  function unproject(x: number, y: number, z: number): Vec3 {
    const k = CAM / (CAM - z);
    return [footX + (x - footX) / k, y / k, z];
  }

  /** screen bounds of a world box and its shadow on the wall */
  function bounds(min: Vec3, max: Vec3) {
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
    return [x0 - 6, y0 - 6, x1 + 6, y1 + 6];
  }

  /** a box whose front face, at z, frames `rect`; the shader leaves `rect` open */
  function housing(name: string, rect: Rect, z: number, depth: number, border: number) {
    gl.set(name, [rect.x, rect.y, rect.x + rect.w, rect.y + rect.h]);
    const a = unproject(rect.x - border, rect.y - border, z);
    const b = unproject(rect.x + rect.w + border, rect.y + rect.h + border, z);
    gl.set(`${name}C`, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z - depth]);
    gl.set(`${name}B`, [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2, depth]);
  }

  function colours() {
    const style = getComputedStyle(document.documentElement);
    const night = isDark();
    const paper = cssRgb(style.getPropertyValue('--lp-paper'));
    const ink = cssRgb(style.getPropertyValue('--lp-ink'));
    gl.set('uLit', night ? ink : paper);
    gl.set('uShade', night ? paper : ink);
    gl.set('uPen', ink);
    // shadows are dots in the tone of the sheet's lines
    const line = night ? 0.75 : 0.82;
    gl.set('uLine', [
      mix(paper[0], ink[0], line),
      mix(paper[1], ink[1], line),
      mix(paper[2], ink[2], line),
    ]);
    gl.set('uAccent', cssRgb(style.getPropertyValue(night ? '--lp-orange' : '--lp-sun')));
    gl.invalidate();
  }

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

  function windTime(c: Cable): number {
    return (c.sealed.length - c.branch) / WIND + 160;
  }

  /** selected, struck, the new line typed, then a moment to read the diff */
  function strikeTime(s: Strike) {
    return 300 + s.after.length * 70 + 640;
  }

  function schedule() {
    const typed = TYPE + scene.command.children.length * 25;
    const latch = [typed + 120, typed + 120 + TICK];
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
      const last = rise + (n - 1) * pitch + chain.length;
      const drop = (Math.sqrt(FALL * FALL + 2 * PULL * fall) - FALL) / PULL;
      stop = belt + ACCEL + (last - (v * ACCEL) / 2) / v;
      for (let i = 0; i < n; i++) {
        release.push(stop - ((n - 1 - i) * pitch) / v);
        landed.push(release[i] + drop);
      }
      feed = release[0];
      distance = last + (v * DECEL) / 2;
    } else {
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
      const c = scene.cables.findIndex((cable) => cable.tab === strike.tab);
      if (c >= 0 && scene.strikes[i + 1]?.tab !== strike.tab) {
        plugs[c] = t + 300 + strike.after.length * 70 + 60;
        free = wires[c] ? plugs[c] + windTime(wires[c]) + 260 : t + strikeTime(strike);
      }
      t += strikeTime(strike) + 160;
    }
    const edit = Math.max(free, t) + 120;
    // typed within the run's last beat: a long edit types faster
    const editFor = Math.min(scene.editCut.dataset.new!.length * 40, 240);
    // the dev server reloads as your edit is saved: the browser's tab spins while the code still
    // shows, then over the old page a moment, until your change dithers in with a frame round it
    const reload = edit + 300 + editFor + 60;
    const page = reload + 2 * TICK;
    return {
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
      reload,
      page,
      change: page + 2 * TICK,
      end: page + 5 * TICK + 200,
    };
  }

  function layout() {
    const s = root.getBoundingClientRect();
    if (s.width === 0) return;
    const desktop = desktopQuery.matches;
    footX = s.width * (desktop ? 0.56 : 0.5);
    gl.set('uEye', [footX, 0, CAM]);
    gl.set('uLight', LIGHT);
    gl.set('uCell', 2);
    const chars = scene.command.children as HTMLCollectionOf<HTMLElement>;
    const caretHeight = caret.offsetHeight;
    for (let i = 0; i <= chars.length; i++) {
      const char = chars[Math.max(i - 1, 0)];
      scene.ends[i * 2] = i === 0 ? char.offsetLeft : char.offsetLeft + char.offsetWidth;
      scene.ends[i * 2 + 1] = char.offsetTop + (char.offsetHeight - caretHeight) / 2;
    }
    caretAt = '';
    typedShown = -1;

    // every row in, to find where the cables plug; the play hides them again
    for (const el of scene.added) el.style.display = '';

    // the crate's front face is its slot; a wide stage's bigger crate stays a box
    const slot = rectIn(crate, s);
    const depth = desktop ? Math.max(64, Math.round(slot.w * 0.37)) : 80;
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
    const tag = rectIn(label, s);
    housing('uLabel', tag, CRATE_Z + 3, 3, 6);
    // the sockets stand above the corner caps, right of the label; the right one's cable clears it
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

    const sign = rectIn(plate, s);
    housing('uDrive', sign, CHAIN_Z + 22, 18, 8);
    const counter = rectIn(scene.counter, s);
    housing('uCounter', counter, HOPPER_Z + 24, 4, 5);
    const treeBox = rectIn(scene.tree, s);
    // placed by its front face: far down a tall stage the perspective would move it off its window
    const middle = counter.x + counter.w / 2;
    const face = HOPPER_Z + 22;
    hopper = unproject(middle, counter.y - 14, face);
    hopper[2] = HOPPER_Z;
    const neck = unproject(middle, treeBox.y, face);
    // wide enough to take a file falling flat, inside the gutters; on a phone, clear of the ram
    const gutter = Number.parseFloat(getComputedStyle(root).paddingLeft);
    const lip = HOPPER_Z + 25;
    const ram = project(centre[0] + size[0] + 16, 0, CRATE_Z - 30)[0];
    const left = desktop ? gutter : Math.max(gutter, ram + 8);
    const atHopper = CAM / (CAM - HOPPER_Z);
    const halfWidth = Math.min(
      (counter.w + (desktop ? 80 : 40)) / 2 / atHopper,
      unproject(s.width - gutter, 0, lip)[0] - hopper[0] - 4,
      hopper[0] - unproject(left, 0, lip)[0] - 4,
    );
    const spout = Math.min(counter.w / 2 + 6, halfWidth);
    mouth = halfWidth * 2 * atHopper;
    gl.set('uFrame', [gutter, s.width - gutter]);
    gl.set('uHopper', hopper);
    gl.set('uHopperSize', [halfWidth, spout, neck[1] - hopper[1], 22]);

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
      // files let go this far below the head sprocket, between its teeth and your project's window
      chain.length = tail[1] - head[1] - 33;
      gl.set('uDriveGear', [unproject(sign.x + sign.w + 8, 0, front)[0] - 12, head[1], front]);
    }
    chain.tail = [tail[0], tail[1]];
    gl.set('uChain', [tail[0], tail[1], chain.dir[0], chain.dir[1]]);
    gl.set('uChainLength', [Math.hypot(head[0] - tail[0], head[1] - tail[1]), CHAIN_Z]);
    gl.set('uChainSide', chain.side);
    inside = [centre[0], top + 30, centre[2]];
    // wide files shrink to stay inside the gutters, also on their way up from the crate, nearer
    const [tailX, , k] = project(tail[0], tail[1], CHAIN_Z);
    const headX = project(head[0], head[1], CHAIN_Z)[0];
    const [crateX, , near] = project(inside[0], inside[1], inside[2]);
    const climb = Math.min(crateX, project(tail[0], tail[1], inside[2])[0]) - gutter - 4;
    const reach = s.width - gutter - 4 - headX;
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
    pitch = beam ? widest + 4 + POP : PITCH;
    speed = beam ? BEAM_SPEED : SPEED;
    gl.set('uPitch', pitch);
    gripper(chain.length);
    if (beam) {
      band = 0;
      for (const card of scene.cards) band = Math.max(band, card.h * card.scale);
      fall = hopper[1] + 16 - point[1];
    } else {
      // a sliding file is gone once its left edge passes the hopper's front edge, at its bottom
      const [jawX, jawY] = project(point[0], point[1], CHAIN_Z);
      slideFrom = unproject(jawX, jawY, SLIDE_Z);
      const bottom = project(0, slideFrom[1] + scene.cards[0].h, SLIDE_Z)[1];
      const y = unproject(0, bottom, face)[1];
      const taper = clamp((y - hopper[1]) / (neck[1] - hopper[1]));
      const edge = hopper[0] - mix(halfWidth, spout, taper);
      const inlet = unproject(project(edge, y, face)[0], 0, SLIDE_Z)[0];
      for (const card of scene.cards) card.slide = inlet + card.w * card.scale - slideFrom[0] + 1;
    }

    const editor = rectIn(scene.editor, s);
    editCaretKey = '';
    const range = document.createRange();
    range.selectNodeContents(scene.editCut);
    const cut = range.getBoundingClientRect();

    // the cables' runs to the floor swing out toward the viewer, under your project's window
    wires.length = 0;
    if (desktop) {
      const lanes = [treeBox.x + treeBox.w + 10, treeBox.x + treeBox.w + 21];
      const fronts = [CRATE_Z + 40, CRATE_Z + 58];
      const view = rectIn(scene.list, s);
      for (let i = 0; i < scene.cables.length; i++) {
        const tab = rectIn(scene.tabs[scene.cables[i].tab], s);
        const reel: Vec3 = [editor.x - REEL - 2, tab.y + tab.h / 2, WALL];
        const row = rectIn(scene.cables[i].row, s);
        // a row scrolled out of the list keeps its plug on the list's edge
        const plug = clamp(row.y + row.h / 2, view.y + 10, view.y + view.h - 10);
        const target: Vec3 = [treeBox.x + treeBox.w + 3, plug, WALL];
        wires.push(
          routes({
            reel: [reel[0] - REEL, reel[1], WALL],
            lane: lanes[i],
            wall: WALL,
            floor,
            front: fronts[i],
            forward: unproject(project(lanes[i], 0, WALL)[0], 0, fronts[i])[0],
            socket: [sockets[i][0], sockets[i][1], CRATE_Z + 2],
            target,
          }),
        );
        gl.set(`uReel[${i}]`, reel);
        gl.set(`uJack[${i}]`, [target[0] - 3, target[1], WALL]);
      }
    }
    gl.set('uCables', wires.length);

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
    const windows = [treeBox, editor];
    for (let i = 0; i < windows.length; i++) {
      const r = windows[i];
      gl.set(`uWindow[${i}]`, [r.x, r.y, r.x + r.w, r.y + r.h]);
    }
    // written once the stage is read, so reading it never waits for a layout
    editCaret.style.width = `${cut.width / Math.max(scene.editCut.textContent!.length, 1)}px`;
    editCaret.style.height = `${cut.height}px`;

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

  function render(t: number) {
    const live = phase !== 'rest';
    const b = beats;

    // characters not typed yet keep their place, unseen
    const length = scene.command.children.length;
    const shown = live ? Math.round(clamp((t - TYPE) / (b.typed - TYPE)) * length) : length;
    if (shown !== typedShown) {
      typedShown = shown;
      if (shown < length) scene.command.style.setProperty('--typed', String(shown));
      else scene.command.style.removeProperty('--typed');
    }
    const typing = !live || t > b.lid ? 'none' : t < TYPE || t > b.typed ? 'blink' : 'solid';
    if (typing !== caretMode) {
      caretMode = typing;
      caret.style.visibility = typing === 'none' ? 'hidden' : 'visible';
      // a hidden caret's animation would still tick
      caret.classList.toggle('lp-caret', typing === 'blink');
    }
    const at = `translate(${scene.ends[shown * 2].toFixed(1)}px, ${scene.ends[shown * 2 + 1].toFixed(1)}px)`;
    if (at !== caretAt) {
      caretAt = at;
      caret.style.transform = at;
    }

    gl.set('uLatch', [
      live ? LATCH_OPEN * spring(clamp((t - b.latch[0]) / 260)) : LATCH_OPEN,
      live ? LATCH_OPEN * spring(clamp((t - b.latch[1]) / 260)) : LATCH_OPEN,
    ]);
    gl.set('uLid', live ? lidAngle(t - b.lid) : LID_OPEN);

    const distance = live ? travel(t) : b.travel;
    gl.set('uPhase', distance);
    gl.set('uSpin', distance / 13);
    let holes = 0;
    let landed = 0;
    const rise = beam ? LIFT : RISE;
    for (let i = 0; i < scene.cards.length; i++) {
      const card = scene.cards[i];
      const s = distance - rise - i * pitch;
      const out = t - b.release[i];
      if (live && t >= b.landed[i]) landed++;
      if (!live || s <= -rise || t >= b.landed[i]) {
        if (card.el.style.visibility !== '') card.el.style.visibility = '';
        continue;
      }
      let anchor = beam ? card.w / 2 : card.w;
      let fit = 1;
      let x: number;
      let y: number;
      let z = CHAIN_Z;
      if (out >= 0 && beam) {
        const u = out / (b.landed[i] - b.release[i]);
        gripper(chain.length);
        x = mix(point[0], hopper[0], ease(u));
        y = point[1] + FALL * out + (PULL * out * out) / 2;
        z = mix(CHAIN_Z, HOPPER_Z, u);
        fit = mix(1, Math.min(1, (mouth - 12) / (card.w * card.scale)), ease(u));
      } else if (out >= 0) {
        const v = b.slides[i];
        const start = b.starts[i];
        x = slideFrom[0] + (out < start ? (v * out * out) / (2 * start) : v * (out - start / 2));
        y = slideFrom[1];
        z = SLIDE_Z;
      } else if (s < 0 && beam) {
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
        depths[Math.floor(holes / 4)][holes % 4] = z;
        holes++;
      }
    }
    for (let i = 0; i < depths.length; i++) gl.set(`uCardZ[${i}]`, depths[i]);
    gl.set('uCards', holes);

    if (landed !== landedShown) {
      const animate = live && landedShown >= 0 && landed > landedShown;
      landedShown = landed;
      if (!counters.has(scene.counter)) counters.set(scene.counter, createFlaps(scene.counter));
      counters.get(scene.counter)!.set(live ? landed : scene.cards.length, animate);
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

    // the page until the first rewrite, each file rewired, the one you edit, the page again
    if (live) {
      let tab = scene.browser;
      for (let i = 0; i < scene.strikes.length; i++)
        if (t >= b.strikes[i]) tab = scene.strikes[i].tab;
      if (t >= b.edit) tab = scene.open;
      if (t >= b.page) tab = scene.browser;
      if (tab !== beatTab) {
        beatTab = tab;
        pick(tab);
      }
    }

    let writing: Strike | undefined;
    for (let i = 0; i < scene.strikes.length; i++) {
      const strike = scene.strikes[i];
      const u = live ? t - b.strikes[i] : Infinity;
      if (u >= 220 && u < strikeTime(strike)) writing = strike;
      const text = u < 300 ? '' : strike.after.slice(0, 1 + Math.floor((u - 300) / 70));
      const selected = u >= 60 && u < 220;
      const state = `${u >= 220 ? 'diff' : ''}|${selected ? 'selected' : ''}|${text}`;
      if (state === strike.state) continue;
      strike.state = state;
      strike.diff.toggleAttribute('data-diff', u >= 220);
      highlight(strike.from, selected);
      if (strike.cut.textContent !== text) strike.cut.textContent = text;
    }

    const spin = [0, 0];
    const plugged = [0, 0];
    for (let i = 0; i < wires.length; i++) {
      const c = wires[i];
      const u = live ? t - b.plugs[i] : Infinity;
      const wind = windTime(c);
      let route = c.sealed;
      let end = c.sealed.length;
      if (u >= 0 && u < wind - 160) {
        end = c.sealed.length - (c.sealed.length - c.branch) * reelIn(u / (wind - 160));
      } else if (u >= 0) {
        route = c.done;
        end = c.done.length - (c.done.length - c.turn) * (1 - springOut(clamp((u - wind) / 150)));
        plugged[i] = 1;
      }
      spin[i] = (c.sealed.length - end) / REEL;
      upload(i, route, end);
      if (u >= wind + 150 && u < wind + 150 + TICK) flash(scene.cables[i].row, t);
    }
    gl.set('uReelSpin', spin);
    gl.set('uJackOn', plugged);

    const e = t - b.edit;
    const cut = scene.editCut;
    const next = cut.dataset.new!;
    let value = live && e < 300 ? cut.dataset.old! : next;
    if (live && e >= 300 && e < 300 + b.editFor)
      value = next.slice(0, 1 + Math.floor(((e - 300) / b.editFor) * next.length));
    if (cut.textContent !== value) cut.textContent = value;
    highlight(cut, live && e >= 120 && e < 300);
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
        // a layout read, so only when its text changed
        const origin = root.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(target);
        const rects = range.getClientRects();
        const last = rects[rects.length - 1] ?? target.getBoundingClientRect();
        const x = last.right - origin.left;
        const y = last.top - origin.top;
        editCaret.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    }
    const browser = scene.tabs[scene.browser];
    const reloading = live && t >= b.reload && t < b.change;
    browser.toggleAttribute('data-reloading', reloading);
    highlight(browser, reloading);
    const turn = reloading ? `${Math.floor((t - b.reload) / (TICK / 2)) * 45}deg` : '';
    if (scene.spinner.style.rotate !== turn) scene.spinner.style.rotate = turn;
    const edited = !live || t >= b.change;
    if (edited !== scene.edited) {
      scene.edited = edited;
      scene.page.toggleAttribute('data-edited', edited);
      if (edited && live) {
        scene.after.animate(ditherKeyframes(2), { duration: 3 * TICK });
        scene.mark.animate(MARK, { delay: 8 * TICK, duration: 3 * TICK, fill: 'backwards' });
      }
    }

    let status = scene.done;
    if (live) {
      if (t < b.latch[0]) status = scene.line;
      else if (t < b.belt) status = 'opening fumadocs-ui';
      else if (phase === 'hold' && t < b.edit)
        status = `fetched ${scene.fetch} from fumadocs.dev/registry`;
      else if (t < b.strikes[0]) status = `fetching ${scene.fetch} from fumadocs.dev/registry`;
      else if (t < b.edit) status = 'rewriting imports';
      else if (t < b.end - 200) status = `editing ${scene.component}`;
    }
    report(root, status);
    gl.invalidate();
  }

  function pick(i: number) {
    if (scene.shown === i) return;
    scene.shown = i;
    for (let k = 0; k < scene.tabs.length; k++) {
      scene.tabs[k].ariaSelected = String(k === i);
      scene.panels[k].inert = k !== i;
    }
    scene.title.textContent = scene.tabs[i].dataset.file!;
  }

  /** a file's grip `s` along the chain: its top right corner on a riser, top middle on a beam */
  function gripper(s: number) {
    point[0] = chain.tail[0] + chain.dir[0] * s - chain.side[0] * JAW;
    point[1] = chain.tail[1] + chain.dir[1] * s - chain.side[1] * JAW + (beam ? 2 : -12);
    point[2] = CHAIN_Z;
  }

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

  function flash(row: HTMLElement | undefined, t: number) {
    if (row) flashUntil = t + TICK;
    if (flashRow === row) return;
    if (flashRow) highlight(flashRow, false);
    flashRow = row;
    if (row) highlight(row, true);
  }

  function onFrame(time: number) {
    if (phase !== 'play') return;
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

  function actAt(i: number): number {
    if (i === 0) return 0;
    if (i === 1) return beats.typed + 60;
    if (i === 2) return beats.strikes[0];
    return beats.page;
  }

  function arrived(): boolean {
    return middle || (ratios.get(crate) ?? 0) >= CRATE;
  }

  /** on a desktop the rest of the run follows its start */
  function onScreen(i: number): boolean {
    if (i < 2) return arrived();
    if (desktopQuery.matches) return true;
    return (ratios.get(scene.editor) ?? 0) >= (i === 2 ? EDITOR : PAGE);
  }

  function hold() {
    phase = 'hold';
    editCaretKey = '';
    render(clock);
    flash(undefined, clock);
  }

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
    // the first frame comes with the canvas's next one, so files and machine start together
    phase = 'play';
    clock = 0;
    act = 1;
    last = -1;
    landedShown = -1;
    flashed = -1;
    editCaretKey = '';
    beatTab = -1;
    gl.invalidate();
  }

  function show(index: number) {
    if (index === scene.index) return;
    // the leaving run rests on its finished state for the next time
    rest();
    for (const el of figure.querySelectorAll<HTMLElement>('[data-scene]'))
      el.inert = el.dataset.scene !== String(index);
    for (const chip of chips) chip.ariaPressed = String(chip.dataset.play === String(index));
    scene = load(index);
    layout();
  }

  function onTab(event: Event) {
    let i = scene.tabs.indexOf(event.currentTarget as HTMLButtonElement);
    if (event instanceof KeyboardEvent) {
      const key = event.key;
      const step =
        key === 'ArrowDown' || key === 'ArrowRight'
          ? 1
          : key === 'ArrowUp' || key === 'ArrowLeft'
            ? -1
            : 0;
      if (step === 0) return;
      event.preventDefault();
      i = (i + step + scene.tabs.length) % scene.tabs.length;
      scene.tabs[i].focus();
    }
    pick(i);
  }

  function onPlay(event: MouseEvent) {
    show(Number((event.currentTarget as HTMLElement).dataset.play));
    play();
  }

  // where the reader is, without reading the layout as they scroll: the stage in the band from the
  // menu to the middle of the screen, and each part's share between the menu and the status bar
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
  const listeners = new AbortController();
  const signal = listeners.signal;

  resize.observe(root);
  atMiddle.observe(root);
  parts.observe(crate);
  parts.observe(commandBox);
  // both runs' windows: your project's list, whose folders move the rows the cables reach
  for (const el of root.querySelectorAll('[data-tree], [data-editor]')) resize.observe(el);
  for (const el of root.querySelectorAll('[data-editor]')) parts.observe(el);
  for (const list of root.querySelectorAll('[data-list]')) {
    resize.observe(list.firstElementChild!);
    // a scroll event comes before this frame paints: the cables follow their rows in it
    list.addEventListener('scroll', layout, { passive: true, signal });
  }
  for (const tab of root.querySelectorAll('[data-tab]')) {
    tab.addEventListener('click', onTab, { signal });
    tab.addEventListener('keydown', onTab, { signal });
  }
  addEventListener('scroll', onScroll, { passive: true, signal });
  replay.addEventListener('click', play, { signal });
  for (const chip of chips) chip.addEventListener('click', onPlay, { signal });
  if (document.fonts.status !== 'loaded') {
    void document.fonts.ready.then(() => {
      if (!signal.aborted) layout();
    });
  }
  const stopTheme = onTheme(colours);
  colours();
  // every load waits for the reader, the figure on screen or not
  if (!reduce.matches) phase = 'ready';
  layout();

  return () => {
    listeners.abort();
    atMiddle.disconnect();
    parts.disconnect();
    resize.disconnect();
    clearTimeout(dwell);
    stopTheme();
    for (const flaps of counters.values()) flaps.destroy();
    gl.destroy();
  };
}

function highlight(el: HTMLElement, on: boolean) {
  const background = on ? 'var(--lp-yellow)' : '';
  if (el.style.background === background) return;
  el.style.background = background;
  el.style.color = on ? '#121210' : '';
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
  return 1 - Math.exp(-4.6 * u) * (Math.cos(5.39 * u) + 0.853 * Math.sin(5.39 * u));
}

/** the plug pushed home: a firm push that bottoms out with a small rebound */
function springOut(u: number): number {
  if (u >= 1) return 1;
  return 1 - Math.exp(-6 * u) * Math.cos(9 * u);
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** a flip takes this long, the top flap falls in the first half */
const FLIP = 110;

type Flaps = ReturnType<typeof createFlaps>;

interface Flap {
  el: HTMLElement;
  value: string;
  under: HTMLElement;
  top: HTMLElement;
  bottom: HTMLElement;
  animations: Animation[];
}

/** a split-flap counter: a flap folds toward its axle by scaling in the plane, never in depth */
function createFlaps(root: HTMLElement) {
  const noun = root.querySelector<HTMLElement>('[data-noun]')!;
  const cells: Flap[] = [];
  for (const el of root.querySelectorAll<HTMLElement>('[data-flap]')) {
    const layer = (clip: string) => {
      const span = document.createElement('span');
      span.ariaHidden = 'true';
      span.style.cssText = `position:absolute;inset:0;display:grid;place-items:center;background:inherit;visibility:hidden;clip-path:${clip}`;
      el.append(span);
      return span;
    };
    cells.push({
      el,
      value: el.firstChild?.textContent ?? '',
      under: layer('inset(50% 0 0 0)'),
      top: layer('inset(0 0 50% 0)'),
      bottom: layer('inset(50% 0 0 0)'),
      animations: [],
    });
  }
  return {
    set(value: number, animate: boolean) {
      const text = String(value).padStart(cells.length, ' ');
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.value === text[i]) continue;
        const previous = cell.value;
        cell.value = text[i];
        for (const animation of cell.animations) animation.cancel();
        cell.animations.length = 0;
        cell.el.firstChild!.textContent = text[i];
        if (!animate) continue;
        cell.under.textContent = previous;
        cell.top.textContent = previous;
        cell.bottom.textContent = text[i];
        cell.animations.push(
          cell.top.animate(
            [
              { transform: 'scaleY(1)', visibility: 'visible' },
              { transform: 'scaleY(0)', visibility: 'visible' },
            ],
            { duration: FLIP / 2, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
          ),
          cell.bottom.animate(
            [
              { transform: 'scaleY(0)', visibility: 'visible' },
              { transform: 'scaleY(1.06)', visibility: 'visible', offset: 0.7 },
              { transform: 'scaleY(1)', visibility: 'visible' },
            ],
            { duration: FLIP / 2, delay: FLIP / 2, easing: 'cubic-bezier(0, 0.55, 0.45, 1)' },
          ),
          cell.under.animate([{ visibility: 'visible' }, { visibility: 'visible' }], {
            duration: FLIP,
          }),
        );
      }
      noun.textContent = value === 1 ? 'file' : 'files';
    },
    destroy() {
      for (const cell of cells) {
        for (const animation of cell.animations) animation.cancel();
        for (const layer of [cell.under, cell.top, cell.bottom]) layer.remove();
      }
    },
  };
}
