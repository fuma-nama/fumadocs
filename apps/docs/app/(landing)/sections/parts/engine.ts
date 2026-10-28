import { cubicBezier } from 'motion/react';
import { createShaderCanvas, cssRgb, type ShaderCanvas } from '../../lib/gl';
import { clamp, settle as settleCurve, TICK } from '../../lib/motion';
import { isDark, onTheme } from '../../lib/theme';
import type { Layer } from '../../ui/chip';
import { LAYERS } from './data';
import {
  type Camera,
  D,
  DROP,
  fragment,
  GAP,
  HEIGHT,
  POSE,
  project,
  quadMatrix,
  T,
  type Vec3,
  W,
} from './scene';

const easeSettle = cubicBezier(...settleCurve);
/** the light, from above the stack's right front */
const LIGHT: Vec3 = [0.44, 0.83, 0.34];
const length = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
for (let i = 0; i < 3; i++) LIGHT[i] /= length;
/** how far a press takes a layer down its posts, the bolted core's jolt as a part of it, and how
 * far hover lifts a layer */
const PRESS = 0.5 * GAP;
const JOLT = 0.2;
const LIFT = 0.2 * GAP;
/** a press's spring, per s² and per s: down hard, back up with a little bounce */
const STIFF = 1400;
const DAMP = 36;
/** the least time a press holds a layer down, so a quick click or a key shows it, ms */
const PULSE = TICK;
/** a layer's settle and the beat between layers, bottom up, and the stack's dither out, ms */
const SETTLE = 3 * TICK;
const STAGGER = TICK;
const LEAVE = 2 * TICK;
/** the share of the stack on screen once it settles in, and under which it dithers out: a quarter
 * still shows it go, and the gap between them keeps an edge from flickering */
const ENTER_AT = 0.5;
const LEAVE_AT = 0.25;
/** the floor's shadow density and grid alpha */
const SHADOW = 0.28;
const GRID = 0.14;
const MIN = ['uMin[0]', 'uMin[1]', 'uMin[2]', 'uMin[3]'];
const MAX = ['uMax[0]', 'uMax[1]', 'uMax[2]', 'uMax[3]'];
const SHOW = ['uShow[0]', 'uShow[1]', 'uShow[2]', 'uShow[3]'];

interface Slot {
  front: HTMLElement;
  /** the core is bolted in: a press only jolts it */
  bolted: boolean;
  /** how far it has dithered in, 0 to 1, and its height above its place as it settles, a part of
   * `DROP` */
  show: number;
  drop: number;
  /** how far it's pressed, a part of `PRESS`, and how fast; how far hover lifts it, a part of `LIFT` */
  press: number;
  speed: number;
  lift: number;
  /** until when a press holds it down */
  until: number;
  /** the height its faces were last laid at */
  y: number;
}

export interface StackEngine {
  /** a layer took a pick: it goes down its posts and springs back */
  press: (layer: Layer) => void;
  destroy: () => void;
}

/**
 * The stack in its one pose, every layer a key: a mouse lifts the layer under it, a press
 * takes it down its posts, and a click, a tap or a key on its button reports it to `onPress`. It
 * draws only while something moves: a layer, or the layers settling in as the stack comes on screen
 * or dithering out as it leaves. The real page and the layers' fronts are DOM under the canvas,
 * laid on their faces.
 */
export function createStack(root: HTMLElement, onPress: (layer: Layer) => void): StackEngine {
  const cell = root.querySelector<HTMLElement>('[data-cell]')!;
  const canvas = cell.querySelector('canvas')!;
  const page = cell.querySelector<HTMLElement>('[data-page]')!;
  const slots: Slot[] = LAYERS.map((layer) => ({
    front: cell.querySelector<HTMLElement>(`[data-front="${layer}"]`)!,
    bolted: layer === 'core',
    show: 0,
    drop: 1,
    press: 0,
    speed: 0,
    lift: 0,
    until: 0,
    y: Number.NaN,
  }));

  const created = createShaderCanvas(canvas, {
    fragment,
    onFrame,
    onResize: layout,
    onVisible,
    thresholds: [LEAVE_AT, ENTER_AT],
  });
  if (!created) {
    // nothing draws the stack: the page alone, and the panel's options swap it
    cell.toggleAttribute('data-flat', true);
    return { press() {}, destroy() {} };
  }
  const shader: ShaderCanvas = created;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cam: Camera = {
    eye: POSE.eye,
    fwd: POSE.fwd,
    right: POSE.right,
    up: POSE.up,
    focal: 1,
    centre: [0, 0],
  };
  const ray: Vec3 = [0, 0, 0];
  const grid: Vec3 = [48, 0, 0.8 * W];
  const lo: Vec3 = [0, 0, 0];
  const hi: Vec3 = [0, 0, 0];
  const quad = [0, 0, 0, 0, 0, 0, 0, 0];
  const point = [0, 0];
  let width = 0;
  /** the faces' own sizes, CSS px: a front, and the page on the top */
  let faceW = 1;
  let frontH = 1;
  let pageH = 1;
  /** the layer under the pointer, and the one a pointer holds down */
  let hover = -1;
  let held = -1;
  /** hidden, settling in from `since` (the first frame it draws), shown, or dithering out */
  let phase: 'hidden' | 'entering' | 'shown' | 'leaving' = reduce ? 'shown' : 'hidden';
  let since = 0;
  /** the faces show, from the frame that first covers them */
  let faces = false;
  let last = 0;
  let running = false;
  let wake = 0;

  /** after a resize: the camera's framing, the faces' sizes and where they lie */
  function layout() {
    width = canvas.clientWidth;
    if (width === 0) return;
    cam.focal = width * POSE.focal;
    cam.centre[0] = width * POSE.centre[0];
    cam.centre[1] = width * POSE.centre[1];
    shader.set('uFocal', cam.focal);
    shader.set('uCentre', cam.centre);
    faceW = width * POSE.face;
    frontH = (faceW * T) / W;
    pageH = (faceW * D) / W;
    page.style.width = `${faceW}px`;
    page.style.height = `${pageH}px`;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      slot.front.style.width = `${faceW}px`;
      slot.front.style.height = `${frontH}px`;
      slot.y = Number.NaN;
      place(i);
    }
  }

  /** a face across the stack, its top edge at `y0`, `z0` and its bottom at `y1`, `z1`: its corners
   * on the canvas from the top left, clockwise */
  function corners(y0: number, z0: number, y1: number, z1: number) {
    for (let i = 0; i < 4; i++) {
      const bottom = i >= 2;
      project(cam, i === 0 || i === 3 ? -W / 2 : W / 2, bottom ? y1 : y0, bottom ? z1 : z0, point);
      quad[2 * i] = point[0];
      quad[2 * i + 1] = point[1];
    }
    return quad;
  }

  /** a layer's box from its foot at `y` into `lo` and `hi` */
  function box(y: number) {
    lo[0] = -W / 2;
    lo[1] = y;
    lo[2] = -D / 2;
    hi[0] = W / 2;
    hi[1] = y + T;
    hi[2] = D / 2;
  }

  /** layer `i` where its settle, its press and hover have it, its faces laid only when it moved */
  function place(i: number) {
    const slot = slots[i];
    const y = GAP + (3 - i) * (T + GAP) + slot.drop * DROP + slot.lift * LIFT - slot.press * PRESS;
    if (width === 0 || y === slot.y) return;
    slot.y = y;
    box(y);
    shader.set(MIN[i], lo);
    shader.set(MAX[i], hi);
    slot.front.style.transform = quadMatrix(corners(y + T, D / 2, y, D / 2), faceW, frontH);
    // the page on the top layer's top, its far edge up
    if (i === 0) {
      page.style.transform = quadMatrix(corners(y + T, -D / 2, y + T, D / 2), faceW, pageH);
    }
  }

  /** the layer whose box the ray through canvas point `x`, `y` enters first, or -1 */
  function pick(x: number, y: number): number {
    for (let k = 0; k < 3; k++) {
      ray[k] =
        cam.fwd[k] * cam.focal +
        cam.right[k] * (x - cam.centre[0]) +
        cam.up[k] * (cam.centre[1] - y);
    }
    let best = Infinity;
    let found = -1;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].show < 0.5) continue;
      box(slots[i].y);
      let near = 0;
      let far = Infinity;
      for (let k = 0; k < 3; k++) {
        const a = (lo[k] - cam.eye[k]) / ray[k];
        const b = (hi[k] - cam.eye[k]) / ray[k];
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
      }
      if (near <= far && near < best) {
        best = near;
        found = i;
      }
    }
    return found;
  }

  /** each layer's dither, and the floor's with the layer on its feet */
  function dither() {
    for (let i = 0; i < slots.length; i++) shader.set(SHOW[i], slots[i].show);
    shader.set('uShadow', SHADOW * slots[3].show);
    grid[1] = GRID * slots[3].show;
    shader.set('uGrid', grid);
  }

  function colours() {
    const style = getComputedStyle(document.documentElement);
    const night = isDark();
    const paper = cssRgb(style.getPropertyValue('--lp-paper'));
    const ink = cssRgb(style.getPropertyValue('--lp-ink'));
    shader.set('uLit', night ? ink : paper);
    shader.set('uShade', night ? paper : ink);
    shader.set('uPaper', paper);
    shader.set('uNight', night ? 1 : 0);
    shader.invalidate();
  }

  function onFrame() {
    if (width === 0) return;
    const now = performance.now();
    // a frame after a still spell steps by one frame's time, not the spell's
    const dt = running ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
    last = now;
    let moving = false;

    if (phase === 'entering') {
      if (Number.isNaN(since)) since = now;
      let done = true;
      for (let i = 0; i < slots.length; i++) {
        // bottom up: the framework first, the page last
        const p = clamp((now - since - (3 - i) * STAGGER) / SETTLE);
        slots[i].show = Math.max(slots[i].show, clamp(2 * p));
        slots[i].drop = Math.min(slots[i].drop, 1 - easeSettle(p));
        if (p < 1) done = false;
      }
      if (done) phase = 'shown';
      else moving = true;
      dither();
    } else if (phase === 'leaving') {
      if (Number.isNaN(since)) since = now;
      const p = clamp((now - since) / LEAVE);
      for (const slot of slots) slot.show = Math.min(slot.show, 1 - p);
      if (p < 1) moving = true;
      else {
        phase = 'hidden';
        for (const slot of slots) slot.drop = 1;
      }
      dither();
    }
    // the canvas covers the faces where their layers haven't dithered in, from this frame on
    if (faces !== (phase !== 'hidden')) {
      faces = !faces;
      cell.toggleAttribute('data-shown', faces);
    }

    let next = Infinity;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const down = !reduce && (held === i || now < slot.until);
      const goal = down ? (slot.bolted ? JOLT : 1) : 0;
      slot.speed += (STIFF * (goal - slot.press) - DAMP * slot.speed) * dt;
      slot.press += slot.speed * dt;
      if (Math.abs(goal - slot.press) < 1e-3 && Math.abs(slot.speed) < 1e-2) {
        slot.press = goal;
        slot.speed = 0;
      } else moving = true;
      const lifted = hover === i && !down && !reduce ? 1 : 0;
      slot.lift += (lifted - slot.lift) * (1 - Math.exp(-dt / 0.06));
      if (Math.abs(lifted - slot.lift) < 1e-3) slot.lift = lifted;
      else moving = true;
      if (now < slot.until) next = Math.min(next, slot.until);
      place(i);
    }

    running = moving;
    if (moving) shader.invalidate();
    else if (next < Infinity) {
      // a press held down: nothing moves until it lets go
      clearTimeout(wake);
      wake = window.setTimeout(shader.invalidate, next - now);
    }
  }

  function onVisible(ratio: number) {
    if (reduce) return;
    if (ratio >= ENTER_AT && (phase === 'hidden' || phase === 'leaving')) {
      phase = 'entering';
      since = Number.NaN;
      shader.invalidate();
    } else if (ratio < LEAVE_AT && (phase === 'entering' || phase === 'shown')) {
      phase = 'leaving';
      since = Number.NaN;
      held = -1;
      shader.invalidate();
    }
  }

  /** the layer under a mouse lifts; any pointer sliding off the one it holds lets it go. The cell
   * is the pointer's only target in it, so its offset is the canvas point */
  function onMove(event: PointerEvent) {
    const under = pick(event.offsetX, event.offsetY);
    const lifted = event.pointerType === 'mouse' ? under : -1;
    if (lifted === hover && (held < 0 || held === under)) return;
    hover = lifted;
    if (held !== under) held = -1;
    cell.style.cursor = lifted >= 0 ? 'pointer' : '';
    shader.invalidate();
  }

  function onLeave() {
    if (hover < 0 && held < 0) return;
    hover = -1;
    held = -1;
    cell.style.cursor = '';
    shader.invalidate();
  }

  function onDown(event: PointerEvent) {
    held = pick(event.offsetX, event.offsetY);
    if (held >= 0) shader.invalidate();
  }

  function onUp() {
    if (held < 0) return;
    held = -1;
    shader.invalidate();
  }

  /** a key on a layer's button, or a click or tap on the stack where its ray finds a layer */
  function onClick(event: MouseEvent) {
    const front = (event.target as Element).closest<HTMLElement>('[data-front]');
    const i = front
      ? LAYERS.indexOf(front.dataset.front as Layer)
      : pick(event.offsetX, event.offsetY);
    if (i >= 0) onPress(LAYERS[i]);
  }

  shader.set('uEye', POSE.eye);
  shader.set('uRight', POSE.right);
  shader.set('uUp', POSE.up);
  shader.set('uFwd', POSE.fwd);
  shader.set('uLight', LIGHT);
  // the posts stand in from the corners, 6 units thick, as tall as the gap
  shader.set('uPost', [0.45 * W, 0.43 * D, 6, GAP]);
  shader.set('uBoundMin', [-W / 2, 0, -D / 2]);
  shader.set('uBoundMax', [W / 2, HEIGHT + DROP, D / 2]);
  if (reduce) {
    // the stack is just there
    for (const slot of slots) {
      slot.show = 1;
      slot.drop = 0;
    }
  }
  dither();
  colours();
  const stopTheme = onTheme(colours);
  cell.addEventListener('pointermove', onMove);
  cell.addEventListener('pointerleave', onLeave);
  cell.addEventListener('pointerdown', onDown);
  cell.addEventListener('pointerup', onUp);
  cell.addEventListener('pointercancel', onUp);
  cell.addEventListener('click', onClick);

  return {
    press(layer) {
      // not while the stack settles in, nor with motion reduced
      if (phase !== 'shown' || reduce) return;
      slots[LAYERS.indexOf(layer)].until = performance.now() + PULSE;
      shader.invalidate();
    },
    destroy() {
      clearTimeout(wake);
      stopTheme();
      cell.removeEventListener('pointermove', onMove);
      cell.removeEventListener('pointerleave', onLeave);
      cell.removeEventListener('pointerdown', onDown);
      cell.removeEventListener('pointerup', onUp);
      cell.removeEventListener('pointercancel', onUp);
      cell.removeEventListener('click', onClick);
      shader.destroy();
    },
  };
}
