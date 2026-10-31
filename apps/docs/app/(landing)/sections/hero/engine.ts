import { springValue } from 'motion/react';
import { type MateInk, mateAt, mateInk, ORBIT_STEPS, paintMate } from '@/components/mascot/paint';
import { LEGS, MATE_H, MATE_W, SIT } from '@/components/mascot/sprite';
import {
  createMesh,
  housePalette,
  identity,
  MATERIAL,
  type Mat4,
  type PartSpec,
  transform,
  type Vec3,
} from '../../lib/mesh';
import { clamp, easeOut, TICK } from '../../lib/motion';
import { reduce } from '../../lib/script';
import { report } from '../../lib/status';
import { createTalk } from './talk';
import {
  bakeRelief,
  CELL,
  CROWN,
  figureShader,
  HORIZON,
  MOON,
  REACH,
  RING,
  SATELLITES,
  skyShader,
} from './scene';

/** boot beats, in ticks from the start */
export const BEAT_AT = {
  ring: 2,
  satellites: 6,
  glitch: 9,
  mate: 10,
  ready: 13,
  /** her first bubble */
  talk: 15,
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
    boot = reduce() ? null : performance.now();
  }
  return boot;
}

/** ms until a beat, negative once it passed */
export function untilBeat(start: number, tick: number): number {
  return start + tick * TICK - performance.now();
}

/** the boot's mosaic, canvas px a cell, then the page's dots at rest */
const MOSAIC = [64, 32, 16, 8, 4, 2];
/** at boot the moon rises from this many radii under its place */
const RISE = 0.6;
const RISE_MS = 1100;
/** the icon's light: from the bottom-right, ~35° above the sheet (sun position in moon radii) */
const REST = { x: 0.86, y: 0.86 };
const SUN = { stiffness: 38, damping: 13 };

/** the satellites' ring: semi-axes in moon radii, in-plane tilt in radians, seconds a turn */
const ORBIT = { a: 1.3, b: 0.27, tilt: (-18 * Math.PI) / 180, period: 42 };
/** her moon's ring round her crown, cells wide */
const RING_CELLS = 21;
/** her cells a moon radius: she is an eighth of its width */
const CELLS = 120;
/** the drawing's height over the horizon in moon radii: the moon, and her on its crown */
export const SKY = CROWN + (MATE_H - LEGS) / CELLS;
/** a shooting star: ticks between two, about, ticks one lasts, dither cells a tick */
const SHOOT = { every: 100, ticks: 6, speed: 14 };
/** the scene's bounds in moon radii, for the light */
const BOUNDS: [Vec3, Vec3] = [
  [-REACH, -1.5, -2],
  [REACH, 1.5, 2],
];

/** the moon, the satellites' prisms, then the ring's plane; the moon and the ring are never
 * outlined (id 0) */
const PARTS: PartSpec[] = [
  { shape: 'sphere', id: 0, material: MOON, shadow: false },
  ...SATELLITES.map((_, i) => ({
    shape: 'box' as const,
    id: i + 1,
    material: MATERIAL.paper,
    shadow: false,
  })),
  { shape: 'box', id: 0, material: RING, shadow: false },
];
const RING_PART = SATELLITES.length + 1;

/** a satellite `clock` s into its turns: x right and y up from the moon's centre in moon radii,
 * and its depth toward the viewer */
function onRing(phase: number, clock: number): Vec3 {
  const angle = phase * Math.PI * 2 - (clock / ORBIT.period) * Math.PI * 2;
  const ex = ORBIT.a * Math.cos(angle);
  const ey = ORBIT.b * Math.sin(angle);
  return [
    ex * Math.cos(ORBIT.tilt) - ey * Math.sin(ORBIT.tilt),
    -ex * Math.sin(ORBIT.tilt) - ey * Math.cos(ORBIT.tilt),
    Math.sqrt(ORBIT.a * ORBIT.a - ORBIT.b * ORBIT.b) * Math.sin(angle),
  ];
}

/** the ring's plane, a thin box over the orbit's circle with room for its halo: its axes the
 * circle's two radii, from the ring's right end and its front, and its thickness, right-handed so its
 * faces turn out */
function ringPlane(): Mat4 {
  const { a, b, tilt } = ORBIT;
  const c = Math.sqrt(a * a - b * b);
  const room = 2 * 1.15;
  const m = identity();
  m.set([a * Math.cos(tilt) * room, -a * Math.sin(tilt) * room, 0], 0);
  m.set([-b * Math.sin(tilt) * room, -b * Math.cos(tilt) * room, c * room], 4);
  m.set([(-c * Math.sin(tilt) * 1e-3) / a, (-c * Math.cos(tilt) * 1e-3) / a, (-b * 1e-3) / a], 8);
  return m;
}

/** `m` set to a box at `at`, of half sizes `half`, turned `turn` radians round unit `axis` */
function boxAt(m: Mat4, at: Vec3, half: readonly number[], axis: readonly number[], turn: number) {
  const sin = Math.sin(turn / 2);
  const x = axis[0] * sin;
  const y = axis[1] * sin;
  const z = axis[2] * sin;
  const w = Math.cos(turn / 2);
  m.set([
    (1 - 2 * (y * y + z * z)) * 2 * half[0],
    2 * (x * y + z * w) * 2 * half[0],
    2 * (x * z - y * w) * 2 * half[0],
    0,
    2 * (x * y - z * w) * 2 * half[1],
    (1 - 2 * (x * x + z * z)) * 2 * half[1],
    2 * (y * z + x * w) * 2 * half[1],
    0,
    2 * (x * z + y * w) * 2 * half[2],
    2 * (y * z - x * w) * 2 * half[2],
    (1 - 2 * (x * x + y * y)) * 2 * half[2],
    0,
    ...at,
    1,
  ]);
}

/** a 32-bit integer's bits mixed (lowbias32) */
function mix32(n: number): number {
  const h = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  const k = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (k ^ (k >>> 16)) >>> 0;
}

/** the moon's near side, baked once a page */
let relief: ImageData | undefined;

/** the moon: it rises at boot, lit from the pointer, its satellites in orbit and her on its crown;
 * it sets as its sky leaves */
export function createHero(stage: HTMLElement, reduced: boolean): (() => void) | undefined {
  const scene = stage.firstElementChild;
  const canvas = scene?.firstElementChild;
  const drawing = canvas?.nextElementSibling;
  const mate = drawing?.firstElementChild;
  const labels = scene?.querySelectorAll<HTMLElement>(':scope > [data-satellite]');
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
  if (!pen) return;
  relief ??= bakeRelief();
  const mesh = createMesh(canvas, {
    parts: PARTS,
    shader: { scene: figureShader, backdrop: skyShader, textures: { uRelief: relief } },
    onFrame: () => frame(),
    onResize: (width, height) => measure(width, height),
    theme(page) {
      mesh!.uniform('uInk', page.ink);
      mesh!.uniform('uPaper', page.paper);
      // the stars' sparkles: a yellow one would vanish on light paper
      mesh!.uniform('uSun', page.night ? page.yellow : page.sun);
      mesh!.uniform('uDark', page.night ? 1 : 0);
      ink = mateInk(getComputedStyle(stage));
      popInk = { ...ink, line: ink.lit, pen: ink.paper, lit: ink.line, paper: ink.pen };
      mateShown = -1;
      return { ...housePalette(page), line: page.ink, accent: page.yellow };
    },
  });
  if (!mesh) return;
  const zero = performance.now();
  const hero = stage.parentElement!;
  const mateImage = new ImageData(MATE_W, MATE_H);
  const touch = !reduced && !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const sunX = springValue(REST.x, SUN);
  const sunY = springValue(REST.y, SUN);
  const start = bootStart();
  /** CSS px a moon radius, CSS px a canvas px, the canvas's CSS px size */
  let radius = 1;
  let pitch = 1;
  let width = 1;
  let height = 1;
  /** px from the moon's centre to the pointer */
  let pointerX = Number.NaN;
  const light: Vec3 = [0, 0, 1];
  const shoot: [number, number, number, number] = [0, 0, 0, 0];
  const orbit: [number, number, number, number] = [ORBIT.a, ORBIT.b, ORBIT.tilt, 0];
  const prisms = SATELLITES.map(() => identity());
  /** each label's place, the satellite's centre, and its size */
  const places = SATELLITES.map(() => identity());
  const sizes = SATELLITES.map(() => ({ w: 0, h: 0 }));
  const pins = SATELLITES.map((s, i) =>
    mesh.anchor(labels[i], places[i], [0, Math.hypot(...s.size), 0]),
  );
  let ink: MateInk | undefined;
  let popInk: MateInk | undefined;
  let mateShown = -1;
  const mateLight: Vec3 = [0, 0, 0];

  // the moon's sphere a little larger than the disc its material draws, so its facets clear it
  mesh.place(0, transform(identity(), [0, 0, 0], [0, 0, 0], [2.1, 2.1, 2.1]));
  mesh.place(RING_PART, ringPlane());

  const sized = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const [box] = entry.borderBoxSize;
      sizes[Array.prototype.indexOf.call(labels, entry.target)] = {
        w: box.inlineSize,
        h: box.blockSize,
      };
    }
    mesh.invalidate();
  });
  for (const label of labels) sized.observe(label);

  /** the camera on the moon, `rise` radii under its place */
  const look = (rise: number) => {
    mesh.camera({
      width,
      height,
      scale: radius,
      origin: [width / 2, height - (HORIZON - rise) * radius],
      depth: [0, 0],
      z: [3, -3],
    });
  };

  const measure = (w: number, h: number) => {
    width = w;
    height = h;
    pitch = w / canvas.width;
    // the moon as large as it fits the sky's box, and her over the crown at a px a cell, the least
    // she is drawn at
    radius = Math.min(w / (2 * REACH), h / SKY, (h - (MATE_H - LEGS)) / CROWN);
    scene.style.setProperty('--r', `${radius}px`);
    mesh.uniform('uRadius', radius / pitch);
    // her cell: an eighth of the moon's width over her 30, in whole device px, a CSS px at least,
    // and her canvas no taller than the sky over the moon's crown
    const room = h - CROWN * radius;
    const cell = Math.min(
      Math.round((radius * devicePixelRatio) / CELLS),
      Math.floor((room * devicePixelRatio) / (MATE_H - LEGS)),
    );
    scene.style.setProperty('--cell', `${Math.max(1, cell / devicePixelRatio)}px`);
    look(0);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const rect = drawing.getBoundingClientRect();
    pointerX = e.clientX - rect.left - rect.width / 2;
    sunX.set(pointerX / radius);
    sunY.set((e.clientY - rect.bottom) / radius + HORIZON);
    mesh.invalidate();
  };
  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    sunX.set(REST.x);
    sunY.set(REST.y);
    pointerX = Number.NaN;
    mesh.invalidate();
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
  const stopTalk = createTalk(
    drawing,
    mate,
    reduced || start === null ? null : untilBeat(start, BEAT_AT.talk),
  );

  const frame = () => {
    const now = performance.now();
    const time = (now - zero) / 1000;
    const t = start === null ? Infinity : now - start;
    // drawn every frame while anything moves: the satellites do, save with reduced motion
    if (!reduced || t < BEAT_AT.ready * TICK || sunX.isAnimating() || sunY.isAnimating())
      mesh.invalidate();

    mesh.uniform('uCell', MOSAIC[clamp(Math.floor(t / TICK), 0, MOSAIC.length - 1)]);
    if (t < RISE_MS) look((1 - easeOut(t / RISE_MS)) * RISE);

    const turn = Math.PI / 4 + time * 0.2;
    const sx = touch ? Math.cos(turn) * 1.22 : sunX.get();
    const sy = touch ? Math.sin(turn) * 1.22 : sunY.get();
    const el = (clamp(90 - 45 * Math.hypot(sx, sy), -50, 90) * Math.PI) / 180;
    const azimuth = Math.atan2(-sy, sx);
    light[0] = Math.cos(el) * Math.cos(azimuth);
    light[1] = Math.cos(el) * Math.sin(azimuth);
    light[2] = Math.sin(el);
    mesh.light(light, BOUNDS[0], BOUNDS[1]);

    const beat = reduced ? 0 : (time * 1000) / TICK;
    mesh.uniform('uTwinkle', Math.floor(beat));
    const event = Math.floor(beat / SHOOT.every);
    const seed = mix32(event);
    const run = beat - event * SHOOT.every - 1 - (seed % (SHOOT.every - SHOOT.ticks - 2));
    shoot[2] = run >= 0 && run < SHOOT.ticks ? (seed & 1 ? 1 : -1) : 0;
    shoot[3] = 0.35 + (0.25 * ((seed >>> 8) & 255)) / 255;
    const from = (shoot[2] < 0 ? 0.5 : 0) + (0.5 * ((seed >>> 16) & 255)) / 255;
    shoot[0] = Math.floor(
      from * Math.floor(canvas.width / (CELL * mesh.dot)) + shoot[2] * SHOOT.speed * run,
    );
    shoot[1] = Math.floor(
      (0.05 + (0.3 * (seed >>> 24)) / 255) * Math.floor(canvas.height / (CELL * mesh.dot)) +
        shoot[3] * SHOOT.speed * run,
    );
    mesh.uniform('uShoot', shoot);

    // the ring strokes on as one pen line, the back half, then the front half
    orbit[3] = easeOut(clamp((t - BEAT_AT.ring * TICK) / (6 * TICK)));
    mesh.uniform('uOrbit', orbit);

    const reach = REACH * radius;
    for (let i = 0; i < SATELLITES.length; i++) {
      const s = SATELLITES[i];
      const at = onRing(s.phase, reduced ? 0 : time);
      const due = (BEAT_AT.satellites + i) * TICK;
      boxAt(prisms[i], at, s.size, s.axis, 2 * ((reduced ? 1 : time / s.spin) * Math.PI + i * 1.3));
      mesh.place(i + 1, prisms[i]);
      mesh.show(i + 1, t >= due);
      mesh.material(i + 1, t < due + POP_MS ? MATERIAL.ink : MATERIAL.paper);

      const pin = pins[i];
      const { w, h } = sizes[i];
      places[i][12] = at[0];
      places[i][13] = at[1];
      places[i][14] = at[2];
      const x = at[0] * radius;
      pin.offset[0] = clamp(x - w / 2, -reach, reach - w) - x;
      pin.offset[1] = -h;
      pin.shown = !(at[2] < 0 && at[0] * at[0] + at[1] * at[1] < 1);
      const state = t < due ? 'off' : t < due + POP_MS ? 'pop' : 'on';
      if (labels[i].dataset.state !== state) labels[i].dataset.state = state;
    }

    const meet = BEAT_AT.mate * TICK;
    if (!ink || !popInk || t < meet) return;
    const { eyes, step } = mateAt(reduced ? null : Math.floor((time * 1000) / TICK), pointerX);
    const pop = t < meet + POP_MS;
    const shown = ((pop ? 4 : 0) + eyes) * ORBIT_STEPS + step;
    if (shown === mateShown) return;
    mateShown = shown;
    mateLight[0] = light[0];
    mateLight[1] = -light[1];
    mateLight[2] = light[2];
    paintMate(mateImage, SIT, false, eyes, step, RING_CELLS, pop ? popInk : ink, mateLight);
    pen.putImageData(mateImage, 0, 0);
    mate.style.visibility = 'visible';
  };

  return () => {
    mesh.destroy();
    moonset?.cancel();
    sized.disconnect();
    clearTimeout(readyTimer);
    stopTalk();
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    sunX.destroy();
    sunY.destroy();
  };
}
