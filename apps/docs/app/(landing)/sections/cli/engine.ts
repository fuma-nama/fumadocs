import { cubicBezier } from 'motion/react';
import { createShaderCanvas } from '../../lib/gl';
import { camera, settle, TICK } from '../../lib/motion';
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
/** gripper spacing, chain speed (px per ms), its spin-up and spin-down */
const PITCH = 36;
const SPEED = 0.72;
const ACCEL = 380;
const DECEL = 460;
/** chain travel of a file rising out of the crate (whole pitches, it meets its gripper) and
 * dropping into the hopper; how far left of the chain a gripper's jaw holds it */
const RISE = 3 * PITCH;
const DROP = 96;
const JAW = 10;
/** the reels on the imports' window: radius, and cable speed when they wind (px per ms) */
const REEL = 8;
const WIND = 1.6;
/** share of the crate in view that starts the scene */
const START = 0.6;

const ease = cubicBezier(...settle);
const inOut = cubicBezier(...camera);

interface Card {
  el: HTMLElement;
  w: number;
  h: number;
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

interface Strike {
  line: HTMLElement;
  cut: HTMLElement;
  before: string;
  after: string;
  /** the cut's text when it was last measured, and where it was */
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
  done: string;
  fetch: string;
  /** what your edit changes */
  name: string;
  cell: HTMLElement;
  column: HTMLElement;
  tree: HTMLElement;
  counter: HTMLElement;
  flaps: Flaps;
  rows: Map<string, HTMLElement>;
  added: HTMLElement[];
  cards: Card[];
  strikes: Strike[];
  /** the rewired imports' target rows */
  targets: HTMLElement[];
  edit: HTMLElement;
  editCut: HTMLElement;
  before: HTMLElement;
  after: HTMLElement;
  /** the preview shows your edit */
  edited: boolean;
}

interface Beats {
  type: number;
  typed: number;
  latch: [number, number];
  lid: number;
  belt: number;
  stop: number;
  travel: number;
  /** per rewired import: the print head's strike, the cable's move */
  strikes: number[];
  plugs: number[];
  edit: number;
  end: number;
}

export function createCli(root: HTMLElement): () => void {
  const canvas = root.querySelector('canvas')!;
  // the scene steps in the canvas's own frame, so the files and the machine move together
  const shader = createShaderCanvas(canvas, { fragment, onFrame });
  if (!shader) return () => {};
  const gl = shader;
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = matchMedia('(min-width: 1024px)');
  const find = (name: string, from: ParentNode = root) =>
    from.querySelector<HTMLElement>(`[data-${name}]`)!;

  const command = find('command');
  const caret = find('caret');
  const crate = find('crate');
  const label = find('label');
  const plate = find('plate');
  const replay = find('replay');
  const chips = root.querySelectorAll<HTMLButtonElement>('[data-play]');

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
      cards.push({ el, w: 0, h: 0, inlet: row(el.dataset.card!), reveals, at: '' });
    }
    const strikes: Strike[] = [];
    const targets: HTMLElement[] = [];
    for (const el of find('imports', column).querySelectorAll<HTMLElement>('[data-rewire]')) {
      const cut = find('cut', el);
      strikes.push({
        line: find('line', el),
        cut,
        before: cut.dataset.old!,
        after: cut.dataset.new!,
        key: '',
        ends: { x0: 0, y0: 0, x1: 0, y1: 0 },
      });
      targets.push(row(el.dataset.target!)!);
    }
    const counter = root.querySelector<HTMLElement>(`[data-counter][data-scene="${index}"]`)!;
    const edit = find('edit', column);
    scenes[index] = {
      args: cell.dataset.args!,
      done: cell.dataset.done!,
      fetch: cell.dataset.fetch!,
      name: cell.dataset.editName!,
      cell,
      column,
      tree,
      counter,
      flaps: createFlaps(counter),
      rows,
      added,
      cards,
      strikes,
      targets,
      edit,
      editCut: find('cut', edit),
      before: find('before', column),
      after: find('after', column),
      edited: true,
    };
  }
  let scene = scenes[0];
  const editCaret = find('edit-caret');

  // geometry, stage px; world points are CSS px with z toward the viewer
  let foot: [number, number] = [0, 0];
  /** the chain, straight up from its tail */
  const chain = { tail: [0, 0] as [number, number], length: 1 };
  let hopper: Vec3 = [0, 0, 0];
  /** the hopper's mouth, stage px: a file falling in shrinks to fit it */
  let mouth = 0;
  let inside: Vec3 = [0, 0, 0];
  let headRail: [number, number, number, number] = [0, 0, 0, 0];
  let commandWidth = 0;
  const editEnds: Ends = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const wires: Cable[] = [];
  let beats = schedule();

  // state
  let phase: 'rest' | 'ready' | 'play' = 'rest';
  let clock = 0;
  let last = -1;
  let first = true;
  let shownStatus = '';
  let landedShown = -1;
  let flashed = -1;
  let flashUntil = 0;
  let flashRow: HTMLElement | undefined;
  let caretMode = '';
  let caretAt = '';
  let editCaretKey = '';
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

  /** chain travel at time t, ms */
  function travel(t: number): number {
    const t0 = t - beats.belt;
    if (t0 <= 0) return 0;
    if (t0 < ACCEL) return (SPEED * t0 * t0) / (2 * ACCEL);
    const cruise = beats.stop - beats.belt;
    if (t0 < cruise) return (SPEED * ACCEL) / 2 + SPEED * (t0 - ACCEL);
    const d = Math.min(t0 - cruise, DECEL);
    return (
      (SPEED * ACCEL) / 2 + SPEED * (cruise - ACCEL) + SPEED * d - (SPEED * d * d) / (2 * DECEL)
    );
  }

  /** a cable's plug travel and its wind, from its start: out of the crate, along the floor, up the gutter */
  function windTime(c: Cable): number {
    return (c.sealed.length - c.branch) / WIND + 160;
  }

  function schedule(): Beats {
    const typed = 220 + command.textContent!.length * 30;
    const latch: [number, number] = [typed + 200, typed + 200 + TICK];
    const lid = latch[1] + 2 * TICK;
    const belt = lid + 560;
    // the chain runs until the last file drops, then spins down
    const distance = RISE + (scene.cards.length - 1) * PITCH + chain.length + DROP;
    const cruise = ACCEL + (distance - (SPEED * ACCEL) / 2 - (SPEED * DECEL) / 2) / SPEED;
    const stop = belt + Math.max(cruise, ACCEL);
    const strikes: number[] = [];
    const plugs: number[] = [];
    let t = stop + DECEL * 0.6;
    let free = t;
    for (let i = 0; i < scene.strikes.length; i++) {
      strikes.push(t);
      const cable = wires[i];
      plugs.push(t + strikeTime(scene.strikes[i]) - 60);
      free = cable ? plugs[i] + windTime(cable) + 260 : t + strikeTime(scene.strikes[i]);
      t += strikeTime(scene.strikes[i]) + 160;
    }
    const edit = Math.max(free, t) + 120;
    return {
      type: 220,
      typed,
      latch,
      lid,
      belt,
      stop,
      travel: distance,
      strikes,
      plugs,
      edit,
      end: edit + 980,
    };
  }

  function strikeTime(s: Strike) {
    return 300 + 120 + s.after.length * 70 + 120;
  }

  function layout() {
    const s = root.getBoundingClientRect();
    if (s.width === 0) return;
    const desktop = desktopQuery.matches;
    foot = [s.width * (desktop ? 0.56 : 0.5), 0];
    gl.set('uEye', [foot[0], foot[1], CAM]);
    gl.set('uLight', LIGHT);
    gl.set('uCell', 2);
    commandWidth = command.offsetWidth;

    // the tree's frame at its final size, before any row comes in
    for (const el of scene.added) el.style.display = '';
    scene.tree.style.height = '';
    scene.tree.style.height = `${scene.tree.offsetHeight}px`;

    // the crate's front face is its slot
    const slot = box(crate, s);
    const depth = desktop ? 92 : 80;
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
    const sockets: Vec3[] = [
      [centre[0] + size[0] - 30, floor - 30, CRATE_Z],
      [centre[0] + size[0] - 60, floor - 30, CRATE_Z],
    ];
    gl.set('uSocket[0]', sockets[0]);
    gl.set('uSocket[1]', sockets[1]);

    for (const card of scene.cards) {
      card.w = card.el.offsetWidth;
      card.h = card.el.offsetHeight;
      card.at = '';
    }

    // the drive unit frames the registry's plate, the chain hangs from the head sprocket on its right
    const sign = box(plate, s);
    gl.set('uPlate', [sign.x, sign.y, sign.x + sign.w, sign.y + sign.h]);
    housing('uDrive', sign, CHAIN_Z + 22, 18, 8);
    // the hopper frames the counter, its chute drops into the title bar of your project
    const counter = box(scene.counter, s);
    gl.set('uCounter', [counter.x, counter.y, counter.x + counter.w, counter.y + counter.h]);
    housing('uCounter', counter, HOPPER_Z + 24, 4, 5);
    const treeBox = box(scene.tree, s);
    const middle = counter.x + counter.w / 2;
    hopper = unproject(middle, counter.y - 14, HOPPER_Z);
    const neck = unproject(middle, counter.y + counter.h + 10, HOPPER_Z);
    const entry = unproject(middle, treeBox.y + 4, HOPPER_Z);
    mouth = counter.w + (desktop ? 80 : 20);
    const halfWidth = mouth / 2 / (CAM / (CAM - HOPPER_Z));
    gl.set('uHopper', hopper);
    gl.set('uHopperSize', [halfWidth, counter.w / 2 + 6, neck[1] - hopper[1], 22]);
    gl.set('uChute', [neck[0], neck[1], entry[0], entry[1]]);

    // the chain climbs from above the open lid to the head; files ride on its left
    const head = unproject(sign.x + sign.w + 25, counter.y - 4, CHAIN_Z);
    const lid = project(centre[0], top - 2 * size[2] - 6, centre[2] - size[2])[1];
    const tail = unproject(0, lid - 14 - scene.cards[0].h / 2, CHAIN_Z);
    // files let go of their jaw this far below the head sprocket
    chain.tail = [head[0], tail[1]];
    chain.length = tail[1] - head[1] - 30;
    gl.set('uChain', [head[0], tail[1], 0, -1]);
    gl.set('uChainLength', [tail[1] - head[1], CHAIN_Z]);
    gl.set('uPitch', PITCH);
    inside = [centre[0], top + 30, centre[2]];

    // the print head rides over the imports
    const imports = box(find('imports', scene.column), s);
    headRail = [imports.x + 24, imports.x + imports.w - 6, imports.y - 13, 10];
    gl.set('uHeadRail', headRail);
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

    // cables: off a reel on the imports' edge, down the gutter, along the floor to the crate
    wires.length = 0;
    if (desktop) {
      // both lanes keep to the tree's side of the gutter: the run to the floor swings out toward the viewer
      const lanes = [treeBox.x + treeBox.w + 10, treeBox.x + treeBox.w + 21];
      const front = [CRATE_Z + 22, CRATE_Z + 40];
      for (let i = 0; i < scene.strikes.length; i++) {
        // on the line's first row: a rewired line keeps room for its longer version
        const line = box(scene.strikes[i].line, s);
        const reel: Vec3 = [imports.x - REEL - 2, line.y + 10, WALL];
        const row = box(scene.targets[i], s);
        const lane = lanes[i];
        const target: Vec3 = [treeBox.x + treeBox.w + 3, row.y + row.h / 2, WALL];
        const { sealed, done, branch, turn } = cables({
          reel: [reel[0] - REEL, reel[1], WALL],
          lane,
          wall: WALL,
          floor,
          front: front[i],
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
        [hopper[0] + halfWidth + 6, entry[1] + 8, HOPPER_Z + 30],
      ),
    );
    gl.set(
      'uBox[3]',
      bounds(
        [headRail[0] - 16, headRail[2] - 12, 0],
        [headRail[1] + 16, imports.y + imports.h, 24],
      ),
    );
    gl.set(
      'uBox[4]',
      desktop
        ? bounds([treeBox.x + treeBox.w - 12, imports.y, 0], [imports.x + 12, floor, 24])
        : [0, 0, 0, 0],
    );
    const windows = [
      scene.tree,
      find('imports', scene.column),
      scene.edit,
      find('preview', scene.column),
    ];
    for (let i = 0; i < windows.length; i++) {
      const r = box(windows[i], s);
      gl.set(`uWindow[${i}]`, [r.x, r.y, r.x + r.w, r.y + r.h]);
    }

    beats = schedule();
    landedShown = -1;
    render(phase === 'rest' ? beats.end : clock);
  }

  /** the scene at time t, ms */
  function render(t: number) {
    const live = phase !== 'rest';
    const b = beats;

    // the command, typed
    const length = command.textContent!.length;
    const shown = live ? Math.round(clamp((t - b.type) / (b.typed - b.type)) * length) : length;
    const hidden = 1 - shown / length;
    const clip = hidden > 0 ? `inset(0 ${(hidden * 100).toFixed(2)}% 0 0)` : '';
    if (command.style.clipPath !== clip) command.style.clipPath = clip;
    const typing = !live || t > b.lid ? 'none' : t < b.type || t > b.typed ? 'blink' : 'solid';
    if (typing !== caretMode) {
      caretMode = typing;
      caret.style.visibility = typing === 'none' ? 'hidden' : 'visible';
      caret.style.animation = typing === 'solid' ? 'none' : '';
    }
    const at = `translateX(${(-hidden * commandWidth).toFixed(1)}px)`;
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
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const s = distance - RISE - i * PITCH;
      if (s >= chain.length + DROP) landed++;
      if (!live || s <= -RISE || s >= chain.length + DROP) {
        if (card.el.style.visibility !== '') card.el.style.visibility = '';
        continue;
      }
      // clamped by its right edge left of the chain; centred in the crate and over the hopper
      let anchor = card.w;
      let fit = 1;
      let x: number;
      let y: number;
      let z = CHAIN_Z;
      if (s < 0) {
        // up out of the crate in front of the lid, into its jaw at the chain's speed
        const u = (s + RISE) / RISE;
        gripper(0);
        x = bezier(inside[0], point[0], point[0], u);
        y = bezier(inside[1], point[1] + RISE / 2, point[1], u);
        z = mix(inside[2], CHAIN_Z, u * u * u);
        anchor = mix(card.w / 2, anchor, u);
      } else if (s <= chain.length) {
        gripper(s);
        x = point[0];
        y = point[1];
      } else {
        // swung out past the head in front of its gears, under the drive unit, into the hopper
        const u = (s - chain.length) / DROP;
        gripper(chain.length);
        x = bezier(point[0], point[0] + 40, hopper[0], u);
        y = bezier(point[1], point[1] - 24, hopper[1] + 16, u);
        z = mix(CHAIN_Z, HOPPER_Z, u) + Math.sin(Math.min(1, u / 0.7) * Math.PI) * 44;
        anchor = mix(anchor, card.w / 2, u);
        fit = mix(1, Math.min(1, (mouth - 12) / card.w), ease(u));
      }
      const [sx, sy, depth] = project(x, y, z);
      const k = depth * fit;
      const left = sx - anchor * k;
      const transform = `translate(${left.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${k.toFixed(4)})`;
      if (transform !== card.at) {
        card.at = transform;
        card.el.style.transform = transform;
      }
      if (card.el.style.visibility !== 'visible') card.el.style.visibility = 'visible';
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

    // the rewire: the head strikes each import, then its cable moves from the crate to your folder
    let headX = headRail[1] - 14;
    let headY = headRail[2] + 6;
    for (let i = 0; i < scene.strikes.length; i++) {
      const strike = scene.strikes[i];
      const u = t - b.strikes[i];
      const write = 420;
      const typing = write + strike.after.length * 70;
      const active = live && u >= 0 && u < strikeTime(strike);
      let text = live && u < write ? strike.before : strike.after;
      let chars = 0;
      if (active && u >= write && u < typing) {
        chars = Math.min(strike.after.length, 1 + Math.floor((u - write) / 70));
        text = strike.after.slice(0, chars);
      }
      const selected = active && u >= 300 && u < write;
      if (strike.cut.textContent !== text) strike.cut.textContent = text;
      const background = selected ? 'var(--lp-yellow)' : '';
      if (strike.cut.style.background !== background) {
        strike.cut.style.background = background;
        strike.cut.style.color = selected ? '#121210' : '';
      }
      if (!active) continue;
      // the line reflows as it is rewritten: find the cut again whenever its text changed
      if (strike.key !== text) {
        strike.key = text;
        measure(strike.cut, strike.ends);
      }
      // over the cut, down, select it, a blow per character typed, up
      const e = strike.ends;
      const from = i === 0 ? headRail[1] - 14 : scene.strikes[i - 1].ends.x1 - 4;
      headX = u < 220 ? mix(from, e.x0 + 4, inOut(u / 220)) : chars > 0 ? e.x1 - 4 : e.x0 + 4;
      const drop = u < 220 ? 0 : u < 300 ? (u - 220) / 80 : u < typing ? 1 : 1 - (u - typing) / 120;
      headY = mix(headRail[2] + 6, (chars > 0 ? e.y1 : e.y0) + 2, ease(clamp(drop)));
      if (chars > 0 && (u - write) % 70 < 26) headY += 2;
    }
    gl.set('uHead', [headX, headY, 0, 0]);

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
    if (live && e >= 300 && e < 300 + next.length * 40) {
      typed = Math.min(next.length, 1 + Math.floor((e - 300) / 40));
      value = next.slice(0, typed);
    }
    if (cut.textContent !== value) cut.textContent = value;
    const background = select ? 'var(--lp-yellow)' : '';
    if (cut.style.background !== background) {
      cut.style.background = background;
      cut.style.color = select ? '#121210' : '';
    }
    // the caret after the edited text, found again whenever the line reflows
    const caretShown = live && e >= 0 && e < 300 + next.length * 40 + 200;
    const caretKey = caretShown ? value : '';
    if (caretKey !== editCaretKey) {
      editCaretKey = caretKey;
      editCaret.style.visibility = caretShown ? 'visible' : '';
      // solid while it types, like an editor's
      editCaret.style.animation = caretShown ? 'none' : '';
      if (caretShown) {
        measure(cut, editEnds);
        editCaret.style.transform = `translate(${editEnds.x1.toFixed(1)}px, ${editEnds.y1.toFixed(1)}px)`;
      }
    }
    const edited = !live || e >= 300 + next.length * 40 + 120;
    if (edited !== scene.edited) {
      scene.edited = edited;
      scene.before.style.visibility = edited ? 'hidden' : 'visible';
      scene.after.style.visibility = edited ? 'visible' : 'hidden';
      if (edited && live)
        scene.after.animate(ditherKeyframes(2), { duration: 3 * TICK, easing: 'linear' });
    }

    status(t, live);
    gl.invalidate();
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

  /** where a file's top right corner sits, `s` along the chain: in its gripper's jaw */
  function gripper(s: number) {
    point[0] = chain.tail[0] - JAW;
    point[1] = chain.tail[1] - s - 12;
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
    if (phase !== 'play') return;
    const now = time * 1000;
    const dt = last < 0 ? 0 : Math.min(50, now - last);
    last = now;
    clock += dt;
    if (clock < beats.end) render(clock);
    else rest();
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
    last = -1;
    landedShown = -1;
    flashed = -1;
    editCaretKey = '';
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
      scenes[i].cell.hidden = !on;
      scenes[i].column.hidden = !on;
      scenes[i].counter.hidden = !on;
      chips[i].ariaPressed = String(on);
    }
    command.textContent = `npx @fumadocs/cli ${scene.args}`;
    layout();
  }

  function onPlay(event: MouseEvent) {
    const index = Number((event.currentTarget as HTMLElement).dataset.play);
    show(index);
    play();
  }

  // any of the stage on screen at load: it stays finished, the replay is there; otherwise it plays
  // once the crate comes into view. The canvas pauses itself off screen, the clock skips that time
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === root) {
          if (first && !entry.isIntersecting && !reduce.matches) {
            phase = 'ready';
            landedShown = -1;
            render(0);
          }
          first = false;
          continue;
        }
        last = -1;
        if (phase === 'ready' && entry.intersectionRatio >= START) play();
      }
    },
    { threshold: [0, START] },
  );

  const resize = new ResizeObserver(layout);
  const theme = new MutationObserver(colours);
  resize.observe(root);
  theme.observe(html, { attributes: true, attributeFilter: ['class'] });
  observer.observe(root);
  observer.observe(crate);
  replay.addEventListener('click', play);
  for (const chip of chips) chip.addEventListener('click', onPlay);
  colours();
  layout();

  return () => {
    observer.disconnect();
    resize.disconnect();
    theme.disconnect();
    replay.removeEventListener('click', play);
    for (const chip of chips) chip.removeEventListener('click', onPlay);
    for (const s of scenes) s.flaps.destroy();
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
