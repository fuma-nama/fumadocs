import { cubicBezier, springValue } from 'motion/react';
import {
  BLINK,
  type MateInk,
  mateInk,
  ORBIT_STEPS,
  paintMate,
  STEP,
} from '@/components/mascot/paint';
import { CROWN_CELL, MATE_H, MATE_PAD, MATE_W, SIT } from '@/components/mascot/sprite';
import { createShaderCanvas, cssRgb } from '../../lib/gl';
import { clamp, settle, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { isDark, onTheme } from '../../lib/theme';
import { CRATER_UNIFORMS, drawFace, moonFragment, PRISMS } from './scene';

/** boot beats, in ticks from the start */
export const BEAT_AT = {
  ring: 2,
  outline: 5,
  satellites: 6,
  glitch: 9,
  mate: 10,
  ready: 13,
} as const;

let start: number | null | undefined;

/**
 * Start of the hero's boot (`performance.now()` time), decided by the first of its parts to ask: it
 * plays once per page load, with motion allowed and the hero on screen. `null`: the final state.
 */
export function bootStart(element: Element): number | null {
  if (start !== undefined) return start;
  const rect = (element.closest('[data-figure]') ?? element).getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < window.innerHeight;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  start = visible && !reduced ? performance.now() : null;
  return start;
}

/** ms until a beat, negative once it passed */
export function untilBeat(start: number, tick: number): number {
  return start + tick * TICK - performance.now();
}

const ease = cubicBezier(...settle);
const MOSAIC = [64, 32, 16, 8, 4, 3];
const RISE_MS = 1100;
/** the icon's light: from the bottom-right, ~35° above the sheet (sun position in moon radii) */
const REST = { x: 0.86, y: 0.86 };
const SUN = { stiffness: 38, damping: 13 };

/** the satellites' ring: semi-axes in moon radii, in-plane tilt in radians, seconds a turn */
const ORBIT = { a: 1.3, b: 0.27, tilt: (-18 * Math.PI) / 180, period: 42 };

/** in the order they pop, their prisms `PRISMS` in the same: phase in turns (0 the right end, 0.25
 * the front), the unit axis they tumble round and seconds a turn of it. A third of a turn or more
 * apart, so the moon hides one at most, none at boot */
export const SATELLITES = [
  { layer: 'core', phase: 0.25, axis: [0.28, 0.94, 0.19], spin: 16 },
  { layer: 'ui', phase: 0.95, axis: [0.89, 0.36, 0.27], spin: 20 },
  { layer: 'content', phase: 0.55, axis: [0.17, 0.51, 0.85], spin: 24 },
] as const;
const PRISM_UNIFORMS = ['uPrism[0]', 'uPrism[1]', 'uPrism[2]'];
const ROTATION_UNIFORMS = ['uPrismRotation[0]', 'uPrismRotation[1]', 'uPrismRotation[2]'];
/** her moon's ring round her crown, cells wide; her eyes turn to a pointer this far from it, px */
const RING = 21;
const GLANCE = 60;

/** the moon's face, drawn once a page */
let face: HTMLCanvasElement | undefined;

/** the moon: it rises at boot and sets on scroll, lit from the pointer, its satellites in orbit */
export function createHero(stage: HTMLElement, reduced: boolean): () => void {
  const clip = stage.firstElementChild as HTMLElement;
  const scene = clip.firstElementChild as HTMLElement;
  const canvas = scene.firstElementChild as HTMLCanvasElement;
  const anchor = clip.lastElementChild as HTMLElement;
  const labels = anchor.children as HTMLCollectionOf<HTMLElement>;
  /** her sitting on the moon's crown, a pixel a cell */
  const mate = scene.querySelector<HTMLCanvasElement>('[data-mate]')!;
  const mateImage = new ImageData(MATE_W, MATE_H);
  const root = document.documentElement;
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const sunX = springValue(REST.x, SUN);
  const sunY = springValue(REST.y, SUN);
  const start = bootStart(stage);
  const labelState = new Int8Array(labels.length).fill(-1);
  // from the moon's centre at rest: the range of the labels' centres in the gutters, the horizon
  const halves: number[] = [];
  let left = 0;
  let right = 0;
  let horizon = 0;
  let radius = 1;
  let dpr = 1;
  // the moon starts to set once the horizon reaches the bottom of the viewport, and sets 0.55px a px
  // of scroll, slower where it is small for the viewport (phones), so its crown sets near the top
  let exitStart = 0;
  let setRate = 0.55;
  let span = 1;
  /** px the moon and its labels are moved down by */
  let placed = 0;
  let raf = 0;
  // uniform values written every frame, reused
  const light: [number, number, number] = [0, 0, 0];
  const vec4: [number, number, number, number] = [0, 0, 0, 0];
  // her: her colours, inverted for her Pop, what she shows, whether she has Popped in and shows,
  // the light on her moon in her canvas's axes, the pointer's x and her crown's
  let ink: MateInk | undefined;
  let popInk: MateInk | undefined;
  let mateShown = -1;
  let mateIn = false;
  let mateUp = false;
  const mateLight: [number, number, number] = [0, 0, 0];
  let pointerX = Number.NaN;
  let onScreen = false;
  let crownX = 0;

  const shader = createShaderCanvas(canvas, {
    fragment: moonFragment,
    loop: !reduced,
    onFrame: frame,
  });
  face ??= drawFace(128);
  shader?.texture('uFace', face);
  for (let k = 0; k < CRATER_UNIFORMS.length; k++) shader?.set(`uCrater[${k}]`, CRATER_UNIFORMS[k]);
  // scripts can run before the stylesheet applies: the moon shows once its colours resolve
  let colors = false;
  function readColors() {
    const style = getComputedStyle(stage);
    const lit = style.getPropertyValue('--moon-lit');
    const paper = style.getPropertyValue('--lp-paper');
    colors = lit !== '' && paper !== '';
    scene.style.visibility = colors ? '' : 'hidden';
    if (!colors) return;
    shader?.set('uLit', cssRgb(lit));
    shader?.set('uPaper', cssRgb(paper));
    shader?.set('uInk', cssRgb(style.getPropertyValue('--lp-ink')));
    shader?.set('uDark', isDark() ? 1 : 0);
    shader?.invalidate();
    ink = mateInk(style);
    popInk = { ...ink, line: ink.lit, pen: ink.paper, lit: ink.line, paper: ink.pen };
    mateShown = -1;
  }
  readColors();
  const stopTheme = onTheme(readColors);

  const resize = new ResizeObserver(() => {
    radius = scene.clientWidth / 3.2;
    dpr = Math.min(2, window.devicePixelRatio);
    span = window.innerHeight;
    // in sub-pixels
    const box = clip.getBoundingClientRect();
    const moon = anchor.getBoundingClientRect();
    exitStart = Math.max(0, box.bottom + window.scrollY - span * 0.92);
    const gutter = Number.parseFloat(getComputedStyle(stage).getPropertyValue('--lp-gutter'));
    left = gutter - (moon.left - box.left);
    right = box.width - gutter - (moon.left - box.left);
    horizon = box.bottom - moon.top + placed;
    setRate = Math.min(0.55, (horizon + radius) / (span * 0.7));
    for (let i = 0; i < labels.length; i++) halves[i] = labels[i].getBoundingClientRect().width / 2;
    const her = mate.getBoundingClientRect();
    crownX = her.left + (her.width * (MATE_PAD[0] + CROWN_CELL[0])) / MATE_W;
    place();
  });
  resize.observe(stage);
  if (!shader && !reduced) raf = requestAnimationFrame(fallback);

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch' || reduced) return;
    pointerX = e.clientX;
    // the light needs the moon's box, read only while the hero shows
    if (!onScreen) return;
    const rect = scene.getBoundingClientRect();
    sunX.set((e.clientX - rect.left) / radius - 1.6);
    sunY.set((e.clientY - rect.top) / radius - 1.1);
  }
  function onPointerLeave() {
    sunX.set(REST.x);
    sunY.set(REST.y);
    pointerX = Number.NaN;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerleave', onPointerLeave);

  // the moon sets as the page scrolls, placed once a frame while the hero is on screen: the
  // canvas's own frames stop once the moon has set behind the horizon
  let placing = 0;
  function onScroll() {
    if (placing !== 0) return;
    placing = requestAnimationFrame(() => {
      placing = 0;
      place();
    });
  }
  const view = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) {
      window.addEventListener('scroll', onScroll, { passive: true });
      // in the next frame, with its style recalc: reading the scroll now would force one of its own
      onScroll();
    } else window.removeEventListener('scroll', onScroll);
  });
  if (!reduced) view.observe(stage);

  let readyTimer = 0;
  if (start !== null) {
    report(stage, 'booting');
    readyTimer = window.setTimeout(() => report(stage, 'ready'), untilBeat(start, BEAT_AT.ready));
  }

  /** ms since the boot started, `Infinity` without one */
  function elapsed() {
    return start === null ? Infinity : performance.now() - start;
  }

  /** px scrolled since the moon started to set */
  function exitScroll() {
    return reduced ? 0 : Math.max(0, window.scrollY - exitStart);
  }

  function round(v: number) {
    return Math.round(v * dpr) / dpr;
  }

  function rise(t: number) {
    return t < RISE_MS ? (1 - ease(t / RISE_MS)) * radius * 0.6 : 0;
  }

  /** the moon and its labels rise out of the horizon at boot and set behind it on scroll, as one */
  function place() {
    const sink = exitScroll() * setRate;
    placed = round(rise(elapsed()) + sink);
    scene.style.transform = `translate3d(0, ${placed}px, 0)`;
    anchor.style.transform = scene.style.transform;
    showMate();
  }

  /** she shows once she has Popped in, till the moon's crown, her seat, sets behind the horizon */
  function showMate() {
    const up = mateIn && placed <= horizon + radius;
    if (up === mateUp) return;
    mateUp = up;
    mate.style.visibility = up ? 'visible' : 'hidden';
  }

  function fallback(time: number) {
    frame(time / 1000);
    raf = requestAnimationFrame(fallback);
  }

  function frame(time: number) {
    if (!colors) readColors();
    const t = elapsed();
    const scroll = exitScroll();
    const exit = Math.min(1, scroll / (span * 0.6));
    const bootCell = MOSAIC[clamp(Math.floor(t / TICK), 0, MOSAIC.length - 1)];
    const cell = Math.max(bootCell, Math.round(3 + exit * 9));

    // the light: the pointer on hover devices, otherwise a slow orbit round the rest position
    const touch = !reduced && !hover.matches;
    const orbit = Math.PI / 4 + time * 0.2;
    const sx = touch ? Math.cos(orbit) * 1.22 : sunX.get();
    const sy = touch ? Math.sin(orbit) * 1.22 : sunY.get();
    const el = (clamp(90 - 45 * Math.hypot(sx, sy), -50, 90) * Math.PI) / 180;
    const azimuth = Math.atan2(-sy, sx);
    light[0] = Math.cos(el) * Math.cos(azimuth);
    light[1] = Math.cos(el) * Math.sin(azimuth);
    light[2] = Math.sin(el);

    shader?.set('uCell', cell);
    shader?.set('uOutline', cell < 4.5 && t >= BEAT_AT.outline * TICK ? 1 : 0);
    shader?.set('uLight', light);
    if (t < RISE_MS + TICK) place();

    // the ring strokes on as one pen line, the back half, then the front half
    vec4[0] = ORBIT.a;
    vec4[1] = ORBIT.b;
    vec4[2] = ORBIT.tilt;
    vec4[3] = ease(clamp((t - BEAT_AT.ring * TICK) / (6 * TICK)));
    shader?.set('uOrbit', vec4);

    for (let i = 0; i < SATELLITES.length; i++) {
      const s = SATELLITES[i];
      const angle = s.phase * Math.PI * 2 - (reduced ? 0 : (time / ORBIT.period) * Math.PI * 2);
      const ex = ORBIT.a * Math.cos(angle);
      const ey = ORBIT.b * Math.sin(angle);
      const x = ex * Math.cos(ORBIT.tilt) - ey * Math.sin(ORBIT.tilt);
      const y = ex * Math.sin(ORBIT.tilt) + ey * Math.cos(ORBIT.tilt);
      const depth = Math.sqrt(ORBIT.a * ORBIT.a - ORBIT.b * ORBIT.b) * Math.sin(angle);

      // Pop: one inverted frame on its tick
      const at = (BEAT_AT.satellites + i) * TICK;
      vec4[0] = x;
      vec4[1] = -y;
      vec4[2] = depth;
      vec4[3] = t < at ? 0 : t < at + 70 ? 2 : 1;
      shader?.set(PRISM_UNIFORMS[i], vec4);
      // a quaternion tumbling round the satellite's axis
      const turn = (reduced ? 1 : time / s.spin) * Math.PI + i * 1.3;
      const sin = Math.sin(turn);
      vec4[0] = s.axis[0] * sin;
      vec4[1] = s.axis[1] * sin;
      vec4[2] = s.axis[2] * sin;
      vec4[3] = Math.cos(turn);
      shader?.set(ROTATION_UNIFORMS[i], vec4);

      // the label rides above its prism inside the gutters, and Pops off while the moon hides it
      // or once the prism has set behind the horizon
      const [w, h, d] = PRISMS[i];
      const reach = Math.hypot(w, h, d) * radius;
      const half = halves[i];
      const lx = clamp(x * radius, half + left, right - half);
      const ly = y * radius - reach - 14;
      const nx = clamp(0, lx - half, lx + half);
      const ny = clamp(0, ly - 12, ly + 12);
      const behind = depth < 0 && nx * nx + ny * ny < radius * radius;
      const hidden = behind || y * radius - reach + placed > horizon;
      const state = t < at ? 0 : t < at + 70 ? 1 : hidden ? 0 : 2;
      const label = labels[i];
      label.style.transform = `translate3d(${round(lx)}px, ${round(ly)}px, 0) translate(-50%, -50%)`;
      if (state === labelState[i]) continue;
      labelState[i] = state;
      label.style.visibility = state === 0 ? 'hidden' : 'visible';
      const chip = label.firstElementChild as HTMLElement;
      chip.style.background = state === 1 ? 'var(--lp-ink)' : '';
      chip.style.color = state === 1 ? 'var(--lp-paper)' : '';
    }

    // her: she Pops in on her tick, blinks now and then, looks toward the pointer, her moon steps
    // round its ring lit by the same sun; painted only when one of those changes
    const meet = BEAT_AT.mate * TICK;
    if (!shader || !ink || !popInk || t < meet) return;
    const ticks = reduced ? 0 : Math.floor((time * 1000) / TICK);
    const gaze = pointerX < crownX - GLANCE ? 2 : pointerX > crownX + GLANCE ? 3 : 0;
    const eyes = !reduced && ticks % BLINK === 0 ? 1 : gaze;
    const step = Math.floor(ticks / STEP) % ORBIT_STEPS;
    const pop = t < meet + 70;
    const shown = ((pop ? 4 : 0) + eyes) * ORBIT_STEPS + step;
    if (shown === mateShown) return;
    mateShown = shown;
    mateLight[0] = light[0];
    mateLight[1] = -light[1];
    mateLight[2] = light[2];
    paintMate(mateImage, SIT, false, eyes, step, RING, pop ? popInk : ink, mateLight);
    mate.getContext('2d')!.putImageData(mateImage, 0, 0);
    mateIn = true;
    showMate();
  }

  return () => {
    shader?.destroy();
    cancelAnimationFrame(raf);
    stopTheme();
    resize.disconnect();
    view.disconnect();
    window.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(placing);
    clearTimeout(readyTimer);
    window.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', onPointerLeave);
    sunX.destroy();
    sunY.destroy();
  };
}
