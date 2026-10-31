import { DISSOLVE, ditherKeyframes } from '../../lib/dither';
import { type Anchor, identity, type Mat4, transform, type Vec3 } from '../../lib/mesh';
import { clamp, easeOut, mix, type Rect, rectIn, TICK } from '../../lib/motion';
import { reduce, setText } from '../../lib/script';
import { report } from '../../lib/status';
import {
  type Box,
  type Cable,
  CAM,
  CHAIN_Z,
  createMachine,
  CRATE_Z,
  HOPPER_Z,
  JAW,
  JAW_HALF,
  LID_T,
  type Plan,
  PLUG,
  pointAt,
  type Pose,
  type Route,
  routes,
} from './scene';

/** a file let go of passes in front of the chain and its drive gear, inside the hopper's depth */
const DROP_Z = 76;
const WALL = 8;
const LID_OPEN = 1.62;
const LATCH_OPEN = 2.15;
/** the drive gear's radius over its teeth and its distance from the sprocket it turns, and how far
 * the chain's frame reaches round its line */
const DRIVE = 11.5;
const MESH = 23;
const FRAME = 32;
/** a file comes off the chain every half tick; the files it carries keep this much apart */
const CADENCE = TICK / 2;
const GAP = 12;
/** the chain's spin-up and spin-down, ms */
const ACCEL = 380;
const DECEL = 460;
/** a file taken out of the crate settles onto the chain over this much of its travel */
const SETTLE = 48;
/** a let-go file's start speed and pull, px/ms and px/ms² */
const FALL = 2;
const PULL = 0.004;
/** a carried file clears the crate's open lid by this much */
const CLEAR = 14;
/** the hopper's mouth reaches this much past its counter on each side */
const LIP = 40;
const REEL = 8;
const WIND = 1.6;
/** a part counts as seen once it reaches the middle half of the screen */
const SEEN = '-25% 0px';
/** the command types from TYPE, a character every KEY ms */
const TYPE = 60;
const KEY = 25;
/** a line rewritten: selected from SELECT, an import struck at STRIKE, the new text written from
 * WRITE a character every LETTER ms, a rewired import then read for READ */
const SELECT = 60;
const STRIKE = 220;
const WRITE = 300;
const LETTER = 70;
const READ = 640;

/** the frame round your change: shown as it dithers in, dithered out a second later */
const MARK = DISSOLVE.map((frame) => ({ ...frame, opacity: 1 }));

interface Card {
  el: HTMLElement;
  /** where its top middle is drawn, scaled as it shows */
  frame: Mat4;
  anchor: Anchor;
  w: number;
  h: number;
  scale: number;
  /** once let go: its top middle's way into the hopper, the way's length and time, its size there */
  from: Vec3;
  to: Vec3;
  way: number;
  drop: number;
  fit: number;
  inlet: HTMLElement | undefined;
  reveals: HTMLElement[];
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
  const listeners = new AbortController();
  const { signal } = listeners;
  const find = (name: string, from: ParentNode = root) =>
    from.querySelector<HTMLElement>(`[data-${name}]`)!;
  // the runs to pick and their command sit in the figure's header, above the stage
  const figure = root.closest<HTMLElement>('[data-figure]') ?? root;
  const caret = find('caret', figure);
  const crate = find('crate');
  const label = find('label');
  const plate = find('plate');
  const replay = find('replay', figure);
  const commandBox = replay.parentElement!;
  const chips = figure.querySelectorAll<HTMLButtonElement>('[data-play]');
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
    // the run's files on the drawing: none without a machine
    const cards: Card[] = [];
    for (const [el, { frame, anchor }] of sheets) {
      if (el.dataset.scene !== String(index)) continue;
      const reveals: HTMLElement[] = [];
      for (const path of el.dataset.reveals!.split(' ')) {
        const at = rows.get(path);
        if (at?.dataset.added !== undefined) reveals.push(at);
      }
      const inlet = row(el.dataset.inlet!);
      cards.push({
        el,
        frame,
        anchor,
        w: 0,
        h: 0,
        scale: 1,
        from: [0, 0, 0],
        to: [0, 0, 0],
        way: 1,
        drop: 0,
        fit: 1,
        inlet,
        reveals,
      });
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
      counter: find('counter', cell),
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
  const elements = root.querySelectorAll<HTMLElement>('[data-inlet]');
  const counts = [0, 0];
  for (const el of elements) counts[Number(el.dataset.scene)]++;
  /** the machine's holes, one for each file of the longer run */
  const holes = Math.max(...counts);
  const machine = createMachine(root.querySelector('canvas')!, holes, {
    onFrame,
    onResize(width, height) {
      size = [width, height];
      layout();
    },
  });
  /** each file's place on the drawing */
  const sheets = new Map<HTMLElement, { frame: Mat4; anchor: Anchor }>();
  for (const el of machine ? elements : []) {
    const frame = identity();
    sheets.set(el, { frame, anchor: machine!.mesh.anchor(el, frame) });
  }
  let scene = load(0);

  function pick(i: number) {
    if (scene.shown === i) return;
    scene.shown = i;
    for (let k = 0; k < scene.tabs.length; k++) {
      scene.tabs[k].ariaSelected = String(k === i);
      scene.panels[k].inert = k !== i;
    }
    setText(scene.title, scene.tabs[i].dataset.file!);
  }

  function onTab(event: Event) {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[data-tab]');
    let i = tab ? scene.tabs.indexOf(tab) : -1;
    if (i < 0) return;
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

  // the editor's tabs work with or without the machine
  root.addEventListener('click', onTab, { signal });
  root.addEventListener('keydown', onTab, { signal });
  if (!machine) {
    // no machine to run: the figure rests on its end state, as it does without script
    figure.toggleAttribute('data-static', true);
    return () => {
      listeners.abort();
      figure.removeAttribute('data-static');
    };
  }
  const mesh = machine.mesh;
  // world points are stage px, y down, z toward the viewer; the camera is level with the stage's top
  let size = [0, 0];
  let footX = 0;
  let plan: Plan | undefined;
  /** from its tail along `dir` to where it lets go; the files hang opposite `side` */
  const chain = { tail: [0, 0], dir: [0, -1], side: [1, 0], length: 1 };
  /** where a file hangs from its jaw: the share of its width before the jaw, its top below it */
  const hang = { share: 1, top: 0 };
  let pitch = 36;
  let speed = pitch / CADENCE;
  /**
   * The chain's travel while a file rises from the crate to its jaw, whole pitches so the two meet,
   * and the last of it, as it pops up into a level chain's row
   */
  let lift = 3 * pitch;
  let pop = 0;
  let inside: Vec3 = [0, 0, 0];
  const wires: Cable[] = [];
  let beats = schedule();

  let phase: 'rest' | 'ready' | 'play' | 'hold' = 'rest';
  let clock = 0;
  let last = -1;
  /** your project's rows moved during the play: the cables follow them on its next frame */
  let rewire = false;
  /** the line being typed into, the caret after its text */
  let caretLine: HTMLElement | undefined;
  /** the parts in the middle half of the screen, and whether this run's editor has been there */
  const seen = new Set<Element>();
  let met = false;
  let landedShown = -1;
  let flashed = -1;
  let flashUntil = 0;
  let flashRow: HTMLElement | undefined;
  let caretMode = '';
  let caretAt = '';
  let typedShown = -1;
  let status = '';
  /** the tab the play last turned to: a tab you pick mid-play stays until the next beat */
  let beatTab = -1;
  /** each cable's rope as last drawn */
  const ropes: { route?: Route; end: number }[] = [{ end: -1 }, { end: -1 }];
  const pose: Pose = { latch: [0, 0], lid: 0, travel: 0, reels: [0, 0], plugged: [false, false] };
  const scratch: Vec3 = [0, 0, 0];
  const point: Vec3 = [0, 0, 0];

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

  /** the box `rect` shows on the screen at depth z, `depth` deep behind it */
  function panel(rect: Rect, z: number, depth: number, border = 0): Box {
    const a = unproject(rect.x - border, rect.y - border, z);
    const b = unproject(rect.x + rect.w + border, rect.y + rect.h + border, z);
    return {
      at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z - depth / 2],
      half: [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2, depth / 2],
    };
  }

  /** a box whose front face, at z, frames `rect`; a hole down to the page over `rect` */
  function housing(rect: Rect, z: number, depth: number, border: number) {
    return { box: panel(rect, z, 2 * depth, border), window: panel(rect, z + 0.5, 0.5) };
  }

  /** how far the chain has moved at `t`: spun up, at speed, spun down from its stop */
  function travel(t: number): number {
    const t0 = t - beats.belt;
    if (t0 <= 0) return 0;
    const v = speed;
    if (t0 < ACCEL) return (v * t0 * t0) / (2 * ACCEL);
    const cruise = beats.stop - beats.belt;
    if (t0 < cruise) return (v * ACCEL) / 2 + v * (t0 - ACCEL);
    const d = Math.min(t0 - cruise, DECEL);
    return (v * ACCEL) / 2 + v * (cruise - ACCEL) + v * d - (v * d * d) / (2 * DECEL);
  }

  /** when the chain, starting at `belt`, has moved `d` */
  function reach(d: number, belt: number): number {
    const ramp = (speed * ACCEL) / 2;
    return belt + (d < ramp ? Math.sqrt((2 * ACCEL * d) / speed) : ACCEL + (d - ramp) / speed);
  }

  function windTime(c: Cable): number {
    return (c.sealed.length - c.branch) / WIND + 160;
  }

  function schedule() {
    const typed = TYPE + scene.command.children.length * KEY;
    const latch = [typed + 120, typed + 120 + TICK];
    const lid = latch[1] + 2 * TICK;
    const belt = lid + 480;
    const n = scene.cards.length;
    // each file comes off as its jaw reaches the end of the chain, which stops with the last
    const release: number[] = [];
    const landed: number[] = [];
    for (let i = 0; i < n; i++) {
      release.push(reach(lift + i * pitch + chain.length, belt));
      landed.push(release[i] + scene.cards[i].drop);
    }
    const stop = release[n - 1];
    const strikes: number[] = [];
    const plugs: number[] = [];
    let t = landed[n - 1] + TICK / 2;
    let free = t;
    for (let i = 0; i < scene.strikes.length; i++) {
      const strike = scene.strikes[i];
      strikes.push(t);
      const written = WRITE + strike.after.length * LETTER;
      // a file's cable moves once its last import is rewritten, while the diff is read
      const c = scene.cables.findIndex((cable) => cable.tab === strike.tab);
      if (c >= 0 && scene.strikes[i + 1]?.tab !== strike.tab) {
        plugs[c] = t + written + 60;
        free = wires[c] ? plugs[c] + windTime(wires[c]) + 260 : t + written + READ;
      }
      t += written + READ + 160;
    }
    const edit = Math.max(free, t) + 120;
    // typed within the run's last beat: a long edit types faster
    const editFor = Math.min(scene.editCut.dataset.new!.length * 40, 240);
    // the dev server reloads as your edit is saved: the browser's tab spins while the code still
    // shows, then over the old page a moment, until your change dithers in with a frame round it
    const reload = edit + WRITE + editFor + 60;
    const page = reload + 2 * TICK;
    const v = speed;
    return {
      typed,
      latch,
      lid,
      belt,
      stop,
      travel: (v * ACCEL) / 2 + v * (stop - belt - ACCEL) + (v * DECEL) / 2,
      release,
      landed,
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
    if (s.width === 0 || size[0] === 0) return;
    footX = s.width / 2;
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

    // the crate's front face is its slot, the crate as deep as half its height
    const slot = rectIn(crate, s);
    const a = unproject(slot.x, slot.y, CRATE_Z);
    const b = unproject(slot.x + slot.w, slot.y + slot.h, CRATE_Z);
    const floor = b[1];
    const half: Vec3 = [(b[0] - a[0]) / 2, (b[1] - a[1] - LID_T) / 2, Math.round(slot.h / 4)];
    const centre: Vec3 = [(a[0] + b[0]) / 2, floor - half[1], CRATE_Z - half[2]];
    const top = floor - 2 * half[1];
    const tag = rectIn(label, s);
    // the sockets stand above the corner caps, right of the label; the right one's cable clears it
    const socket = centre[0] + half[0] - 30;
    const beside = unproject(tag.x + tag.w + 6, 0, CRATE_Z)[0] + 15;
    inside = [centre[0], top + 30, centre[2]];
    // the top of the lid, standing open behind the crate
    const lid = project(centre[0], top - 2 * half[2] - 6, centre[2] - half[2])[1];

    for (const card of scene.cards) {
      card.w = card.el.offsetWidth;
      card.h = card.el.offsetHeight;
    }

    const sign = rectIn(plate, s);
    const front = CHAIN_Z + 22;
    const counter = rectIn(scene.counter, s);
    const treeBox = rectIn(scene.tree, s);
    const editor = rectIn(scene.editor, s);
    const gutter = Number.parseFloat(getComputedStyle(root).paddingLeft);

    // the chain carries files from over the crate to the hopper: up beside it when the hopper's
    // mouth stands above the crate, across over it otherwise. Its drive gear hangs under the
    // plate, at its end beside an upright chain's head, over the crate above a level one's tail
    const mid = counter.x + counter.w / 2;
    const upright = counter.y < lid;
    const drive = unproject(sign.x + sign.w, sign.y + sign.h + 4 + DRIVE, front);
    if (!upright) drive[0] = centre[0];
    const tail: Vec3 = upright
      ? [drive[0] + MESH, unproject(0, lid - CLEAR - scene.cards[0].h / 2, CHAIN_Z)[1], CHAIN_Z]
      : [drive[0], drive[1] + MESH, CHAIN_Z];
    const head: Vec3 = upright
      ? [tail[0], drive[1], CHAIN_Z]
      : [unproject(mid, 0, CHAIN_Z)[0], tail[1], CHAIN_Z];
    chain.dir = upright ? [0, -1] : [1, 0];
    chain.side = upright ? [1, 0] : [0, -1];
    chain.tail = [tail[0], tail[1]];
    const span = Math.hypot(head[0] - tail[0], head[1] - tail[1]);
    // a file lets go before its jaw comes level with the drive gear, clear of the head's sprocket
    chain.length = span - DRIVE - JAW_HALF;
    // a file hangs beside an upright chain from its jaw's top, under a level one from its middle
    hang.share = (1 + chain.side[0]) / 2;
    hang.top = upright ? 1 - JAW_HALF : 2;

    // the hopper on your project's window, its counter on its front, its mouth as wide as it can be
    // inside the gutters and clear of the machine to its left
    const face = HOPPER_Z + 22;
    const hopper = unproject(mid, counter.y - 14, face);
    hopper[2] = HOPPER_Z;
    const neck = unproject(mid, treeBox.y, face);
    const rim = HOPPER_Z + 25;
    const left = upright
      ? project(head[0] + FRAME, 0, CHAIN_Z)[0]
      : project(centre[0] + half[0] + 16, 0, CRATE_Z - 30)[0];
    const halfWidth = Math.min(
      counter.w / 2 + LIP,
      unproject(s.width - gutter, 0, rim)[0] - hopper[0] - 4,
      hopper[0] - unproject(Math.max(gutter, left + 8), 0, rim)[0] - 4,
    );
    const spout = Math.min(counter.w / 2 + 6, halfWidth);

    // wide files shrink to stay inside the gutters, on the chain and rising out of the crate
    const lo = gutter + 4;
    const hi = s.width - gutter - 4;
    /** the largest scale for a file `w` px wide at full size, `share` of it left of x */
    const room = (x: number, share: number, w: number) =>
      Math.max(
        0,
        Math.min(
          share > 0 ? (x - lo) / (share * w) : 1,
          share < 1 ? (hi - x) / ((1 - share) * w) : 1,
        ),
      );
    grip(0);
    const [tailX, , near] = project(point[0], point[1], inside[2]);
    grip(chain.length);
    const [headX, headY, far] = project(point[0], point[1], CHAIN_Z);
    const crateX = project(inside[0], inside[1], inside[2])[0];
    let extent = 0;
    let tallest = 0;
    for (const card of scene.cards) {
      card.scale = Math.min(
        1,
        room(tailX, hang.share, card.w * near),
        room(headX, hang.share, card.w * far),
        room(crateX, 0.5, card.w * near),
      );
      extent = Math.max(
        extent,
        (Math.abs(chain.dir[0]) * card.w + Math.abs(chain.dir[1]) * card.h) * card.scale,
      );
      tallest = Math.max(tallest, card.h * card.scale);
    }
    // the jaws' pitch fits the widest file along the chain, which lets one go each beat. Under a
    // level chain a rising file waits its height below the row, and pops up into it as the file
    // ahead moves on: the pitch leaves it that room
    pop = Math.abs(chain.dir[0]) * (tallest + GAP);
    pitch = extent + GAP + pop;
    speed = pitch / CADENCE;
    // the files rising out of the crate queue a pitch apart, at least as fast as the chain
    grip(0);
    const queue = Math.hypot(point[0] - inside[0], point[1] + pop - inside[1]);
    lift = Math.max(1, Math.floor((queue + pop) / pitch)) * pitch;

    // let go, a file lands in the middle of the hopper's front, narrow enough for its spout
    const atDrop = CAM / (CAM - DROP_Z);
    const middle = (counter.y - 14 + treeBox.y) / 2;
    const inner = (2 * spout - 12) * (CAM / (CAM - face));
    for (const card of scene.cards) {
      const w = card.w * card.scale;
      card.from = unproject(headX + (0.5 - hang.share) * w * far, headY, DROP_Z);
      card.fit = Math.min(1, inner / (w * atDrop));
      card.to = unproject(mid, middle - (card.h * card.scale * atDrop * card.fit) / 2, DROP_Z);
      card.way = Math.hypot(card.to[0] - card.from[0], card.to[1] - card.from[1]);
      card.drop = (Math.sqrt(FALL * FALL + 2 * PULL * card.way) - FALL) / PULL;
    }

    plan = {
      width: size[0],
      height: size[1],
      gutter,
      right: 0,
      bottom: 0,
      eye: footX,
      floor,
      crate: { at: centre, half },
      sockets: [
        [socket, floor - 37, CRATE_Z],
        [Math.max(socket - 30, beside), floor - 37, CRATE_Z],
      ],
      housings: [
        housing(tag, CRATE_Z + 3, 3, 6),
        housing(sign, front, 18, 8),
        housing(counter, HOPPER_Z + 24, 4, 5),
      ],
      windows: [panel(treeBox, 1, 1), panel(editor, 1, 1)],
      chain: {
        tail,
        dir: [chain.dir[0], chain.dir[1]],
        side: [chain.side[0], chain.side[1]],
        span,
        upright,
      },
      drive,
      pitch,
      hopper: { at: hopper, top: halfWidth, spout, height: neck[1] - hopper[1] },
      cables: 0,
      reels: [],
      jacks: [],
    };
    wire(s);

    beats = schedule();
    // a run waiting for the editor waits where its rewrites now start
    if (phase === 'hold') clock = beats.strikes[0] - 1;
    landedShown = -1;
    render(phase === 'rest' ? beats.end : clock);
  }

  /** the cables from the editor's reels into your project's rows, down the gap between them */
  function wire(s: DOMRect) {
    if (!plan) return;
    wires.length = 0;
    plan.reels.length = 0;
    plan.jacks.length = 0;
    for (const rope of ropes) rope.end = -1;
    const treeBox = rectIn(scene.tree, s);
    const editor = rectIn(scene.editor, s);
    const gap = editor.x - (treeBox.x + treeBox.w);
    if (gap > 0) {
      const view = rectIn(scene.list, s);
      for (let i = 0; i < scene.cables.length; i++) {
        // its run to the floor swings out toward the viewer, under your project's window
        const lane = treeBox.x + treeBox.w + (gap * (i + 1)) / 4;
        const front = CRATE_Z + 40 + 18 * i;
        const tab = rectIn(scene.tabs[scene.cables[i].tab], s);
        const reel: Vec3 = [editor.x - REEL - 2, tab.y + tab.h / 2, WALL];
        const row = rectIn(scene.cables[i].row, s);
        // a row scrolled out of the list keeps its plug on the list's edge
        const plug = clamp(row.y + row.h / 2, view.y + 10, view.y + view.h - 10);
        const target: Vec3 = [treeBox.x + treeBox.w + 3, plug, WALL];
        wires.push(
          routes({
            reel: [reel[0] - REEL, reel[1], WALL],
            lane,
            wall: WALL,
            floor: plan.floor,
            front,
            forward: unproject(project(lane, 0, WALL)[0], 0, front)[0],
            socket: [plan.sockets[i][0], plan.sockets[i][1], CRATE_Z + 2],
            target,
          }),
        );
        plan.reels.push(reel);
        plan.jacks.push([target[0] - 3, target[1], WALL]);
      }
    }
    plan.cables = wires.length;
    // the drawing spans the machine, its cables and their shadows, no more of the stage
    const { at: c, half: b } = plan.crate;
    const { at: h, top, height } = plan.hopper;
    const head = plan.chain.tail[0] + plan.chain.dir[0] * plan.chain.span;
    let right = Math.max(
      project(c[0] + b[0] + 8, 0, CRATE_Z)[0],
      project(h[0] + top + 3, 0, HOPPER_Z + 25)[0],
      project(head + FRAME, 0, CHAIN_Z)[0],
    );
    let bottom = Math.max(
      project(0, plan.floor, CRATE_Z + 60)[1],
      project(0, h[1] + height, HOPPER_Z)[1],
    );
    for (let i = 0; i < wires.length; i++) {
      right = Math.max(right, plan.reels[i][0] + REEL);
      bottom = Math.max(bottom, plan.jacks[i][1]);
    }
    plan.right = Math.min(right + 40, s.width - plan.gutter);
    plan.bottom = Math.min(bottom + 40, plan.height);
    machine!.layout(plan);
  }

  /** your project's rows moved under the cables, its list scrolled or a folder opened: re-plug */
  function replug() {
    if (!wires.length) return;
    if (phase === 'play') {
      rewire = true;
      return;
    }
    wire(root.getBoundingClientRect());
    render(phase === 'rest' ? beats.end : clock);
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
    // solid while typing, blinking on the play's clock a beat at a time after it, gone once run
    const blink = t > b.typed && Math.floor((t - b.typed) / (2 * TICK)) % 2 === 1;
    const typing = !live || t > b.lid || blink ? 'hidden' : 'visible';
    if (typing !== caretMode) {
      caretMode = typing;
      caret.style.visibility = typing;
    }
    const at = `translate(${scene.ends[shown * 2].toFixed(1)}px, ${scene.ends[shown * 2 + 1].toFixed(1)}px)`;
    if (at !== caretAt) {
      caretAt = at;
      caret.style.transform = at;
    }

    for (let i = 0; i < 2; i++)
      pose.latch[i] = live ? LATCH_OPEN * spring(clamp((t - b.latch[i]) / 260)) : LATCH_OPEN;
    pose.lid = live ? lidAngle(t - b.lid) : LID_OPEN;
    const distance = live ? travel(t) : b.travel;
    pose.travel = distance;
    let used = 0;
    let landed = 0;
    for (let i = 0; i < scene.cards.length; i++) {
      const card = scene.cards[i];
      // its place on the chain, from the jaw at the tail
      const s = distance - lift - i * pitch;
      const out = t - b.release[i];
      if (live && t >= b.landed[i]) landed++;
      const carried = live && s > -lift && t < b.landed[i];
      if (card.anchor.shown !== carried) {
        card.anchor.shown = carried;
        card.el.style.visibility = carried ? 'visible' : '';
      }
      if (!carried) continue;
      // where its top middle is, how deep, and how much of its size it shows
      let x: number;
      let y: number;
      let z: number;
      let fit = 1;
      const offset = (0.5 - hang.share) * card.w * card.scale;
      if (out >= 0) {
        // let go: into the hopper, gathering speed
        const u = Math.min(1, (FALL * out + (PULL * out * out) / 2) / card.way);
        x = mix(card.from[0], card.to[0], u);
        y = mix(card.from[1], card.to[1], u);
        z = DROP_Z;
        fit = mix((CAM - DROP_Z) / (CAM - CHAIN_Z), card.fit, u);
      } else if (s < 0) {
        // rising out of the crate in the queue, then up into its jaw at the chain's tail
        const u = Math.min(1, (s + lift) / (lift - pop));
        grip(0);
        x = mix(inside[0], point[0] + offset, u);
        y = mix(inside[1], point[1] + pop, u) - Math.max(0, s + pop);
        z = inside[2];
      } else {
        // riding its jaw, settling back onto the chain from the crate's depth
        grip(s);
        x = point[0] + offset;
        y = point[1];
        z = s < SETTLE ? mix(inside[2], CHAIN_Z, easeOut(s / SETTLE)) : CHAIN_Z;
      }
      const k = fit * card.scale;
      transform(card.frame, [x, y, z], undefined, [k, k, k]);
      card.anchor.offset = [-card.w / 2, 0];
      machine!.sheet(used++, card.frame, card.w, card.h);
    }
    // the holes files were carried in, without them
    for (let i = used; i < holes; i++) machine!.sheet(i, null);

    if (landed !== landedShown) {
      // the rows of the files landed since; all of them again after a reset
      const more = live && landedShown >= 0 && landed > landedShown;
      if (!more) for (const el of scene.added) el.style.display = live ? 'none' : '';
      if (live) {
        for (let i = more ? landedShown : 0; i < landed; i++) {
          for (const row of scene.cards[i].reveals) row.style.display = '';
        }
      }
      landedShown = landed;
      if (!counters.has(scene.counter)) counters.set(scene.counter, createFlaps(scene.counter));
      counters.get(scene.counter)!.set(live ? landed : scene.cards.length, more);
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
      if (u >= STRIKE && u < WRITE + strike.after.length * LETTER + READ) writing = strike;
      const text = u < WRITE ? '' : strike.after.slice(0, 1 + Math.floor((u - WRITE) / LETTER));
      const selected = u >= SELECT && u < STRIKE;
      const state = `${u >= STRIKE ? 'diff' : ''}|${selected ? 'selected' : ''}|${text}`;
      if (state === strike.state) continue;
      strike.state = state;
      strike.diff.toggleAttribute('data-diff', u >= STRIKE);
      highlight(strike.from, selected);
      setText(strike.cut, text);
    }

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
      }
      pose.plugged[i] = route === c.done;
      pose.reels[i] = (c.sealed.length - end) / REEL;
      if (ropes[i].route !== route || ropes[i].end !== end) {
        ropes[i].route = route;
        ropes[i].end = end;
        // its rope up to its plug, then the plug
        const points: Vec3[] = [];
        for (let j = 0; j < route.points.length && route.at[j] < end - PLUG; j++)
          points.push(route.points[j]);
        points.push(pointAt(route, end - PLUG, [0, 0, 0]), pointAt(route, end, [0, 0, 0]));
        machine!.rope(i, points);
      }
      if (u >= wind + 150 && u < wind + 150 + TICK) flash(scene.cables[i].row, t);
    }
    machine!.pose(pose);

    const e = t - b.edit;
    const cut = scene.editCut;
    const next = cut.dataset.new!;
    let value = live && e < WRITE ? cut.dataset.old! : next;
    if (live && e >= WRITE && e < WRITE + b.editFor)
      value = next.slice(0, 1 + Math.floor(((e - WRITE) / b.editFor) * next.length));
    setText(cut, value);
    highlight(cut, live && e >= 2 * SELECT && e < WRITE);
    // the caret follows the text being typed in its own line
    const target = live && e >= 0 && e < WRITE + b.editFor + 200 ? cut : writing?.cut;
    if (target !== caretLine) {
      caretLine?.removeAttribute('data-typing');
      target?.setAttribute('data-typing', '');
      caretLine = target;
    }
    const browser = scene.tabs[scene.browser];
    const reloading = live && t >= b.reload && t < b.change;
    browser.toggleAttribute('data-reloading', reloading);
    highlight(browser, reloading);
    const turn = reloading ? `${(((t - b.reload) / (TICK / 2)) * 45) % 360}deg` : '';
    if (scene.spinner.style.rotate !== turn) scene.spinner.style.rotate = turn;
    const edited = !live || t >= b.change;
    if (edited !== scene.edited) {
      scene.edited = edited;
      scene.page.toggleAttribute('data-edited', edited);
      scene.editor.toggleAttribute('data-edited', edited);
      if (edited && live) {
        scene.after.animate(ditherKeyframes(2), { duration: 3 * TICK });
        scene.mark.animate(MARK, { delay: 8 * TICK, duration: 3 * TICK, fill: 'backwards' });
      }
    }

    let line = scene.done;
    if (live) {
      if (t < b.latch[0]) line = scene.line;
      else if (t < b.belt) line = 'opening fumadocs-ui';
      else if (phase === 'hold' && t < b.edit)
        line = `fetched ${scene.fetch} from fumadocs.dev/registry`;
      else if (t < b.strikes[0]) line = `fetching ${scene.fetch} from fumadocs.dev/registry`;
      else if (t < b.edit) line = 'rewriting imports';
      else if (t < b.end - 200) line = `editing ${scene.component}`;
    }
    if (line !== status) {
      status = line;
      report(root, line);
    }
  }

  /** a jaw's grip `s` along the chain: where the top of the file it holds hangs from it */
  function grip(s: number) {
    point[0] = chain.tail[0] + chain.dir[0] * s - chain.side[0] * JAW;
    point[1] = chain.tail[1] + chain.dir[1] * s - chain.side[1] * JAW + hang.top;
    point[2] = CHAIN_Z;
  }

  function flash(row: HTMLElement | undefined, t: number) {
    if (row) flashUntil = t + TICK;
    if (flashRow === row) return;
    if (flashRow) highlight(flashRow, false);
    flashRow = row;
    if (row) highlight(row, true);
  }

  /** a frame of the mesh's: the play on from its clock, while some of the stage is on screen */
  function onFrame() {
    if (phase !== 'play') return;
    const now = performance.now();
    clock += last < 0 ? 0 : Math.min(50, now - last);
    last = now;
    if (rewire) {
      rewire = false;
      wire(root.getBoundingClientRect());
    }
    // the rewrites wait just before their start until the reader has seen the editor
    if (!met && clock >= beats.strikes[0]) {
      clock = beats.strikes[0] - 1;
      hold();
    } else if (clock < beats.end) render(clock);
    else rest();
  }

  /** the play goes on from its clock */
  function wake() {
    last = -1;
    mesh.invalidate();
  }

  function hold() {
    phase = 'hold';
    render(clock);
    flash(undefined, clock);
  }

  function check() {
    if (seen.has(scene.editor) && phase !== 'ready') met = true;
    if (phase === 'ready' && seen.has(crate)) arrive();
    else if (phase === 'hold' && met) {
      phase = 'play';
      wake();
    }
  }

  /** the reader reached the crate: the run starts, its command typed already when it's off screen */
  function arrive() {
    play();
    const box = commandBox.getBoundingClientRect();
    const menu = Number.parseFloat(getComputedStyle(root).getPropertyValue('--lp-menu-h')) || 0;
    const centre = box.top + box.height / 2;
    if (centre < menu || centre > innerHeight) clock = beats.typed + 60;
  }

  function rest() {
    phase = 'rest';
    flash(undefined, 0);
    landedShown = -1;
    render(beats.end);
  }

  function play() {
    if (reduce()) {
      rest();
      return;
    }
    phase = 'play';
    clock = 0;
    met = seen.has(scene.editor);
    landedShown = -1;
    flashed = -1;
    beatTab = -1;
    wake();
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

  function onPlay(event: MouseEvent) {
    show(Number((event.currentTarget as HTMLElement).dataset.play));
    play();
  }

  const watch = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) seen.add(entry.target);
        else seen.delete(entry.target);
      }
      check();
    },
    { rootMargin: SEEN },
  );
  watch.observe(crate);
  for (const el of root.querySelectorAll('[data-editor]')) watch.observe(el);
  const rows = new ResizeObserver(replug);
  for (const list of root.querySelectorAll('[data-list]')) {
    rows.observe(list.firstElementChild!);
    // a scroll event comes before this frame paints: the cables follow their rows in it
    list.addEventListener('scroll', replug, { passive: true, signal });
  }
  replay.addEventListener('click', play, { signal });
  for (const chip of chips) chip.addEventListener('click', onPlay, { signal });
  if (document.fonts.status !== 'loaded') {
    void document.fonts.ready.then(() => {
      if (!signal.aborted) layout();
    });
  }
  // every load waits for the reader, the figure on screen or not
  if (!reduce()) phase = 'ready';

  return () => {
    listeners.abort();
    watch.disconnect();
    rows.disconnect();
    for (const flaps of counters.values()) flaps.destroy();
    caretLine?.removeAttribute('data-typing');
    mesh.destroy();
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
      span.style.cssText = `position:absolute;inset:0;display:grid;place-items:center;background:inherit;opacity:0;will-change:transform,opacity;clip-path:${clip}`;
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
        setText(cell.under, previous);
        setText(cell.top, previous);
        setText(cell.bottom, text[i]);
        cell.animations.push(
          cell.top.animate(
            [
              { transform: 'scaleY(1)', opacity: 1 },
              { transform: 'scaleY(0)', opacity: 1 },
            ],
            { duration: FLIP / 2, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
          ),
          cell.bottom.animate(
            [
              { transform: 'scaleY(0)', opacity: 1 },
              { transform: 'scaleY(1.06)', opacity: 1, offset: 0.7 },
              { transform: 'scaleY(1)', opacity: 1 },
            ],
            { duration: FLIP / 2, delay: FLIP / 2, easing: 'cubic-bezier(0, 0.55, 0.45, 1)' },
          ),
          cell.under.animate({ opacity: [1, 1] }, { duration: FLIP }),
        );
      }
      setText(noun, value === 1 ? 'file' : 'files');
    },
    destroy() {
      for (const cell of cells) {
        for (const animation of cell.animations) animation.cancel();
        for (const layer of [cell.under, cell.top, cell.bottom]) layer.remove();
      }
    },
  };
}
