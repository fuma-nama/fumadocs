import { type Cable, cable, wipe } from '../../lib/cable';
import { DITHER_MASKS, ditherKeyframes } from '../../lib/dither';
import {
  between,
  createMesh,
  identity,
  type Mat4,
  MATERIAL,
  multiply,
  type PartSpec,
  transform,
  type Vec3,
} from '../../lib/mesh';
import { clamp, easeInOut, easeOut, mix, TICK } from '../../lib/motion';
import { dot, FIRST, pop, reached, reduce } from '../../lib/script';
import { report } from '../../lib/status';
import type { Layer } from '../../ui/chip';
import { CORE, type Look, NAMES, type Option, OPTIONS, type SwapLayer } from './data';
import {
  BASE,
  BED,
  BOOM,
  BOOM_PIECES,
  BOUNDS,
  CARD,
  D,
  DEEP,
  DEPTH,
  DISPLAYS,
  FLOOR,
  FOREARM,
  FOREARM_PIECES,
  GAP,
  GAUGE,
  INLET,
  LEAF,
  LIGHT,
  MODULES,
  type Piece,
  PLACES,
  PLATE,
  RACK,
  RAM_FOOT,
  RAM_HEAD,
  RAM_PIECES,
  reach,
  REST,
  ROOM,
  SHEET,
  SHOULDER,
  STACK,
  TOOL,
  TOOL_PIECES,
  VIEWS,
  W,
  WELL,
} from './scene';

type Point = [number, number];

/** a leader's draw: quick off its module, easing into its row */
const REEL = 'cubic-bezier(0.33, 1, 0.68, 1)';
const TURN = Math.PI * 2;
const DEGREE = Math.PI / 180;

const CLEAR = 34;
const HOVER = 24;
/** ms, on the arm's TICK grid */
const TIMING = {
  fetch: 3 * TICK,
  open: TICK,
  read: 8 * TICK,
  carry: 4 * TICK,
  land: 1.5 * TICK,
  jolt: 2 * TICK,
  lead: 4 * TICK,
  /** a leader's port easing to its rest place once its module stops */
  port: TICK,
  fill: 2 * TICK,
  back: TICK,
  before: 15 * TICK,
  reach: 3 * TICK,
  touch: TICK,
  crt: { line: TICK, dot: TICK / 2, hold: TICK / 2 },
  after: 4 * TICK,
  park: 4 * TICK,
  step: TICK,
  /** when each page starts to fall: the intervals differ, so the third landing is its own */
  drops: [0, 3 * TICK, 7 * TICK],
  /** a page's fall to the bin's rim, then its sheet's tip in */
  fall: 3 * TICK,
  tip: 3 * TICK,
  band: 2 * TICK,
  drain: 2 * TICK,
  lift: 3 * TICK,
  draw: 2 * TICK,
  holds: {
    framework: 6 * TICK,
    content: 4 * TICK,
    core: 6 * TICK,
    ui: 4 * TICK,
  } satisfies Record<Layer, number>,
};
/** css px round a display's lines */
const INSET = 4;
const CRT_MS = 2 * (TIMING.crt.line + TIMING.crt.dot) + TIMING.crt.hold;
/** the option changes with the module a dot, half its hold gone */
const CHANGE = TIMING.crt.line + TIMING.crt.dot + TIMING.crt.hold / 2;
const SCRIPT: SwapLayer[] = ['ui', 'content', 'framework'];
/** a leader's jog is RUN px at least: shorter, it runs straight along its row's line where the
 * module's face edge reaches it, its port EDGE px clear of the edge's ends, or leaves a run lower */
const RUN = 24;
const EDGE = 12;
/** each leader's jog off halfway, UI's right of Core's, so lifted, neither crosses the other */
const LANES: Record<Layer, number> = { ui: 8, core: -8, content: 0, framework: 0 };
/** each sheet's place on the pile off the bed: units across and forward, and degrees turned */
const PILE = [
  [-2, 1, 2],
  [3, -2, -1],
  [0, 2, 2.5],
];
/** a sheet's parts dithering out by `uFade`, shaded as paper */
const FADE = MATERIAL.figure;
/** a sheet's hinge, the bottom back edge it tips about, from its middle */
const HINGE: Vec3 = [0, CARD[1] / 2, LEAF / 2];
/** a sheet's top left on its face, where its card's corner is */
const CORNER: Vec3 = [-CARD[0] / 2, CARD[1] / 2, LEAF / 2];
const FADING = `uniform float uFade;
bool figure(int m, vec3 world, vec3 n, vec2 px, inout vec4 color) {
  if (bayer8(cell + 3.0) >= uFade) discard;
  return false;
}`;
/** Geist Pixel at 13.16px in its 16px line: its caps from 2.5px down, its baseline at 12px */
const LINE = 16;
/** the UI's page: its words, and the room round them */
const WORDS = 11;
const MARGIN = 8;
const CAP_TOP = 2.5;
const BASELINE = 12;

interface Move {
  at: number;
  ms: number;
  from: Point;
  to: Point;
  ease: (t: number) => number;
}

interface Cue {
  at: number;
  run: (at: number) => void;
}

interface Leader {
  svg: HTMLElement;
  /** its ports: on its module's face edge, and on its row on the panel's edge */
  port: HTMLElement;
  inlet: HTMLElement;
  /** NaN till its module lands, -Infinity for one drawn whole */
  at: number;
  /** its waypoints as last drawn, its cable along them, and the cable's draw-on */
  route: string;
  cable: Cable | undefined;
  drawing: Animation | undefined;
  /** its row's port, stage px */
  end: Point;
  /**
   * its module's port up its face edge from the middle, in the module's units: NaN till it's
   * placed; where it was while the module moves, then eased from there to its rest place
   */
  y: number;
  settle: { at: number; from: number } | undefined;
  /** the module's face edge as last traced: its x, middle and top, stage px */
  seen: number[];
  /** its clips' shares along each run of its jog route, kept from when it first moved till the
   * figure rests */
  places: number[][] | undefined;
}

interface Slot {
  layer: Layer;
  parts: number[];
  locals: Float32Array[];
  pieces: Piece[];
  matrix: Mat4;
  scale: Point;
  plate: HTMLElement;
  plateY: number;
  name: HTMLElement;
  names: string[];
  row: HTMLElement;
  chips: HTMLButtonElement[];
  leader: Leader;
  option: number;
  look: Look | undefined;
  state: 'off' | 'held' | 'placed';
  crt: { at: number; kind: 'open' | 'swap' } | null;
}

export function createParts(root: HTMLElement): (() => void) | undefined {
  const canvas = root.querySelector('canvas');
  const panel = root.querySelector<HTMLElement>('[data-window]');
  const rows = panel?.querySelector<HTMLElement>('[data-rows]');
  if (!canvas || !panel || !rows) return;
  const holder = canvas.parentElement!;

  const specs: PartSpec[] = [];
  let ids = 0;
  // only what rests on the floor casts a shadow: never the arm, a module once it's down
  function add(pieces: Piece[], shadow = false): number[] {
    const out: number[] = [];
    const body = ++ids;
    for (const piece of pieces) {
      out.push(specs.length);
      specs.push({
        shape: piece.shape,
        id: piece.solid ? ++ids : body,
        material: piece.material,
        shadow,
      });
    }
    return out;
  }
  function local(piece: Piece): Float32Array {
    return transform(identity(), piece.at, piece.turn, piece.size);
  }
  const floor = specs.length;
  specs.push({ shape: FLOOR.shape, id: 0, material: FLOOR.material, shadow: false });
  const base = add(BASE, true);
  const boom = add(BOOM_PIECES);
  const forearm = add(FOREARM_PIECES);
  const tool = add(TOOL_PIECES);
  const ram = add(RAM_PIECES);
  const sheets = [add(SHEET), add(SHEET), add(SHEET)];
  const links = {
    boom: BOOM_PIECES.map(local),
    forearm: FOREARM_PIECES.map(local),
    tool: TOOL_PIECES.map(local),
    sheet: SHEET.map(local),
  };
  const slots: Slot[] = [];
  for (const module of MODULES) {
    const layer = module.layer;
    const plate = root.querySelector<HTMLElement>(`[data-plate="${layer}"]`);
    const row = rows.querySelector<HTMLElement>(`[data-row="${layer}"]`);
    const svg = root.querySelector<HTMLElement>(`[data-leader="${layer}"]`);
    const port = root.querySelector<HTMLElement>(`[data-port="${layer}"]`);
    const inlet = row?.querySelector<HTMLElement>('[data-port]');
    if (!plate || !row || !svg || !port || !inlet) return;
    const names: string[] = [];
    for (const option of optionsOf(layer)) names.push(option.title);
    slots.push({
      layer,
      parts: add(module.pieces),
      locals: module.pieces.map(local),
      pieces: module.pieces,
      matrix: identity(),
      scale: [1, 1],
      plate,
      plateY: module.pieces.find((piece) => piece.plate)!.at[1],
      name: plate.querySelector<HTMLElement>('[data-name]')!,
      names,
      row,
      chips: [...row.querySelectorAll<HTMLButtonElement>('[data-chip]')],
      leader: {
        svg,
        port,
        inlet,
        at: Number.NaN,
        route: '',
        cable: undefined,
        drawing: undefined,
        end: [0, 0],
        y: Number.NaN,
        settle: undefined,
        seen: [],
        places: undefined,
      },
      option: 0,
      look: layer === 'core' ? undefined : OPTIONS[layer][0].look,
      state: 'off',
      crt: null,
    });
  }
  const framework = slots[slotOf('framework')];
  const source = slots[slotOf('content')];
  const core = slots[slotOf('core')];
  const ui = slots[slotOf('ui')];
  let served = 0;
  let listed = 0;
  let typed = 0;
  let found = false;
  let reloading = false;
  let drawn = 0;
  let treeFrom = 0;
  let pageFrom = 0;
  /** when each page began to fall, NaN till it does; and the pile cleared last, as it was */
  const falls = [Number.NaN, Number.NaN, Number.NaN];
  let drain: { at: number; look?: Look; count: number } = { at: -Infinity, count: 0 };
  /** the rack's opening, 0 to 1, and its latest move */
  let lift = 0;
  let lifting = { at: -Infinity, to: 0 };
  const caption = root.querySelector<HTMLElement>('[data-caption]')!;
  let said = '';
  /** css px the stage runs past the page's gutter on its left */
  let bleed = 0;
  const serve = root.querySelector<HTMLElement>('[data-display="framework"]')!;
  const serveLines = [...serve.querySelectorAll<HTMLElement>('[data-line]')];
  const tree = root.querySelector<HTMLElement>('[data-display="core"]')!;
  const search = tree.querySelector<HTMLElement>('[data-search]')!;
  const typing = tree.querySelector<HTMLElement>('[data-query]')!;
  const branches = [...tree.querySelectorAll<HTMLElement>('[data-line]')];
  const page = root.querySelector<HTMLElement>('[data-display="ui"]')!;
  const side = page.querySelector<HTMLElement>('[data-side]')!;
  const entries = [...side.querySelectorAll<HTMLElement>('[data-line]')];
  const heading = page.querySelector<HTMLElement>('[data-title]')!;
  const toc = page.querySelector<HTMLElement>('[data-toc]')!;
  const cards = [...root.querySelectorAll<HTMLElement>('[data-page]')];

  const mesh = createMesh(canvas, {
    parts: specs,
    onFrame: frame,
    onResize: layout,
    shader: { scene: FADING },
  });
  if (!mesh) return;
  const plates = slots.map((slot) =>
    mesh.anchor(slot.plate, slot.matrix, [
      PLATE.x - PLATE.w / 2,
      slot.plateY + PLATE.h / 2,
      PLATE.z,
    ]),
  );
  const screens = (['framework', 'core', 'ui'] as const).map((layer, k) => {
    const { at, size } = DISPLAYS[layer];
    const corner: Vec3 = [at[0] - size[0] / 2, at[1] + size[1] / 2, at[2]];
    return mesh.anchor([serve, tree, page][k], slots[slotOf(layer)].matrix, corner);
  });
  const falling = cards.map((card) => mesh.anchor(card, source.matrix));

  mesh.place(floor, local(FLOOR));
  for (let i = 0; i < BASE.length; i++) mesh.place(base[i], local(BASE[i]));
  mesh.light(LIGHT, BOUNDS[0], BOUNDS[1]);

  const whole = matchMedia('(width >= 48rem)');
  const beside = matchMedia('(width >= 64rem)');
  /** CSS px a world unit spans */
  let scale = 1;
  let rack = RACK;
  /** the canvas's top: pages fall from just under it, clear of the title over it */
  let ceiling = 0;
  let rest: Point = REST;
  let inlet = INLET[0];

  function layout(width: number, height: number) {
    const view = whole.matches ? VIEWS.wide : VIEWS.phone;
    scale = width / (view.right - view.left);
    rack = Math.max(RACK, (CARD[1] + ROOM) / scale - GAP);
    ceiling = view.bottom + height / scale;
    // the pad waits with its module ROOM left of the falling pages, or as near as keeps it on the canvas
    const touch = INLET[0] - CARD[0] / 2 / scale - DEPTH[0] * (D / 2 + INLET[2]) - W;
    const least = view.left + DEPTH[0] * (D / 2);
    rest = [Math.min(REST[0], Math.max(least, touch - ROOM / scale)), REST[1]];
    inlet = INLET[0] + Math.max(0, least - touch);
    if (!started) pad = rest;
    mesh!.camera({
      width,
      height,
      scale,
      origin: [-view.left * scale, height + view.bottom * scale],
      depth: DEPTH,
      z: [400, -400],
    });
    fit();
    mesh!.invalidate();
  }

  let running: (string | undefined)[] = [];
  let serveRows = 2;
  let treeRows = 4;

  const measure = document.createElement('canvas').getContext('2d')!;
  function fit() {
    const w = Math.round(PLATE.w * scale);
    const h = Math.round(PLATE.h * scale);
    const inner = h - 2;
    const badge = h < 20 ? 0 : inner;
    const icon = inner >= 36 ? 16 : 8;
    const two = h >= 36;
    let widest = 0;
    measure.font = `13.16px ${getComputedStyle(slots[0].name).fontFamily}`;
    for (const slot of slots) {
      for (const option of optionsOf(slot.layer)) {
        widest = Math.max(widest, measure.measureText(option.short).width);
      }
    }
    const space = Math.min(h < 24 ? 8 : 10, Math.floor(((w - 2 - badge - widest) * 2) / 3));
    const room = w - 2 - badge - 1.5 * space;
    const style = root.style;
    style.setProperty('--parts-plate-w', `${w}px`);
    style.setProperty('--parts-plate-h', `${h}px`);
    style.setProperty('--parts-icon', `${icon}px`);
    style.setProperty('--parts-icon-at', `${Math.floor((inner - icon) / 2)}px`);
    style.setProperty('--parts-pad', `${space}px`);
    const inset = Math.min(8, (inner - 2 * (BASELINE - CAP_TOP) - 3) / 2);
    const role = Math.floor(inset - CAP_TOP);
    const name = two
      ? Math.round(inner - inset - BASELINE)
      : Math.round((inner - BASELINE - CAP_TOP) / 2);
    style.setProperty('--parts-text-at', `${two ? role : name}px`);
    style.setProperty('--parts-name-at', `${two ? name - role - LINE : 0}px`);
    for (const slot of slots) {
      slot.plate.querySelector<HTMLElement>('[data-badge]')!.hidden = badge === 0;
      slot.plate.querySelector<HTMLElement>('[data-role]')!.hidden = !two;
      slot.names = [];
      for (const option of optionsOf(slot.layer)) {
        slot.names.push(
          measure.measureText(option.title).width <= room ? option.title : option.short,
        );
      }
      slot.name.textContent = slot.names[slot.option];
      slot.leader.route = '';
      slot.leader.y = Number.NaN;
    }
    for (const [k, layer] of (['framework', 'core', 'ui'] as const).entries()) {
      const [w, h] = DISPLAYS[layer].size;
      const el = [serve, tree, page][k];
      el.style.width = `${Math.round(w * scale)}px`;
      el.style.height = `${Math.round(h * scale)}px`;
    }
    const fits = (line: string, layer: 'framework' | 'core') =>
      measure.measureText(line).width <= DISPLAYS[layer].size[0] * scale - 2 * INSET;
    const lines = (layer: 'framework' | 'core') =>
      Math.floor((DISPLAYS[layer].size[1] * scale) / LINE);
    running = OPTIONS.framework.map((option) =>
      [option.title, option.short].find((name) => fits(`${name} running`, 'framework')),
    );
    serveRows = fits('serving /docs', 'framework') ? Math.min(2, lines('framework')) : 0;
    let longest = '';
    for (const option of OPTIONS.content) {
      for (const page of option.pages!)
        if (page.title.length > longest.length) longest = page.title;
    }
    treeRows = fits(longest, 'core') && lines('core') >= 3 ? Math.min(4, lines('core')) : 0;
    folded = -1;
    bleed = Math.max(0, -parseFloat(getComputedStyle(holder).marginLeft));
    caption.style.maxWidth = `${holder.clientWidth - bleed}px`;
    setCaption();
    if (!beside.matches) return;
    const middle = (mesh!.project([0, 0, D / 2])[1] + mesh!.project([0, STACK, D / 2])[1]) / 2;
    const top = Math.round(middle - panel!.offsetHeight / 2);
    style.setProperty('--parts-panel', `${top}px`);
    const x = panel!.offsetLeft - holder.offsetLeft;
    for (const slot of slots) {
      const name = slot.row.querySelector('p')!;
      const y = Math.round(name.offsetTop + name.offsetHeight / 2);
      slot.leader.inlet.style.top = `${y - 6}px`;
      slot.leader.end = [x, top + rows!.offsetTop + slot.row.offsetTop + y];
    }
  }
  // names measured before the pixel type loaded are measured again once it has
  void document.fonts.ready.then(() => {
    fit();
    mesh.invalidate();
  });

  function optionsOf(layer: Layer): Omit<Option, 'look'>[] {
    return layer === 'core' ? [CORE] : OPTIONS[layer];
  }

  function slotOf(layer: Layer): number {
    return MODULES.findIndex((module) => module.layer === layer);
  }

  let clock = 0;
  let last = Number.NaN;
  let playing = false;
  let held = false;
  const paused: Animation[] = [];
  const moves: Move[] = [];
  const cues: Cue[] = [];
  let pad: Point = rest;
  let end = 0;
  let busy = true;
  const home: Point = [-W / 2 - CLEAR, PLACES[slotOf('content')]];

  const queued = () =>
    Math.max(clock, moves.length > 0 ? moves[moves.length - 1].at + moves[moves.length - 1].ms : 0);

  function moveTo(to: Point, ms: number, ease = easeInOut, at = queued()) {
    moves.push({ at, ms, from: pad, to, ease });
    pad = to;
    end = Math.max(end, at + ms);
    return at + ms;
  }

  function cue(at: number, run: (at: number) => void) {
    cues.push({ at, run });
    cues.sort((a, b) => a.at - b.at);
    end = Math.max(end, at);
  }

  function lead(i: number, at: number) {
    const leader = slots[i].leader;
    leader.at = at;
    leader.route = '';
    leader.y = Number.NaN;
    leader.places = undefined;
    leader.svg.dataset.state = 'on';
    leader.port.dataset.state = 'on';
  }

  function tell(i: number, animate: boolean) {
    const slot = slots[i];
    light(slot);
    slot.row.dataset.state = 'on';
    const first = panel!.dataset.state === 'off';
    if (first) panel!.dataset.state = 'on';
    if (!animate) return;
    if (!first) {
      slot.row.animate(ditherKeyframes(2), { duration: TIMING.fill, easing: 'steps(16, start)' });
      return;
    }
    const from: Point = beside.matches
      ? [
          slot.leader.end[0] - (panel!.offsetLeft - holder.offsetLeft),
          slot.leader.end[1] - (panel!.offsetTop - holder.offsetTop),
        ]
      : [0, rows!.offsetTop + slot.row.offsetTop + slot.row.offsetHeight / 2];
    panel!.style.transformOrigin = `${from[0]}px ${from[1]}px`;
    dot(root, panel!.offsetLeft + from[0], panel!.offsetTop + from[1]);
    pop(panel!, FIRST);
  }

  function unlight(slot: Slot) {
    if (slot.layer === 'framework') served = 0;
    if (slot.layer === 'content') {
      let count = 0;
      for (const at of falls) if (clock - at >= TIMING.fall + TIMING.tip) count++;
      // the pile clears once its module has opened again as the new source
      drain = { at: clock + CRT_MS - CHANGE, look: slot.look, count };
      falls.fill(Number.NaN);
    }
    if (slot.layer === 'core') {
      listed = 0;
      typed = 0;
      found = false;
    }
    if (slot.layer === 'ui') drawn = 0;
  }

  function beat(
    i: number,
    k: number,
    from = source.option,
  ): { steps: Cue[]; ms: number; hold: number } {
    const slot = slots[i];
    const steps: Cue[] = [];
    const step = (at: number, run: (at: number) => void) => steps.push({ at, run });
    const tick = TIMING.step;
    const hold = TIMING.holds[slot.layer];
    switch (slot.layer) {
      case 'framework': {
        const title = OPTIONS.framework[k].title;
        step(0, () => {
          served = 1;
          report(root, `framework: ${title} running`);
        });
        step(tick, () => {
          served = 2;
        });
        return { steps, ms: 2 * tick, hold };
      }
      case 'content': {
        for (let n = 0; n < 3; n++) {
          step(TIMING.drops[n], (at) => {
            falls[n] = at;
          });
        }
        const filled = TIMING.drops[2] + TIMING.fall + TIMING.tip;
        step(filled, () => report(root, `content: 3 pages from ${OPTIONS.content[k].title}`));
        return { steps, ms: filled, hold };
      }
      case 'core': {
        const query = OPTIONS.content[from].query!;
        for (let n = 1; n <= 3; n++) {
          step((n - 1) * tick, () => {
            treeFrom = from;
            listed = n;
          });
        }
        for (let n = 1; n <= query.length; n++) {
          step((n + 2) * tick, () => {
            typed = n;
          });
        }
        const hit = (query.length + 3) * tick;
        step(hit, () => {
          found = true;
          report(root, 'core: search, page tree, TOC, i18n ready');
        });
        return { steps, ms: hit + tick, hold };
      }
      case 'ui': {
        for (let n = 1; n <= 3; n++) {
          step((n - 1) * TIMING.draw, () => {
            pageFrom = from;
            drawn = n;
            if (n === 3) report(root, 'ui: page rendered');
          });
        }
        return { steps, ms: 3 * TIMING.draw, hold };
      }
    }
  }

  let beaten = 0;

  function play(i: number, k: number, at: number, from?: number): number {
    const { steps, ms, hold } = beat(i, k, from);
    for (const step of steps) cue(at + step.at, step.run);
    beaten = at + ms + hold;
    return at + ms;
  }

  /** what layer `i` set to option `k` did to the docs, built or swapped to */
  function told(i: number, k: number, swapped = false): string {
    const now = swapped ? ' now' : '';
    switch (slots[i].layer) {
      case 'framework':
        return `Docs${now} served by ${OPTIONS.framework[k].title}`;
      case 'content': {
        const title = OPTIONS.content[k].title;
        return swapped ? `Pages now sourced from ${title}` : `3 pages loaded from ${title}`;
      }
      case 'core': {
        const titles = OPTIONS.content[source.option].pages!.map((page) => page.title);
        return `${NAMES.core} built the page tree: ${titles.join(', ')}`;
      }
      case 'ui': {
        const option = OPTIONS.ui[k];
        return `Page${now} rendered with ${option.caption ?? option.title}`;
      }
    }
  }

  function say(at: number, words: string) {
    const all = words.split(' ');
    for (let n = 1; n <= all.length; n++) {
      cue(at + (n - 1) * TIMING.step, () => {
        said = all.slice(0, n).join(' ');
      });
    }
  }

  function light(slot: Slot) {
    for (const [k, chip] of slot.chips.entries()) {
      chip.ariaChecked = String(k === slot.option);
      chip.tabIndex = k === slot.option ? 0 : -1;
    }
  }

  function build(i: number) {
    const slot = slots[i];
    const y = PLACES[i];
    const fetched = moveTo(rest, TIMING.fetch);
    cue(fetched - TIMING.open, () => {
      slot.state = 'held';
      slot.crt = { at: fetched - TIMING.open, kind: 'open' };
      report(root, `building ${slot.layer}`);
    });
    if (i > 0) moveTo(rest, TIMING.read);
    moveTo([-W / 2, y + HOVER], TIMING.carry);
    if (beaten > queued()) moveTo(pad, beaten - queued());
    const landed = moveTo([-W / 2, y], TIMING.land, easeOut);
    cue(landed, () => {
      slot.state = 'placed';
      jolt = { at: landed, depth: i };
      lead(i, landed);
    });
    cue(landed + TIMING.lead, () => tell(i, true));
    play(i, slot.option, landed);
    say(landed, told(i, slot.option));
    moveTo([-W / 2 - CLEAR, y], TIMING.back, easeOut);
  }

  function swap(i: number, hold: number, to = next(i)) {
    const y = PLACES[i];
    const layer = slots[i].layer;
    if (layer === 'core') return;
    const reach = queued();
    moveTo([-W / 2 - CLEAR, y], TIMING.reach);
    const touched = moveTo([-W / 2, y], TIMING.touch, easeOut);
    cue(touched, () => {
      slots[i].crt = { at: touched, kind: 'swap' };
    });
    cue(touched + CHANGE, () => {
      unlight(slots[i]);
      choose(i, to);
    });
    moveTo([-W / 2 - CLEAR, y], TIMING.back, easeOut, touched + CRT_MS);
    let after = play(i, to, touched + CRT_MS);
    say(touched + CRT_MS, told(i, to, true));
    const tick = TIMING.step;
    if (layer === 'content') {
      // the rack opens for the pages to fall from under the core, and shuts after
      cue(reach, (at) => {
        lifting = { at, to: 1 };
      });
      cue(after, (at) => {
        lifting = { at, to: 0 };
      });
      after += TIMING.lift;
      cue(after, () => unlight(core));
      after = play(slots.indexOf(core), 0, after, to);
      cue(after, () => unlight(ui));
      after = play(slots.indexOf(ui), ui.option, after, to);
    }
    if (layer === 'framework') {
      cue(after, () => {
        reloading = true;
      });
      cue(after + tick, () => {
        reloading = false;
        drawn = 0;
      });
      cue(after + 2 * tick, () => {
        drawn = 3;
      });
      after += 2 * tick;
    }
    const wait = after + hold - queued();
    if (wait > 0) moveTo(pad, wait);
  }

  function next(i: number): number {
    return (slots[i].option + 1) % optionsOf(slots[i].layer).length;
  }

  function choose(i: number, k: number) {
    const slot = slots[i];
    if (slot.layer === 'core') return;
    const option = OPTIONS[slot.layer][k];
    slot.option = k;
    slot.look = option.look;
    report(root, `${slot.layer}: ${option.title}`);
    slot.name.textContent = slot.names[k];
    slot.plate.setAttribute('aria-label', `${NAMES[slot.layer]}: ${option.title}`);
    light(slot);
  }

  let jolt = { at: -1e9, depth: 0 };

  function done() {
    busy = false;
    said = '';
    for (const slot of slots) {
      if (slot.layer === 'core') continue;
      slot.plate.dataset.ready = '';
      for (const chip of slot.chips) chip.disabled = false;
    }
    report(root, `${MODULES.length} layers`);
  }

  function start() {
    for (let i = 0; i < MODULES.length; i++) build(i);
    moveTo(pad, TIMING.before);
    for (const layer of SCRIPT) swap(slotOf(layer), TIMING.after);
    moveTo(home, TIMING.park);
    cue(end, done);
    playing = true;
    mesh!.invalidate();
  }

  function finish() {
    for (const [i, slot] of slots.entries()) {
      slot.state = 'placed';
      lead(i, -Infinity);
    }
    pad = home;
    for (const layer of SCRIPT) choose(slotOf(layer), 1);
    for (const [i, slot] of slots.entries()) {
      for (const step of beat(i, slot.option).steps) step.run(-Infinity);
    }
    show();
    for (let i = 0; i < slots.length; i++) tell(i, false);
    done();
    mesh!.invalidate();
  }

  function press(i: number, to: number) {
    if (busy || slots[i].layer === 'core' || to === slots[i].option) return;
    if (reduce()) {
      choose(i, to);
      mesh!.invalidate();
      return;
    }
    busy = true;
    swap(i, 0, to);
    moveTo(home, TIMING.park);
    cue(queued(), () => {
      busy = false;
      said = '';
    });
    playing = true;
    last = Number.NaN;
    mesh!.invalidate();
  }

  function pick(px: number, py: number): number {
    const [x0, y0] = mesh!.unproject(px, py);
    let found = -1;
    let nearest = -Infinity;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].state !== 'placed') continue;
      const half = MODULES[i].height / 2;
      const near = Math.min(D / 2, (W / 2 - x0) / DEPTH[0], (PLACES[i] + half - y0) / DEPTH[1]);
      const far = Math.max(-D / 2, (-W / 2 - x0) / DEPTH[0], (PLACES[i] - half - y0) / DEPTH[1]);
      if (near >= far && near > nearest) {
        nearest = near;
        found = i;
      }
    }
    return found;
  }

  let selected = '';
  const onDown = () => {
    selected = getSelection()?.toString() ?? '';
  };
  const onPress = (event: MouseEvent) => {
    const now = getSelection()?.toString() ?? '';
    // a click that ends a text selection isn't a press
    if (event.detail > 0 && now !== '' && now !== selected) return;
    const target = event.target as Element;
    const chip = target.closest<HTMLButtonElement>('[data-chip]');
    if (chip) {
      const i = slots.findIndex((slot) => slot.chips.includes(chip));
      press(i, Number(chip.dataset.chip));
      return;
    }
    const face = target.closest<HTMLElement>('[data-plate], [data-display]');
    const rect = canvas!.getBoundingClientRect();
    const i = face
      ? slotOf((face.dataset.plate ?? face.dataset.display) as Layer)
      : target === canvas
        ? pick(event.clientX - rect.left, event.clientY - rect.top)
        : -1;
    if (i >= 0) press(i, next(i));
  };
  const onKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.dataset.plate && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const i = slots.findIndex((slot) => slot.plate === target);
      press(i, next(i));
      return;
    }
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0 || target.dataset.chip === undefined) return;
    event.preventDefault();
    const i = slots.findIndex((slot) => slot.chips.includes(target as HTMLButtonElement));
    const chips = slots[i].chips;
    const k = (Number(target.dataset.chip) + step + chips.length) % chips.length;
    chips[k].focus();
    press(i, k);
  };
  const onPoint = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const rect = canvas!.getBoundingClientRect();
    const i = busy ? -1 : pick(event.clientX - rect.left, event.clientY - rect.top);
    const cursor = i >= 0 && slots[i].layer !== 'core' ? 'pointer' : '';
    if (canvas!.style.cursor !== cursor) canvas!.style.cursor = cursor;
  };
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('click', onPress);
  root.addEventListener('keydown', onKey);
  canvas.addEventListener('pointermove', onPoint);

  function hold(next: boolean) {
    if (next === held) return;
    held = next;
    if (held) {
      for (const animation of root.getAnimations({ subtree: true })) {
        if (animation.playState !== 'running') continue;
        animation.pause();
        paused.push(animation);
      }
    } else for (const animation of paused.splice(0)) animation.play();
  }

  let started = false;
  // plays once half on screen; its clock holds under a quarter
  const shown = new IntersectionObserver(
    (entries) => {
      const ratio = entries[entries.length - 1].intersectionRatio;
      if (ratio >= 0.5) {
        hold(false);
        if (!started) {
          started = true;
          start();
        }
        mesh!.invalidate();
      } else if (ratio < 0.25) hold(true);
    },
    { threshold: [0, 0.25, 0.5] },
  );

  const angles: Point = [0, 0];
  const from: Point = [0, 0];
  const to: Point = [0, 0];
  const linkM = identity();
  const partM = identity();
  const FULL: Point = [1, 1];

  function arm(): Point {
    let move: Move | undefined;
    for (const item of moves) {
      if (item.at > clock) break;
      move = item;
    }
    if (!move) {
      reach(pad, angles);
      return angles;
    }
    return bend(move.from, move.to, move.ease(Math.min(1, (clock - move.at) / move.ms)), angles);
  }

  function bend(a: Point, b: Point, done: number, out: Point): Point {
    reach(a, from);
    reach(b, to);
    for (let k = 0; k < 2; k++) {
      out[k] = mix(from[k], to[k] + TURN * Math.round((from[k] - to[k]) / TURN), done);
    }
    return out;
  }

  function crt(at: number, kind: 'open' | 'swap', now: number): Point {
    const phase = TIMING.crt;
    let t = now - at;
    if (kind === 'open') t += phase.line + phase.dot + phase.hold;
    if (t < phase.line) return [1, mix(1, 0.02, easeInOut(t / phase.line))];
    t -= phase.line;
    if (t < phase.dot) return [mix(1, 0.02, easeInOut(t / phase.dot)), 0.02];
    t -= phase.dot;
    if (t < phase.hold) return [0.02, 0.02];
    t -= phase.hold;
    if (t < phase.dot) return [mix(0.02, 1, easeInOut(t / phase.dot)), 0.02];
    t -= phase.dot;
    if (t < phase.line) return [1, mix(0.02, 1, easeInOut(t / phase.line))];
    return FULL;
  }

  function frame() {
    const now = performance.now();
    if (playing && !held) {
      if (!Number.isNaN(last)) clock += Math.min(now - last, 50);
      last = now;
    } else last = Number.NaN;
    while (cues.length > 0 && cues[0].at <= clock) {
      const due = cues.shift()!;
      due.run(due.at);
    }
    lift = mix(1 - lifting.to, lifting.to, easeInOut(clamp((clock - lifting.at) / TIMING.lift)));

    const [b, f] = arm();
    const elbow: Point = [SHOULDER[0] + Math.cos(b) * BOOM, SHOULDER[1] + Math.sin(b) * BOOM];
    const wrist: Point = [elbow[0] + Math.cos(f) * FOREARM, elbow[1] + Math.sin(f) * FOREARM];
    const padNow: Point = [wrist[0] + TOOL, wrist[1]];

    placeLink(boom, links.boom, [SHOULDER[0], SHOULDER[1], 0], b);
    placeLink(forearm, links.forearm, [elbow[0], elbow[1], 0], f);
    placeLink(tool, links.tool, [wrist[0], wrist[1], 0], 0);
    const head: Vec3 = [
      SHOULDER[0] + Math.cos(b) * RAM_HEAD[0] - Math.sin(b) * RAM_HEAD[1],
      SHOULDER[1] + Math.sin(b) * RAM_HEAD[0] + Math.cos(b) * RAM_HEAD[1],
      RAM_FOOT[2],
    ];
    const split: Vec3 = [
      mix(RAM_FOOT[0], head[0], 0.55),
      mix(RAM_FOOT[1], head[1], 0.55),
      RAM_FOOT[2],
    ];
    mesh!.place(ram[0], between(partM, RAM_FOOT, split, 18));
    mesh!.place(ram[1], between(partM, split, head, 9));

    let moving = playing && (clock < end || cues.length > 0);
    const busy = moving;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const scale = slot.crt ? crt(slot.crt.at, slot.crt.kind, clock) : FULL;
      if (slot.crt && clock - slot.crt.at > CRT_MS) slot.crt = null;
      let y = PLACES[i];
      let x = 0;
      if (slot.state === 'held') {
        x = padNow[0] + W / 2;
        y = padNow[1];
      }
      const since = clock - jolt.at;
      if (slot.state === 'placed' && i <= jolt.depth && since < TIMING.jolt) {
        y -= 2 * Math.sin((since / TIMING.jolt) * Math.PI);
        moving = true;
      }
      if (slot === core || slot === ui) y += lift * rack;
      // a module opening in the pad grows out of it, one swapped on the stack round its middle
      const pivot = slot.crt?.kind === 'open' ? -W / 2 : 0;
      transform(slot.matrix, [x + pivot, y, 0], undefined, [scale[0], scale[1], scale[1]]);
      multiply(slot.matrix, slot.matrix, transform(linkM, [-pivot, 0, 0]));
      slot.scale = scale;
      const visible = slot.state !== 'off';
      const line = scale[1] < 0.5;
      for (let k = 0; k < slot.parts.length; k++) {
        const piece = slot.pieces[k];
        const part = slot.parts[k];
        const band = piece.band === undefined ? 1 : banded(piece.band);
        mesh!.show(part, visible && wears(piece, slot.look) && band > 0);
        mesh!.shadow(part, slot.state === 'placed' && piece.band === undefined);
        mesh!.material(part, line ? MATERIAL.accent : dress(piece, slot.look));
        const at = piece.band === undefined ? slot.locals[k] : bandAt(piece.band, band);
        mesh!.place(part, multiply(partM, slot.matrix, at));
      }
      if (slot === source) pile(line);
      plates[i].shown = visible;
      if (!Number.isNaN(slot.leader.at) && beside.matches && trace(i, busy)) moving = true;
    }
    show();
    if (!moving) playing = false;
    else if (!held) mesh!.invalidate();
  }

  /** how far up the window band `n` reaches: a third more than the last once its page lands, drained
   * with the pile it showed */
  function banded(n: number): number {
    const gone = cleared();
    if (n < drain.count && gone < 1) return ((n + 1) / 3) * (1 - gone);
    const since = clock - falls[n] - TIMING.fall - TIMING.tip;
    return since >= 0 ? (n + easeOut(clamp(since / TIMING.band))) / 3 : 0;
  }

  /** how far the last pile and its bands have cleared */
  function cleared(): number {
    return easeInOut(clamp((clock - drain.at) / TIMING.drain));
  }

  const bandM = identity();
  const sheetM = identity();
  const corners: Vec3[] = [];
  /** band `n` up to `reach` of the window, off its middle as its sheet lies off the bed */
  function bandAt(n: number, reach: number): Mat4 {
    const [x, y, z] = GAUGE.at;
    const [w, h, d] = GAUGE.size;
    const at: Vec3 = [x + PILE[n][0] / 2, y - (h * (1 - reach)) / 2, z - n * 0.2];
    return transform(bandM, at, undefined, [w, h * reach, d]);
  }

  /**
   * The pages' sheets in the bin: each from its card's place at the rim to its place on the pile,
   * tipping back about its bottom edge, shrunk to the well where the card is bigger; the last pile
   * dithering out
   */
  function pile(line: boolean) {
    const gone = cleared();
    if (gone < 1) mesh!.uniform('uFade', 1 - gone);
    const card = 1 / scale;
    const flat = Math.min(card, DEEP / CARD[1]);
    const rim = MODULES[1].height / 2;
    for (const [n, parts] of sheets.entries()) {
      const old = gone < 1 && n < drain.count;
      const since = old ? Infinity : clock - falls[n] - TIMING.fall;
      const look = old ? drain.look : source.look;
      const on = source.state === 'placed' && since >= 0;
      for (const [k, piece] of SHEET.entries()) {
        mesh!.show(parts[k], on && wears(piece, look));
        mesh!.shadow(parts[k], false);
      }
      if (!on) continue;
      // it slides over its place on the rim, then drops in, tipping all the while
      const t = clamp(since / TIMING.tip);
      const slide = easeOut(clamp(t / 0.4));
      const drop = easeInOut(clamp((t - 0.25) / 0.5));
      const [dx, dz, turn] = PILE[n];
      const u = mix(card, flat, slide);
      const at: Vec3 = [
        mix(inlet, BED[0] + dx, slide),
        mix(rim, rim - WELL + n * LEAF * flat, drop),
        mix(INLET[2] - LEAF * card, BED[2] + dz, slide),
      ];
      transform(sheetM, at, [(-easeInOut(t) * Math.PI) / 2, turn * DEGREE * slide, 0], [u, u, u]);
      multiply(sheetM, sheetM, transform(linkM, HINGE));
      // its card's name stays on the sheet's corner as it dithers out
      const m = sheetM;
      const [x, y, z] = CORNER;
      corners[n] = [
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14],
      ];
      multiply(sheetM, source.matrix, sheetM);
      for (const [k, piece] of SHEET.entries()) {
        mesh!.material(parts[k], line ? MATERIAL.accent : old ? FADE : piece.material);
        mesh!.place(parts[k], multiply(partM, sheetM, links.sheet[k]));
      }
    }
  }

  /** the beats as they stand, written only where they changed */
  function show() {
    const name = running[framework.option];
    write(serveLines[0], `${name ?? ''} running`);
    reveal(serveLines[0], served > 0 && serveRows > 1 && name !== undefined);
    reveal(serveLines[1], served > 1 && serveRows > 0);
    const listing = OPTIONS.content[treeFrom];
    const hit = hitOf(treeFrom);
    write(typing, listing.query!.slice(0, typed));
    reveal(search, typed > 0 && !reloading && treeRows > 3);
    for (const [n, line] of branches.entries()) {
      write(line, listing.pages![n].title);
      reveal(line, listed > n && !reloading && treeRows > 2);
      flag(line, 'hit', found && n === hit);
    }
    // the displays show off their place or in a CRT; the UI's page squashes with its module
    for (const [k, slot] of [framework, core].entries()) {
      screens[k].shown = slot.state === 'placed' && slot.scale[0] === 1 && slot.scale[1] === 1;
    }
    screens[2].shown = ui.state !== 'off';
    if (folded !== pageFrom) fold(pageFrom);
    const drafted = OPTIONS.content[pageFrom].pages!;
    const lit = hitOf(pageFrom);
    if (page.dataset.look !== ui.look) page.dataset.look = ui.look;
    for (const [k, step] of (['frame', 'text', 'done'] as const).entries())
      flag(page, step, drawn > k);
    for (const [n, entry] of entries.entries()) {
      write(entry, drafted[n].title);
      flag(entry, 'hit', drawn > 2 && n === lit && ui.look !== 'plain');
    }
    write(heading, drafted[lit].title);
    // a page falls from over the drawing's top, or from under the core where the open rack holds
    // it, to the bin's rim, where its sheet takes over and its name dithers out
    const pages = OPTIONS.content[source.option].pages!;
    const lid = MODULES[1].height / 2;
    const under = PLACES[2] - MODULES[2].height / 2 + lift * rack - PLACES[1] - lid;
    const fits = lift === 1 && under * scale >= CARD[1];
    const from = fits ? under - CARD[1] / scale : ceiling - CARD[1] / scale - PLACES[1] - lid;
    for (const [n, card] of cards.entries()) {
      const anchor = falling[n];
      const since = clock - falls[n];
      anchor.shown = since < TIMING.fall + TIMING.step;
      if (!anchor.shown) continue;
      if (card.dataset.look !== source.look) card.dataset.look = source.look;
      const name = card.querySelector<HTMLElement>('[data-name]')!;
      write(name, pages[n].file ?? pages[n].title);
      const out = since - TIMING.fall;
      anchor.at =
        out < 0
          ? [inlet, lid + mix(from, 0, clamp(since / TIMING.fall) ** 2), INLET[2]]
          : corners[n];
      anchor.offset = out < 0 ? [-CARD[0] / 2, -CARD[1]] : [0, 0];
      flag(card, 'handed', out >= 0);
      const mask =
        out < 0 ? '' : DITHER_MASKS[Math.max(0, 16 - Math.ceil((out / TIMING.step) * 16))];
      if (name.style.maskImage !== mask) name.style.maskImage = mask;
    }
    if (caption.textContent !== said) {
      caption.textContent = said;
      setCaption();
    }
  }

  /** the UI's page has its tree where its screen is tall enough, its TOC where wide enough too */
  let folded = -1;
  function fold(k: number) {
    folded = k;
    const [w, h] = DISPLAYS.ui.size;
    measure.font = `600 ${WORDS}px ${getComputedStyle(page).fontFamily}`;
    let width = 0;
    for (const { title } of OPTIONS.content[k].pages!) {
      width = Math.max(width, measure.measureText(title).width);
    }
    const tall = h * scale >= 2 * MARGIN + WORDS + 2 * LINE;
    const room = w * scale - width - measure.measureText('On this page').width - 4 * MARGIN;
    reveal(side, tall);
    reveal(toc, tall && room >= 6 * LINE);
  }

  function setCaption() {
    reveal(caption, said !== '');
    if (caption.hidden) return;
    const w = caption.offsetWidth;
    const x = Math.min(
      Math.max(mesh!.project([0, 0, D / 2])[0] - w / 2, bleed),
      holder.clientWidth - w,
    );
    move(caption, `translate(${Math.round(x)}px)`);
  }

  function hitOf(k: number): number {
    const { pages, query } = OPTIONS.content[k];
    return pages!.findIndex((page) => page.title.toLowerCase().startsWith(query!));
  }

  function move(el: HTMLElement, css: string) {
    if (el.style.transform !== css) el.style.transform = css;
  }

  function write(el: HTMLElement, text: string) {
    if (el.textContent !== text) el.textContent = text;
  }

  function reveal(el: HTMLElement, on: boolean) {
    if (el.hidden === on) el.hidden = !on;
  }

  function flag(el: HTMLElement, name: string, on: boolean) {
    if (el.hasAttribute(`data-${name}`) !== on) el.toggleAttribute(`data-${name}`, on);
  }

  /**
   * Leader `i`'s cable, from a port on its module's face edge to its row's: at rest straight where
   * the edge reaches the row's line, else across, up or down, and across. While the module moves its
   * port keeps its place on it, the jog stretching through nothing as it must; once the module stops
   * the port eases to its rest place. Its clips keep their places while the figure is `busy`.
   * Drawn on over TIMING.lead from when the module landed; true while its port eases.
   */
  function trace(i: number, busy: boolean): boolean {
    const { leader, matrix, crt, layer } = slots[i];
    const h = MODULES[i].height / 2;
    const [x, middle] = mesh!.project([W / 2, 0, -D / 2], matrix);
    const upper = mesh!.project([W / 2, h, -D / 2], matrix)[1];
    const top = upper + EDGE;
    const bottom = mesh!.project([W / 2, -h, -D / 2], matrix)[1] - EDGE;
    const [ex, ey] = leader.end;
    const sx = Math.round(x);
    let rest = Math.round(middle);
    const short = Math.abs(ey - rest) < RUN;
    if (short && ey >= top && ey <= bottom) rest = ey;
    else if (short && top < bottom)
      rest = Math.round(clamp(ey + (ey < rest ? RUN : -RUN), top, bottom));
    if (Math.abs(ey - rest) < 2) rest = ey;
    const resting = ((rest - middle) / (upper - middle)) * h;
    // its module moves while it's carried, lifted or swapped, even through a swap's hold
    const still =
      crt === null && leader.seen[0] === x && leader.seen[1] === middle && leader.seen[2] === upper;
    leader.seen = [x, middle, upper];
    if (Number.isNaN(leader.y) || (still && !playing)) leader.y = resting;
    else if (!still) leader.settle = undefined;
    else if (leader.y !== resting) {
      leader.settle ??= { at: clock, from: leader.y };
      const t = clamp((clock - leader.settle.at) / TIMING.port);
      leader.y = t < 1 ? mix(leader.settle.from, resting, easeOut(t)) : resting;
    }
    if (leader.y === resting) leader.settle = undefined;
    const sy = Math.round(middle + ((upper - middle) * leader.y) / h);
    const jog = Math.round((sx + ex) / 2) + LANES[layer];
    const settled = still && leader.settle === undefined;
    const straight = settled && sy === ey;
    const points: Point[] = straight
      ? [
          [sx, ey],
          [ex, ey],
        ]
      : [
          [sx, sy],
          [jog, sy],
          [jog, ey],
          [ex, ey],
        ];
    // a straight run's clips as on the same line broken at the jog, nothing down it, and back
    const whole = ex - sx;
    const first = jog - sx;
    const across = (shares: number[][]): number[][] => {
      if (shares.length > 1) {
        const joined: number[] = [];
        for (const share of shares[0]) joined.push((share * first) / whole);
        for (const share of shares[2]) joined.push((first + share * (whole - first)) / whole);
        return [joined];
      }
      const split: number[][] = [[], [], []];
      for (const share of shares[0]) {
        const along = share * whole;
        if (along <= first) split[0].push(along / first);
        else split[2].push((along - first) / (whole - first));
      }
      return split;
    };
    if (!busy) leader.places = undefined;
    else if (!settled && !leader.places && leader.cable) {
      const { clips } = leader.cable;
      leader.places = clips.length === 1 ? across(clips) : clips;
    }
    const places = leader.places && straight ? across(leader.places) : leader.places;
    move(leader.port, `translate(${sx - 6}px, ${sy - 6}px)`);
    const route = `${points.join(' ')} ${places?.join('|') ?? ''}`;
    if (route !== leader.route) {
      leader.route = route;
      leader.cable = cable(leader.svg, points, true, places);
      leader.drawing?.cancel();
      leader.drawing = undefined;
    }
    // the draw-on follows the figure's clock, held with it
    const since = clock - leader.at;
    if (since < TIMING.lead) {
      leader.drawing ??= leader.svg.animate(wipe(leader.cable!), {
        duration: TIMING.lead,
        easing: REEL,
      });
      leader.drawing.pause();
      leader.drawing.currentTime = since;
    } else if (leader.drawing) {
      leader.drawing.cancel();
      leader.drawing = undefined;
    }
    return leader.settle !== undefined;
  }

  function wears(piece: Piece, look: Look | undefined): boolean {
    return !piece.looks || (look !== undefined && piece.looks.includes(look));
  }

  function dress(piece: Piece, look: Look | undefined): number {
    return (look === undefined ? undefined : piece.dressed?.[look]) ?? piece.material;
  }

  function placeLink(parts: number[], locals: Float32Array[], at: Vec3, angle: number) {
    transform(linkM, at, [0, 0, angle]);
    for (let i = 0; i < locals.length; i++)
      mesh!.place(parts[i], multiply(partM, linkM, locals[i]));
  }

  // already in view at load, or reduced motion: the end state at once; last, once all its state exists
  if (reached(root)) {
    started = true;
    finish();
  } else shown.observe(canvas);

  return () => {
    shown.disconnect();
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('click', onPress);
    root.removeEventListener('keydown', onKey);
    canvas.removeEventListener('pointermove', onPoint);
    mesh.destroy();
  };
}
