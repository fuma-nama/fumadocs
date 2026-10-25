import { cubicBezier } from 'motion/react';
import { DITHER_MASKS } from '../../lib/bayer';
import { createShaderCanvas } from '../../lib/gl';
import { camera, settle } from '../../lib/motion';
import { setStatus } from '../../lib/status';
import { fragment, HOVER, joints, LINK1, LINK2, PAD, reach, STROKE, type Vec2 } from './arm';

/** a key types in this long, two a frame at 60 Hz */
const CHAR = 1000 / 120;
/** the writer starts the next block this long after finishing one */
const GAP = 140;
/** a finished block's tab shows inverted this long */
const POP = 60;
/** the beats of a press, ms: the arm swings over a tab (arriving this long after it pops, the pad
 * already dropping for the last fifth of the swing), the pad drops onto it and grips, lifts the
 * strip, hangs, strikes, stays down and comes back up; the arm leaves for the next tab this long
 * after the blow, and parks this long after the last */
const SWING = 460;
const ARRIVE = 40;
const DESCEND = 110;
const GRIP = 50;
const LIFT = 420;
const HANG = 110;
const STRIKE = 75;
const PRESS = 70;
const RELEASE = 260;
const LEAVE = 110;
const REST = 60;
const PARK = 700;
/** the output dithers in this long after the pad grips, over this long */
const COMPILE_AT = 160;
const COMPILE = 220;
/** after a blow: the dust, the pad's squash, the arm ringing (rad, decay ms, period ms) */
const PUFF = 160;
const SQUASH = 140;
const RING: [number, number, number] = [0.012, 70, 90];
/** the replay dithers the page out in 16 frames at 60 fps */
const FADE = (16 * 1000) / 60;
/** CSS px, of the output's dither */
const DITHER_CELL = 3;
/** world px: how high the camera stands over the page, and a rail's half width */
const CAMERA = 4000;
const RAIL = 6;
/** toward the light: high and from the upper left, so shadows stay short */
const LIGHT = normalize(-0.22, -0.3, 0.93);
/** share of the stage in view that starts the cycle */
const START = 0.4;

const ease = cubicBezier(...settle);
const inOut = cubicBezier(...camera);

/** an underdamped spring from 0 to 1 over u in [0, 1]: it starts at rest, overshoots ~7%, settles */
function spring(u: number): number {
  if (u >= 1) return 1;
  return 1 - Math.exp(-4.6 * u) * (Math.cos(5.39 * u) + 0.853 * Math.sin(5.39 * u));
}

function fall(u: number): number {
  return u * u * u;
}

/** a riding base brakes exactly on its stop, the joints swing past and settle */
function swing(u: number, i: number): number {
  return i === 0 ? inOut(u) : spring(u);
}

/** the pose with its shoulder turned by whole turns to the nearest of `from`, so a swing takes the
 * short way round */
function toward(pose: number[], from: number[]): number[] {
  const turn = 2 * Math.PI;
  return [pose[0], pose[1] + Math.round((from[1] - pose[1]) / turn) * turn, pose[2]];
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
  lines: HTMLElement[];
  lengths: number[];
  status: string;
  keys: number;
  /** stage px, at rest */
  box: Rect;
  rows: Vec2[];
  /** where the pad grips its tab */
  hold: Vec2;
  /** clock times, ms */
  type: number;
  typed: number;
  touch: number;
  compile: number;
  hit: number;
  /** what is on screen, so a frame writes only what changed */
  shownLines: number;
  clip: number;
  tabState: number;
  framed: boolean;
  carried: string;
  level: number;
  srcShown: boolean;
}

/**
 * `quick-start.mdx`, written and pressed into its page. A caret types a block; the arm grips its
 * tab, lifts the strip toward the camera while it compiles, and strikes it back down as the real
 * component. Everything on screen is a function of the cycle's clock, which runs on the shader's
 * frames while the stage is on screen.
 */
export function createPress(stage: HTMLElement): () => void {
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas[data-arm]')!;
  const doc = stage.querySelector<HTMLElement>('[data-doc]')!;
  const bay = stage.querySelector<HTMLElement>('[data-bay]')!;
  const caret = stage.querySelector<HTMLElement>('[data-caret]')!;
  const button = stage.querySelector<HTMLButtonElement>('[data-replay]');
  const figure = stage.closest<HTMLElement>('[data-figure]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const blocks: Block[] = [];
  for (const el of stage.querySelectorAll<HTMLElement>('[data-block]')) {
    const out = el.querySelector<HTMLElement>('[data-out]')!;
    out.style.maskSize = `${DITHER_CELL * 4}px`;
    const lines = [...el.querySelectorAll<HTMLElement>('[data-line]')];
    const lengths: number[] = [];
    let keys = lines.length - 1;
    for (const line of lines) {
      lengths.push(line.textContent!.length);
      keys += line.textContent!.length;
    }
    blocks.push({
      el,
      src: el.querySelector('[data-src]')!,
      out,
      tab: el.querySelector('[data-tab]')!,
      lines,
      lengths,
      status: el.dataset.status ?? '',
      keys,
      box: { x: 0, y: 0, w: 0, h: 0 },
      rows: [],
      hold: [0, 0],
      type: 0,
      typed: 0,
      touch: 0,
      compile: 0,
      hit: 0,
      shownLines: lines.length,
      clip: -1,
      tabState: 2,
      framed: false,
      carried: '',
      level: 16,
      srcShown: false,
    });
  }

  const shader = createShaderCanvas(canvas, { fragment, onFrame, maxDpr: 2 });

  // metrics, stage px
  let height = 0;
  let scale = 1;
  let foot: Vec2 = [0, 0];
  let base: Vec2 = [0, 0];
  /** on a phone the base rides a rail: its x, from y0 to y1 */
  let riding = false;
  const rail = [0, 0, 0];
  let advance = 8;
  let lineHeight = 20;
  /** inside the window's frame, where the dust settles */
  let inside: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // the cycle: a pose is [base y, shoulder, elbow]
  const arm: Segment[] = [];
  const pad: Segment[] = [];
  let park: number[] = [0, 0, 0];
  let start: number[] = park;
  let total = 0;
  let clock = 0;
  /** rest: the finished page; ready: an empty file waiting for the view; fade: the page dithering out */
  let phase: 'rest' | 'ready' | 'fade' | 'play' = 'rest';
  let fading = 0;
  let last = -1;
  let started = false;
  let active = false;
  let lastStatus = '';

  // the frame's state
  const pose = [0, 0, 0];
  const sole = [HOVER];
  const bounds = [0, 0, 0, 0];
  let caretAt = '';
  let caretMode = '';

  function box(el: Element, s: DOMRect): Rect {
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }

  function layout() {
    // measure the resting layout: no strip in the air
    for (const b of blocks) {
      b.el.style.transform = '';
      b.el.style.zIndex = '';
      b.el.style.willChange = '';
      b.carried = '';
    }
    const s = stage.getBoundingClientRect();
    height = s.height;
    if (s.width === 0) return;
    const page = box(doc, s);
    inside = box(doc.lastElementChild!, s);
    const room = box(bay, s);
    // beside the window the arm stands on its own; on a phone it rides a rail down the window's side
    const beside = room.w > 160;
    scale = beside ? 1 : 0.38;
    foot = [page.x + page.w / 2, height * 0.3];
    riding = !beside;
    if (beside) base = [room.x + Math.min(150, room.w * 0.42), height * 0.5];
    else {
      base = [room.x + room.w / 2, page.y + page.h - 24];
      rail[0] = base[0];
      rail[1] = page.y + 24;
      rail[2] = page.y + page.h - 24;
    }
    const first = blocks[0].lines[0];
    const style = getComputedStyle(first);
    lineHeight = Number.parseFloat(style.lineHeight) || 20;
    let longest = 0;
    let row = blocks[0].lines[0];
    for (const b of blocks) {
      for (let i = 0; i < b.lines.length; i++) {
        if (b.lengths[i] > longest) {
          longest = b.lengths[i];
          row = b.lines[i];
        }
      }
    }
    // a line is a box as wide as the column: measure its text
    const range = document.createRange();
    range.selectNodeContents(row);
    advance = range.getBoundingClientRect().width / longest;
    for (const b of blocks) {
      b.box = box(b.el, s);
      b.rows = [];
      for (const line of b.lines) {
        const r = line.getBoundingClientRect();
        b.rows.push([r.left - s.left, r.top - s.top]);
      }
      const tab = box(b.tab, s);
      b.hold = [tab.x + tab.w - PAD[0] * scale - 4, tab.y + tab.h / 2];
    }
    caret.style.width = `${advance}px`;
    caret.style.height = `${lineHeight}px`;
    // folded beside its base, clear of the page: the elbow down the bay, or up the rail
    park = beside
      ? poseFor([base[0] - 40, base[1] + 60], 1, base[1])
      : poseFor([base[0], rail[2] - (LINK1 - LINK2 + 1) * scale], -1, rail[2]);
    build(phase === 'play' ? start : park);
  }

  /** the pose that puts the pad over `target`; a riding base stops below it, so the elbow rises
   * over the rail */
  function poseFor(target: Vec2, bend: 1 | -1, y = target[1] + 0.6 * LINK1 * scale): number[] {
    const by = riding ? Math.min(rail[2], Math.max(rail[1], y)) : base[1];
    const angles = reach([(target[0] - base[0]) / scale, (target[1] - by) / scale], bend);
    return [by, angles[0], angles[1]];
  }

  /** the beats of the cycle, from the arm's pose `from` */
  function build(from: number[]) {
    start = from;
    arm.length = 0;
    pad.length = 0;
    let t = 0;
    for (const b of blocks) {
      b.type = t;
      b.typed = t + b.keys * CHAR;
      t = b.typed + GAP;
    }
    let previous = from;
    let free = 0;
    const bend = riding ? -1 : 1;
    for (const b of blocks) {
      const target = toward(poseFor(b.hold, bend), previous);
      const go = Math.max(free, b.typed + ARRIVE - SWING);
      arm.push({ t0: go, t1: go + SWING, a: previous, b: target, ease: swing });
      previous = target;
      const down = Math.max(go + SWING * 0.8, b.typed + POP);
      b.touch = down + DESCEND;
      pad.push({ t0: down, t1: b.touch, a: [HOVER], b: [0], ease: inOut });
      const lift = b.touch + GRIP;
      pad.push({ t0: lift, t1: lift + LIFT, a: [0], b: [STROKE], ease });
      b.compile = b.touch + COMPILE_AT;
      const strike = lift + LIFT + HANG;
      b.hit = strike + STRIKE;
      pad.push({ t0: strike, t1: b.hit, a: [STROKE], b: [0], ease: fall });
      pad.push({ t0: b.hit + PRESS, t1: b.hit + PRESS + RELEASE, a: [0], b: [HOVER], ease });
      free = b.hit + LEAVE;
    }
    arm.push({
      t0: free + REST,
      t1: free + REST + PARK,
      a: previous,
      b: toward(park, previous),
      ease: swing,
    });
    total = free + REST + PARK;
  }

  /** the screen point of world point (x, y) at height z, and the scale there */
  function project(x: number, y: number, z: number): [number, number, number] {
    const k = CAMERA / (CAMERA - z);
    return [foot[0] + (x - foot[0]) * k, foot[1] + (y - foot[1]) * k, k];
  }

  function grow(x: number, y: number, z: number, r: number) {
    const [sx, sy] = project(x, y, z);
    const shadowX = x - (LIGHT[0] / LIGHT[2]) * z;
    const shadowY = y - (LIGHT[1] / LIGHT[2]) * z;
    bounds[0] = Math.min(bounds[0], sx - r, shadowX - r);
    bounds[1] = Math.min(bounds[1], sy - r, shadowY - r);
    bounds[2] = Math.max(bounds[2], sx + r, shadowX + r);
    bounds[3] = Math.max(bounds[3], sy + r, shadowY + r);
  }

  /** the state at the clock */
  function apply() {
    const t = clock;
    const live = phase === 'play' || phase === 'ready';
    // the writer: the lines typed so far show, the one being typed is cut at the caret
    let caretX = 0;
    let caretY = 0;
    let typing = false;
    for (const b of blocks) {
      let keys = !live || t < b.type ? -1 : Math.min(b.keys, Math.floor((t - b.type) / CHAR));
      if (keys >= 0 && keys < b.keys) typing = true;
      let shown = 0;
      let clip = 0;
      for (let i = 0; i < b.lines.length && keys >= 0; i++) {
        shown = i + 1;
        if (keys <= b.lengths[i]) {
          clip = b.lengths[i] - keys;
          caretX = b.rows[i][0] + keys * advance;
          caretY = b.rows[i][1];
          keys = -1;
        } else keys -= b.lengths[i] + 1;
      }
      if (shown !== b.shownLines) {
        for (let i = 0; i < b.lines.length; i++) {
          b.lines[i].style.visibility = !live || i < shown ? '' : 'hidden';
          b.lines[i].style.clipPath = '';
        }
        b.shownLines = shown;
        b.clip = 0;
      }
      if (clip !== b.clip) {
        b.lines[shown - 1].style.clipPath = clip > 0 ? `inset(0 ${clip * advance}px 0 0)` : '';
        b.clip = clip;
      }
    }
    const lastBlock = blocks[blocks.length - 1];
    const mode =
      !live || t >= lastBlock.touch ? 'none' : typing && phase === 'play' ? 'solid' : 'blink';
    if (mode !== caretMode) {
      caretMode = mode;
      caret.style.visibility = mode === 'none' ? 'hidden' : 'visible';
      caret.style.animation = mode === 'solid' ? 'none' : '';
    }
    const at = `translate(${caretX}px, ${caretY}px)`;
    if (mode !== 'none' && at !== caretAt) {
      caretAt = at;
      caret.style.transform = at;
    }

    // the arm
    sample(arm, t, start, pose);
    sample(pad, t, [HOVER], sole);
    const p = sole[0];
    let squash = 0;
    let puff = 0;
    let hit: Rect | null = null;
    let status = t < lastBlock.hit ? 'typing quick-start.mdx' : 'compiled quick-start.mdx';
    for (const b of blocks) {
      const since = t - b.hit;
      if (since >= 0 && since < SQUASH) {
        const k = since < 25 ? since / 25 : 1 - (since - 25) / (SQUASH - 25);
        squash = k * k;
      }
      if (since >= 0) {
        const ring =
          RING[0] * Math.exp(-since / RING[1]) * Math.sin((since / RING[2]) * 2 * Math.PI);
        pose[1] += ring;
        pose[2] -= ring * 1.5;
      }
      if (since >= 0 && since < PUFF) {
        puff = since / PUFF;
        hit = b.box;
      }
      if (t >= b.touch && t < b.hit) status = b.status;
    }
    const [elbow, wrist] = joints(pose[1], pose[2]);
    const bx = base[0];
    const by = pose[0];

    // the strips
    let card: Rect | null = null;
    let cardZ = 0;
    for (const b of blocks) {
      const carried = phase === 'play' && t >= b.touch && t < b.hit && p > 0;
      let transform = '';
      if (carried) {
        cardZ = p * scale;
        card = b.box;
        const [x, y, k] = project(b.box.x, b.box.y, cardZ);
        transform = `translate(${x - b.box.x}px, ${y - b.box.y}px) scale(${k})`;
      }
      if (transform !== b.carried) {
        b.carried = transform;
        b.el.style.transform = transform;
        b.el.style.zIndex = transform ? '1' : '';
        b.el.style.willChange = transform ? 'transform' : '';
      }
      // a finished block: its tab pops, inverted for a moment, and its frame holds it as one strip
      const tabState = !live ? 2 : t < b.typed ? 0 : t < b.typed + POP ? 1 : 2;
      if (tabState !== b.tabState) {
        b.tabState = tabState;
        b.tab.style.visibility = tabState === 0 ? 'hidden' : '';
        if (tabState === 1) b.tab.dataset.inverted = '';
        else delete b.tab.dataset.inverted;
      }
      const framed = live && t >= b.typed && t < b.hit;
      if (framed !== b.framed) {
        b.framed = framed;
        // inside its own box, where the next block's paper can't cover it
        b.el.style.outline = framed ? '1px solid var(--lp-line-strong)' : '';
        b.el.style.outlineOffset = framed ? '-1px' : '';
      }
      const level =
        !live || t >= b.compile + COMPILE
          ? 16
          : t < b.compile
            ? -1
            : Math.floor(((t - b.compile) / COMPILE) * 16);
      if (level !== b.level) {
        b.level = level;
        b.out.style.visibility = level < 0 ? 'hidden' : '';
        b.out.style.maskImage = level >= 0 && level < 16 ? DITHER_MASKS[level] : '';
      }
      const src = live && t >= b.type && t < b.compile + COMPILE;
      if (src !== b.srcShown) {
        b.srcShown = src;
        b.src.style.visibility = src ? 'visible' : '';
      }
    }

    if (phase === 'play' && active) say(status);

    bounds[0] = Infinity;
    bounds[1] = Infinity;
    bounds[2] = -Infinity;
    bounds[3] = -Infinity;
    const ex = bx + elbow[0] * scale;
    const ey = by + elbow[1] * scale;
    const wx = bx + wrist[0] * scale;
    const wy = by + wrist[1] * scale;
    grow(bx, by, 0, 54 * scale);
    grow(bx, by, 180 * scale, 54 * scale);
    grow(ex, ey, 180 * scale, 28 * scale);
    grow(ex, ey, 120 * scale, 28 * scale);
    grow(wx, wy, p * scale, 40 * scale);
    grow(wx, wy, (p + 170) * scale, 40 * scale);
    if (riding) {
      grow(rail[0], rail[1], 0, RAIL + 4);
      grow(rail[0], rail[2], 0, RAIL + 4);
    }
    if (card) {
      grow(card.x, card.y, cardZ, 4);
      grow(card.x + card.w, card.y + card.h, cardZ, 4);
    }
    if (hit) {
      bounds[0] = Math.min(bounds[0], hit.x - 32);
      bounds[1] = Math.min(bounds[1], hit.y - 32);
      bounds[2] = Math.max(bounds[2], hit.x + hit.w + 32);
      bounds[3] = Math.max(bounds[3], hit.y + hit.h + 32);
    }

    if (!shader) return;
    shader.set('uCam', [foot[0], foot[1], CAMERA]);
    shader.set('uB', [bx, by]);
    shader.set('uS', scale);
    shader.set('uE', elbow);
    shader.set('uW', wrist);
    shader.set('uP', p);
    shader.set('uSq', squash);
    shader.set('uRail', [rail[0], rail[1], rail[2], riding ? RAIL : 0]);
    shader.set('uCard', card ? [card.x, card.y, card.w, card.h] : [0, 0, 0, 0]);
    shader.set('uCardZ', cardZ);
    shader.set('uHit', hit ? [hit.x, hit.y, hit.w, hit.h] : [0, 0, 0, 0]);
    shader.set('uDoc', [inside.x, inside.y, inside.w, inside.h]);
    shader.set('uPuff', puff);
    shader.set('uClip', [bounds[0], bounds[1], bounds[2], bounds[3]]);
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
      shader!.set('uClip', [
        Math.min(bounds[0], inside.x),
        Math.min(bounds[1], inside.y),
        Math.max(bounds[2], inside.x + inside.w),
        Math.max(bounds[3], inside.y + inside.h),
      ]);
      if (covered >= 1) play();
    } else if (phase === 'play') {
      clock = Math.min(total, clock + dt);
      if (clock >= total) phase = 'rest';
      apply();
    }
    if (phase === 'fade' || phase === 'play') shader!.invalidate();
    else last = -1;
  }

  function play() {
    phase = 'play';
    clock = 0;
    apply();
  }

  /** dither the page out, then write it again from the arm's pose */
  function replay() {
    if (!shader) return;
    started = true;
    build(phase === 'play' ? [...pose] : park);
    phase = 'fade';
    fading = 0;
    last = -1;
    shader.invalidate();
  }

  /** an empty file, before the stage comes into view */
  function ready() {
    phase = 'ready';
    clock = 0;
    apply();
  }

  function colours() {
    if (!shader) return;
    const style = getComputedStyle(stage);
    const night = document.documentElement.classList.contains('dark');
    const paper = rgb(style.getPropertyValue('--lp-paper'));
    const ink = rgb(style.getPropertyValue('--lp-ink'));
    shader.set('uLit', night ? ink : paper);
    shader.set('uShade', night ? paper : ink);
    shader.set('uAccent', rgb(style.getPropertyValue(night ? '--lp-yellow' : '--lp-sun')));
    shader.set('uLine', rgba(style.getPropertyValue('--lp-line-strong')));
    shader.set('uNight', night ? 1 : 0);
    shader.set('uL', LIGHT);
    shader.invalidate();
  }

  const view = new IntersectionObserver(
    ([entry]) => {
      if (started || reduced || !shader) return;
      // a stage taller than the viewport counts by the share of the viewport it fills
      const seen =
        entry.intersectionRatio >= START || entry.intersectionRect.height >= innerHeight * START;
      if (seen) {
        started = true;
        if (phase === 'ready') {
          phase = 'play';
          shader.invalidate();
        } else replay();
      } else if (!entry.isIntersecting && phase === 'rest') ready();
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
  const resize = new ResizeObserver(() => {
    layout();
    apply();
    shader?.invalidate();
  });
  const theme = new MutationObserver(colours);

  layout();
  apply();
  colours();
  resize.observe(stage);
  view.observe(stage);
  if (figure) middle.observe(figure);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  button?.addEventListener('click', replay);
  let disposed = false;
  void document.fonts.ready.then(() => {
    if (disposed) return;
    layout();
    apply();
    shader?.invalidate();
  });

  return () => {
    disposed = true;
    view.disconnect();
    middle.disconnect();
    resize.disconnect();
    theme.disconnect();
    button?.removeEventListener('click', replay);
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
