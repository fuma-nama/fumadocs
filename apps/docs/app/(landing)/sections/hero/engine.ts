import { cubicBezier, springValue } from 'motion/react';
import {
  BLINK,
  type MateInk,
  mateInk,
  ORBIT_STEPS,
  paintMate,
  STEP,
} from '@/components/mascot/paint';
import { LEGS, MATE_H, MATE_W, SIT } from '@/components/mascot/sprite';
import { createShaderCanvas, cssRgb } from '../../lib/gl';
import { clamp, settle, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { isDark, onTheme } from '../../lib/theme';
import { CRATER_UNIFORMS, drawFace, HORIZON, moonFragment, REACH, SATELLITES } from './scene';

/** boot beats, in ticks from the start */
export const BEAT_AT = {
  ring: 2,
  outline: 5,
  satellites: 6,
  glitch: 9,
  mate: 10,
  ready: 13,
} as const;
/** a Pop: one inverted flash this long on its beat */
const POP_MS = 70;

let boot: number | null | undefined;

/**
 * Start of the hero's boot (`performance.now()` time), set by the first of its parts to ask: it
 * plays once per page load, with motion allowed; off screen, it is over by the time it shows.
 * `null`: the final state.
 */
export function bootStart(): number | null {
  if (boot === undefined) {
    boot = matchMedia('(prefers-reduced-motion: reduce)').matches ? null : performance.now();
  }
  return boot;
}

/** ms until a beat, negative once it passed */
export function untilBeat(start: number, tick: number): number {
  return start + tick * TICK - performance.now();
}

const ease = cubicBezier(...settle);
/** the dither's cell at rest, CSS px, and the boot's mosaic coarsening down to it */
const CELL = 3;
const MOSAIC = [64, 32, 16, 8, 4, CELL];
/** at boot the moon rises from this many radii under its place */
const RISE = 0.6;
const RISE_MS = 1100;
/** the icon's light: from the bottom-right, ~35° above the sheet (sun position in moon radii) */
const REST = { x: 0.86, y: 0.86 };
const SUN = { stiffness: 38, damping: 13 };

/** the satellites' ring: semi-axes in moon radii, in-plane tilt in radians, seconds a turn */
const ORBIT = { a: 1.3, b: 0.27, tilt: (-18 * Math.PI) / 180, period: 42 };
const PRISM_UNIFORMS = ['uPrism[0]', 'uPrism[1]', 'uPrism[2]'];
const ROTATION_UNIFORMS = ['uPrismRotation[0]', 'uPrismRotation[1]', 'uPrismRotation[2]'];
/** her moon's ring round her crown, cells wide; her eyes turn to a pointer this far from her, px */
const RING = 21;
const GLANCE = 60;
/** her cells a moon radius: she is an eighth of its width */
const CELLS = 120;
/** the drawing's height over the horizon in moon radii: the moon, and her on its crown */
export const SKY = HORIZON + 1 + (MATE_H - LEGS) / CELLS;

/** the moon's face, drawn once a page */
let face: HTMLCanvasElement | null | undefined;

/** the moon: it rises at boot, lit from the pointer, its satellites in orbit and her on its crown */
export function createHero(stage: HTMLElement, reduced: boolean): (() => void) | undefined {
  const drawing = stage.firstElementChild as HTMLElement;
  const canvas = drawing.firstElementChild as HTMLCanvasElement;
  const mate = canvas.nextElementSibling as HTMLCanvasElement;
  const labels = drawing.lastElementChild!.children as HTMLCollectionOf<HTMLElement>;
  // a page out of canvas memory gets no contexts: the hero is its text then
  const pen = mate.getContext('2d');
  face ??= drawFace(128);
  if (!pen || !face) return;
  const shader = createShaderCanvas(canvas, {
    fragment: moonFragment,
    onFrame: (time) => frame(time),
    onResize: measure,
  });
  if (!shader) return;
  const hero = stage.parentElement!;
  const mateImage = new ImageData(MATE_W, MATE_H);
  // the light follows a mouse, on touch screens it circles on its own
  const touch = !reduced && !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const sunX = springValue(REST.x, SUN);
  const sunY = springValue(REST.y, SUN);
  const start = bootStart();
  /** CSS px a moon radius */
  let radius = 1;
  /** ms between the satellites' moves: a tick's whole fraction, a cell at their fastest */
  let stride = TICK;
  /** the next move's frame */
  let wake = 0;
  /** the moon's centre on the page, read once the pointer moves over the hero */
  let centre: { x: number; y: number } | undefined;
  /** px from the moon's centre to the pointer */
  let pointerX = Number.NaN;
  // uniform values written every frame, reused
  const light: [number, number, number] = [0, 0, 0];
  const vec4: [number, number, number, number] = [0, 0, 0, 0];
  // her: her colours, inverted for her Pop, what she shows, the light on her moon in her canvas's axes
  let ink: MateInk | undefined;
  let popInk: MateInk | undefined;
  let mateShown = -1;
  const mateLight: [number, number, number] = [0, 0, 0];

  shader.texture('uFace', face);
  for (let k = 0; k < CRATER_UNIFORMS.length; k++) shader.set(`uCrater[${k}]`, CRATER_UNIFORMS[k]);

  /** the page's colours: in the first frame, which waits for the stylesheet, and on theme changes */
  const readColors = () => {
    const style = getComputedStyle(stage);
    const paper = style.getPropertyValue('--lp-paper');
    if (paper === '') return;
    shader.set('uLit', cssRgb(style.getPropertyValue('--moon-lit')));
    shader.set('uPaper', cssRgb(paper));
    shader.set('uInk', cssRgb(style.getPropertyValue('--lp-ink')));
    shader.set('uDark', isDark() ? 1 : 0);
    shader.invalidate();
    ink = mateInk(style);
    popInk = { ...ink, line: ink.lit, pen: ink.paper, lit: ink.line, paper: ink.pen };
    mateShown = -1;
  };
  const stopTheme = onTheme(readColors);

  function measure() {
    radius = canvas.clientWidth / (2 * REACH);
    // her cell: an eighth of the moon's width over her 30, in whole device px, a CSS px at least
    const dpr = window.devicePixelRatio;
    const cell = Math.max(1, Math.round((radius * dpr) / CELLS) / dpr);
    drawing.style.setProperty('--cell', `${cell}px`);
    // px a tick of the fastest satellite, crossing the moon's face
    const fastest = (ORBIT.a * radius * 2 * Math.PI * TICK) / (ORBIT.period * 1000);
    stride = TICK / Math.max(1, Math.ceil(fastest / CELL));
    centre = undefined;
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!centre) {
      const rect = drawing.getBoundingClientRect();
      centre = {
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.bottom - HORIZON * radius + window.scrollY,
      };
    }
    pointerX = e.pageX - centre.x;
    sunX.set(pointerX / radius);
    sunY.set((e.pageY - centre.y) / radius);
    shader.invalidate();
  };
  const onPointerLeave = () => {
    sunX.set(REST.x);
    sunY.set(REST.y);
    pointerX = Number.NaN;
    centre = undefined;
    shader.invalidate();
  };
  if (!reduced) {
    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave);
  }

  let readyTimer = 0;
  if (start !== null) {
    report(stage, 'booting');
    readyTimer = window.setTimeout(() => report(stage, 'ready'), untilBeat(start, BEAT_AT.ready));
  }

  const frame = (time: number) => {
    if (!ink) readColors();
    // ms since the boot started
    const t = start === null ? Infinity : performance.now() - start;
    // drawn every frame through the boot and while the light settles, else on the next move
    clearTimeout(wake);
    if (t < BEAT_AT.ready * TICK || sunX.isAnimating() || sunY.isAnimating()) shader.invalidate();
    else if (!reduced)
      wake = window.setTimeout(shader.invalidate, stride - ((time * 1000) % stride));
    // s, a move at a time: the satellites and the touch screens' light go by it
    const clock = (Math.floor((time * 1000) / stride) * stride) / 1000;
    const cell = MOSAIC[clamp(Math.floor(t / TICK), 0, MOSAIC.length - 1)];
    const rise = t < RISE_MS ? (1 - ease(t / RISE_MS)) * RISE : 0;

    // the light: the pointer's, or on touch screens a slow orbit round the rest position
    const orbit = Math.PI / 4 + clock * 0.2;
    const sx = touch ? Math.cos(orbit) * 1.22 : sunX.get();
    const sy = touch ? Math.sin(orbit) * 1.22 : sunY.get();
    const el = (clamp(90 - 45 * Math.hypot(sx, sy), -50, 90) * Math.PI) / 180;
    const azimuth = Math.atan2(-sy, sx);
    light[0] = Math.cos(el) * Math.cos(azimuth);
    light[1] = Math.cos(el) * Math.sin(azimuth);
    light[2] = Math.sin(el);

    shader.set('uCell', cell);
    shader.set('uOutline', cell < 4.5 && t >= BEAT_AT.outline * TICK ? 1 : 0);
    shader.set('uRise', rise);
    shader.set('uLight', light);

    // the ring strokes on as one pen line, the back half, then the front half
    vec4[0] = ORBIT.a;
    vec4[1] = ORBIT.b;
    vec4[2] = ORBIT.tilt;
    vec4[3] = ease(clamp((t - BEAT_AT.ring * TICK) / (6 * TICK)));
    shader.set('uOrbit', vec4);

    for (let i = 0; i < SATELLITES.length; i++) {
      const s = SATELLITES[i];
      const angle = s.phase * Math.PI * 2 - (reduced ? 0 : (clock / ORBIT.period) * Math.PI * 2);
      const ex = ORBIT.a * Math.cos(angle);
      const ey = ORBIT.b * Math.sin(angle);
      const x = ex * Math.cos(ORBIT.tilt) - ey * Math.sin(ORBIT.tilt);
      const y = ex * Math.sin(ORBIT.tilt) + ey * Math.cos(ORBIT.tilt);
      const depth = Math.sqrt(ORBIT.a * ORBIT.a - ORBIT.b * ORBIT.b) * Math.sin(angle);

      // it Pops in on its beat
      const at = (BEAT_AT.satellites + i) * TICK;
      vec4[0] = x;
      vec4[1] = -y;
      vec4[2] = depth;
      vec4[3] = t < at ? 0 : t < at + POP_MS ? 2 : 1;
      shader.set(PRISM_UNIFORMS[i], vec4);
      // a quaternion tumbling round the satellite's axis
      const turn = (reduced ? 1 : clock / s.spin) * Math.PI + i * 1.3;
      const sin = Math.sin(turn);
      vec4[0] = s.axis[0] * sin;
      vec4[1] = s.axis[1] * sin;
      vec4[2] = s.axis[2] * sin;
      vec4[3] = Math.cos(turn);
      shader.set(ROTATION_UNIFORMS[i], vec4);

      // its label rides on the prism inside the drawing, off while the moon hides the prism
      const label = labels[i];
      const state =
        t < at ? 'off' : t < at + POP_MS ? 'pop' : depth < 0 && x * x + y * y < 1 ? 'off' : 'on';
      if (label.dataset.state !== state) label.dataset.state = state;
      if (state === 'off') continue;
      const [w, h, d] = s.size;
      const reach = REACH * radius;
      const top = (y + rise - Math.hypot(w, h, d)) * radius;
      label.style.translate = `clamp(${-reach}px, calc(${x * radius}px - 50%), calc(${reach}px - 100%)) calc(${top}px - 100%)`;
    }

    // her: she Pops in on her tick, blinks now and then, looks toward the pointer, her moon steps
    // round its ring lit by the same sun; painted only when one of those changes
    const meet = BEAT_AT.mate * TICK;
    if (!ink || !popInk || t < meet) return;
    const ticks = reduced ? 0 : Math.floor((time * 1000) / TICK);
    const gaze = pointerX < -GLANCE ? 2 : pointerX > GLANCE ? 3 : 0;
    const eyes = !reduced && ticks % BLINK === 0 ? 1 : gaze;
    const step = Math.floor(ticks / STEP) % ORBIT_STEPS;
    const pop = t < meet + POP_MS;
    const shown = ((pop ? 4 : 0) + eyes) * ORBIT_STEPS + step;
    if (shown === mateShown) return;
    mateShown = shown;
    mateLight[0] = light[0];
    mateLight[1] = -light[1];
    mateLight[2] = light[2];
    paintMate(mateImage, SIT, false, eyes, step, RING, pop ? popInk : ink, mateLight);
    pen.putImageData(mateImage, 0, 0);
    mate.style.visibility = 'visible';
  };

  return () => {
    shader.destroy();
    stopTheme();
    clearTimeout(wake);
    clearTimeout(readyTimer);
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    sunX.destroy();
    sunY.destroy();
  };
}
