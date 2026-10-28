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
import {
  CELL,
  CRATER_UNIFORMS,
  CROWN,
  drawFace,
  HORIZON,
  moonFragment,
  REACH,
  SATELLITES,
} from './scene';

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
/** the boot's mosaic, CSS px a cell, down to the dither's own */
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
export const SKY = CROWN + (MATE_H - LEGS) / CELLS;
/** a shooting star: ticks between two, about, ticks one lasts, dither cells a tick */
const SHOOT = { every: 100, ticks: 6, speed: 14 };

/** a satellite `clock` s into its turns: x right and y down from the moon's centre in moon radii,
 * and its depth toward the viewer */
function onRing(phase: number, clock: number): [x: number, y: number, depth: number] {
  const angle = phase * Math.PI * 2 - (clock / ORBIT.period) * Math.PI * 2;
  const ex = ORBIT.a * Math.cos(angle);
  const ey = ORBIT.b * Math.sin(angle);
  return [
    ex * Math.cos(ORBIT.tilt) - ey * Math.sin(ORBIT.tilt),
    ex * Math.sin(ORBIT.tilt) + ey * Math.cos(ORBIT.tilt),
    Math.sqrt(ORBIT.a * ORBIT.a - ORBIT.b * ORBIT.b) * Math.sin(angle),
  ];
}

/** a 32-bit integer's bits mixed (lowbias32) */
function mix32(n: number): number {
  const h = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  const k = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (k ^ (k >>> 16)) >>> 0;
}

/** the moon's face, drawn once a page */
let face: HTMLCanvasElement | null | undefined;

/** the moon: it rises at boot, lit from the pointer, its satellites in orbit and her on its crown;
 * it sets as its sky leaves */
export function createHero(stage: HTMLElement, reduced: boolean): (() => void) | undefined {
  const scene = stage.firstElementChild;
  const canvas = scene?.firstElementChild;
  const drawing = scene?.lastElementChild;
  const mate = drawing?.firstElementChild;
  const labels = drawing?.lastElementChild?.children as HTMLCollectionOf<HTMLElement> | undefined;
  // a Fast Refresh can pair this engine with other markup for a moment: no sky until they match
  if (
    !(scene instanceof HTMLElement) ||
    !(canvas instanceof HTMLCanvasElement) ||
    !(drawing instanceof HTMLElement) ||
    !(mate instanceof HTMLCanvasElement) ||
    labels?.length !== SATELLITES.length
  )
    return;
  // a page out of canvas memory gets no contexts: the hero is its text then
  const pen = mate.getContext('2d');
  face ??= drawFace(128);
  if (!pen || !face) return;
  const shader = createShaderCanvas(canvas, {
    fragment: moonFragment,
    onFrame: (time) => frame(time),
    onResize: (dpr) => measure(dpr),
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
  /** the sky in dither cells */
  let cells = { x: 1, y: 1 };
  /** ms between the satellites' moves: a tick's whole fraction, a cell at their fastest */
  let stride = TICK;
  /** the next move's frame */
  let wake = 0;
  /** px from the moon's centre to the pointer */
  let pointerX = Number.NaN;
  // uniform values written every frame, reused
  const light: [number, number, number] = [0, 0, 0];
  const vec4: [number, number, number, number] = [0, 0, 0, 0];
  const shoot: [number, number, number, number] = [0, 0, 0, 0];
  // her: her colours, inverted for her Pop, what she shows, the light on her moon in her canvas's axes
  let ink: MateInk | undefined;
  let popInk: MateInk | undefined;
  let mateShown = -1;
  const mateLight: [number, number, number] = [0, 0, 0];
  /** each label's place as last set */
  const placed: string[] = [];

  shader.texture('uFace', face);
  for (let k = 0; k < CRATER_UNIFORMS.length; k++) shader.set(`uCrater[${k}]`, CRATER_UNIFORMS[k]);

  /** the page's colours: in the first frame, which waits for the stylesheet, and on theme changes */
  const readColors = () => {
    const style = getComputedStyle(stage);
    const paper = style.getPropertyValue('--lp-paper');
    if (paper === '') return;
    shader.set('uLit', cssRgb(style.getPropertyValue(isDark() ? '--lp-yellow' : '--lp-sun')));
    shader.set('uPaper', cssRgb(paper));
    shader.set('uInk', cssRgb(style.getPropertyValue('--lp-ink')));
    shader.set('uDark', isDark() ? 1 : 0);
    shader.invalidate();
    ink = mateInk(style);
    popInk = { ...ink, line: ink.lit, pen: ink.paper, lit: ink.line, paper: ink.pen };
    mateShown = -1;
  };
  const stopTheme = onTheme(readColors);

  /** `dpr`: the canvas's pixels a CSS px */
  const measure = (dpr: number) => {
    // the moon as large as it fits the sky's box, and her over the crown at a px a cell, the least
    // she is drawn at
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    radius = Math.min(width / (2 * REACH), height / SKY, (height - (MATE_H - LEGS)) / CROWN);
    scene.style.setProperty('--r', `${radius}px`);
    shader.set('uRadius', radius * dpr);
    cells = { x: Math.floor(width / CELL), y: Math.floor(height / CELL) };
    // her cell: an eighth of the moon's width over her 30, in whole device px, a CSS px at least,
    // and her canvas no taller than the sky over the moon's crown
    const room = height - CROWN * radius;
    const cell = Math.min(
      Math.round((radius * devicePixelRatio) / CELLS),
      Math.floor((room * devicePixelRatio) / (MATE_H - LEGS)),
    );
    scene.style.setProperty('--cell', `${Math.max(1, cell / devicePixelRatio)}px`);
    // px a tick of the fastest satellite, crossing the moon's face
    const fastest = (ORBIT.a * radius * 2 * Math.PI * TICK) / (ORBIT.period * 1000);
    stride = TICK / Math.max(1, Math.ceil(fastest / CELL));
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const rect = drawing.getBoundingClientRect();
    pointerX = e.clientX - rect.left - rect.width / 2;
    sunX.set(pointerX / radius);
    sunY.set((e.clientY - rect.bottom) / radius + HORIZON);
    shader.invalidate();
  };
  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    sunX.set(REST.x);
    sunY.set(REST.y);
    pointerX = Number.NaN;
    shader.invalidate();
  };
  if (!reduced) {
    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave);
  }

  // the moon sets as its sky leaves under the menu, from the sky's top at the menu's edge to the
  // horizon there, by when it has sunk the height of her feet: she never sinks behind the horizon
  const moonset =
    reduced || !('ViewTimeline' in window)
      ? undefined
      : scene.animate(
          { translate: ['0 0', '0 var(--feet)'] },
          {
            timeline: new ViewTimeline({
              subject: stage,
              inset: `${getComputedStyle(stage).getPropertyValue('--lp-menu-h')} 0px`,
            }),
            rangeStart: 'exit-crossing 0%',
            rangeEnd: 'exit-crossing 100%',
            fill: 'both',
          },
        );

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
    // the stars twinkle on ticks; a shooting star now and then crosses the upper sky, down and
    // across from where it starts, a move at a time
    const beat = reduced ? 0 : (clock * 1000) / TICK;
    shader.set('uTwinkle', beat);
    const event = Math.floor(beat / SHOOT.every);
    const seed = mix32(event);
    const run = beat - event * SHOOT.every - 1 - (seed % (SHOOT.every - SHOOT.ticks - 2));
    shoot[2] = run >= 0 && run < SHOOT.ticks ? (seed & 1 ? 1 : -1) : 0;
    shoot[3] = 0.35 + (0.25 * ((seed >>> 8) & 255)) / 255;
    const from = (shoot[2] < 0 ? 0.5 : 0) + (0.5 * ((seed >>> 16) & 255)) / 255;
    shoot[0] = Math.floor(from * cells.x + shoot[2] * SHOOT.speed * run);
    shoot[1] = Math.floor(
      (0.05 + (0.3 * (seed >>> 24)) / 255) * cells.y + shoot[3] * SHOOT.speed * run,
    );
    shader.set('uShoot', shoot);

    // the ring strokes on as one pen line, the back half, then the front half
    vec4[0] = ORBIT.a;
    vec4[1] = ORBIT.b;
    vec4[2] = ORBIT.tilt;
    vec4[3] = ease(clamp((t - BEAT_AT.ring * TICK) / (6 * TICK)));
    shader.set('uOrbit', vec4);

    for (let i = 0; i < SATELLITES.length; i++) {
      const s = SATELLITES[i];
      const [x, y, depth] = onRing(s.phase, reduced ? 0 : clock);

      // it Pops in on its beat, with its label
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

      const state = t < at ? 'off' : t < at + POP_MS ? 'pop' : 'on';
      if (labels[i].dataset.state !== state) labels[i].dataset.state = state;
      // its label rides over it inside the drawing, off while the moon hides it
      const reach = REACH * radius;
      const above = Math.hypot(...s.size);
      const translate = `clamp(${-reach}px, calc(${x * radius}px - 50%), calc(${reach}px - 100%)) calc(${(y - above) * radius}px - 100%)`;
      const opacity = depth < 0 && x * x + y * y < 1 ? '0' : '1';
      if (placed[i] !== translate + opacity) {
        placed[i] = translate + opacity;
        labels[i].style.translate = translate;
        labels[i].style.opacity = opacity;
      }
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
    moonset?.cancel();
    stopTheme();
    clearTimeout(wake);
    clearTimeout(readyTimer);
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    sunX.destroy();
    sunY.destroy();
  };
}
