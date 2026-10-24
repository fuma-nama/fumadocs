'use client';
import { useCallback } from 'react';
import {
  cubicBezier,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';
import { createShaderCanvas } from '../../lib/gl';
import { settle, TICK } from '../../lib/motion';
import { setStatus } from '../../lib/status';
import { Chip, type Layer } from '../../ui/spec';
import { BEAT_AT, bootStart } from './boot';
import { moonFragment, PRISMS } from './shader';

const ease = cubicBezier(settle[0], settle[1], settle[2], settle[3]);
const MOSAIC = [64, 32, 16, 8, 4, 3];
const RISE_MS = 1100;
const SPIN = (Math.PI * 2) / 240;
const GLYPHS = '0123456789<>/{}[]=+*#';

/** the icon's light: from the bottom-right, ~35° above the sheet (sun position in moon radii) */
const REST = { x: 0.86, y: 0.86 };

interface Orbit {
  /** semi-axes in moon radii */
  a: number;
  b: number;
  /** in-plane rotation, radians */
  tilt: number;
  /** seconds per turn */
  period: number;
}

const ORBITS: Orbit[] = [
  { a: 1.2, b: 0.3, tilt: (-14 * Math.PI) / 180, period: 36 },
  { a: 1.36, b: 0.24, tilt: (-22 * Math.PI) / 180, period: 48 },
];
const ORBIT_UNIFORMS = ['uOrbit[0]', 'uOrbit[1]'];

interface Satellite {
  layer: Layer;
  orbit: number;
  /** turns: 0 is the right end, 0.25 the front, 0.75 the back */
  phase: number;
  /** tumbling axis (unit) and seconds per turn */
  axis: [number, number, number];
  spin: number;
}

/** they pop in this order; their prisms are `PRISMS` in the same order */
const SATELLITES: Satellite[] = [
  { layer: 'core', orbit: 0, phase: 0.42, axis: [0.28, 0.94, 0.19], spin: 16 },
  { layer: 'ui', orbit: 1, phase: 0.2, axis: [0.89, 0.36, 0.27], spin: 20 },
  { layer: 'content', orbit: 1, phase: 0.02, axis: [0.17, 0.51, 0.85], spin: 24 },
];
const PRISM_UNIFORMS = ['uPrism[0]', 'uPrism[1]', 'uPrism[2]'];
const ROTATION_UNIFORMS = ['uPrismRotation[0]', 'uPrismRotation[1]', 'uPrismRotation[2]'];

export function MoonStage() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const sunX = useMotionValue(REST.x);
  const sunY = useMotionValue(REST.y);
  const springX = useSpring(sunX, { stiffness: 38, damping: 13 });
  const springY = useSpring(sunY, { stiffness: 38, damping: 13 });

  const ref = useCallback(
    (stage: HTMLDivElement | null) => {
      if (!stage) return;
      return mount(stage, { reduced: reduced === true, scrollY, sunX, sunY, springX, springY });
    },
    [reduced, scrollY, sunX, sunY, springX, springY],
  );

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 bottom-(--h) overflow-clip">
        {/* the moon, its rings and prisms: 3.2 x 2.2 moon radii around its centre */}
        <div className="absolute bottom-[calc(var(--d)*-0.05-var(--cut))] left-[calc(var(--cx)-var(--d)*0.8)] z-3 h-[calc(var(--d)*1.1)] w-[calc(var(--d)*1.6)]">
          <canvas className="block size-full" />
        </div>
        <div className="absolute bottom-[calc(var(--d)/2-var(--cut))] left-(--cx)">
          {SATELLITES.map((s) => (
            <div key={s.layer} className="invisible absolute top-0 left-0 z-5">
              <Chip layer={s.layer} />
            </div>
          ))}
        </div>
      </div>
      <p className="invisible absolute right-(--lp-gutter) bottom-[calc(var(--h)-var(--cut)+var(--d)+24px)] z-6 border border-lp-line-strong bg-lp-paper px-2 py-1 font-mono text-xs whitespace-pre text-lp-ink-2">
        <span>light </span>
        <span className="text-lp-orange">315°</span>
        <span> · elevation </span>
        <span className="text-lp-orange">35°</span>
      </p>
    </div>
  );
}

interface MountOptions {
  reduced: boolean;
  scrollY: MotionValue<number>;
  sunX: MotionValue<number>;
  sunY: MotionValue<number>;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
}

function mount(
  stage: HTMLDivElement,
  { reduced, scrollY, sunX, sunY, springX, springY }: MountOptions,
) {
  const clip = stage.firstElementChild as HTMLElement;
  const [scene, anchor] = clip.children as unknown as [HTMLElement, HTMLElement];
  const labels = anchor.children as HTMLCollectionOf<HTMLElement>;
  const readout = stage.lastElementChild as HTMLElement;
  const texts = readout.children;
  const figure = stage.closest<HTMLElement>('[data-figure]');
  const root = document.documentElement;
  const hover = matchMedia('(hover: hover) and (pointer: fine)');

  const canvas = scene.firstElementChild as HTMLCanvasElement;
  const start = bootStart(stage);
  const labelState = new Int8Array(labels.length).fill(-1);
  // per label: half width, then the range of its centre relative to the moon's centre
  const labelBox = new Float32Array(labels.length * 3);
  let radius = 1;
  let dpr = 1;
  // the moon starts to set once the horizon reaches the bottom of the viewport
  let exitStart = 0;
  let span = 1;
  let readoutAt = 0;
  let pointerSeen = false;
  let raf = 0;
  // uniform values written every frame, reused
  const light: [number, number, number] = [0, 0, 0];
  const vec4: [number, number, number, number] = [0, 0, 0, 0];

  const shader = createShaderCanvas(canvas, {
    fragment: moonFragment,
    loop: !reduced,
    onFrame: frame,
  });
  // scripts can run before the stylesheet applies: read the colours until they resolve
  const probe = document.createElement('canvas').getContext('2d')!;
  let colors = false;
  function color(style: CSSStyleDeclaration, name: string): [number, number, number] {
    probe.fillStyle = style.getPropertyValue(name).trim();
    const hex = Number.parseInt(probe.fillStyle.slice(1), 16);
    return [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  }
  function readColors() {
    const style = getComputedStyle(stage);
    colors =
      style.getPropertyValue('--moon-lit') !== '' && style.getPropertyValue('--lp-paper') !== '';
    if (!colors) return;
    shader?.set('uLit', color(style, '--moon-lit'));
    shader?.set('uPaper', color(style, '--lp-paper'));
    shader?.set('uInk', color(style, '--lp-ink'));
    shader?.set('uDark', root.classList.contains('dark') ? 1 : 0);
    shader?.invalidate();
  }
  readColors();
  if (!colors) scene.style.visibility = 'hidden';
  const themeObserver = new MutationObserver(readColors);
  themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });

  const resize = new ResizeObserver(() => {
    radius = scene.clientWidth / 3.2;
    dpr = Math.min(2, window.devicePixelRatio);
    span = window.innerHeight;
    exitStart = Math.max(0, clip.getBoundingClientRect().bottom + window.scrollY - span * 0.92);
    // labels stay inside the frame: their centre's range relative to the moon's centre
    const centre = scene.offsetLeft + radius * 1.6;
    for (let i = 0; i < labels.length; i++) {
      const half = labels[i].offsetWidth / 2;
      labelBox[i * 3] = half;
      labelBox[i * 3 + 1] = half + 8 - centre;
      labelBox[i * 3 + 2] = clip.clientWidth - half - 8 - centre;
    }
    place();
  });
  resize.observe(stage);
  if (!shader && !reduced) raf = requestAnimationFrame(fallback);

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch' || reduced) return;
    const rect = scene.getBoundingClientRect();
    pointerSeen = true;
    sunX.set((e.clientX - rect.left) / radius - 1.6);
    sunY.set((e.clientY - rect.top) / radius - 1.1);
  }
  function onPointerLeave() {
    sunX.set(REST.x);
    sunY.set(REST.y);
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerleave', onPointerLeave);
  const unsubscribeScroll = scrollY.on('change', place);

  let readyTimer = 0;
  if (start !== null && figure) {
    setStatus('booting');
    readyTimer = window.setTimeout(
      () => {
        // only while the hero is the figure the status bar follows (it covers the middle)
        const { top, bottom } = figure.getBoundingClientRect();
        if (top <= innerHeight / 2 && bottom >= innerHeight / 2) setStatus('ready');
      },
      start + BEAT_AT.ready * TICK - performance.now(),
    );
  }

  /** ms since the boot started, `Infinity` without a boot */
  function elapsed() {
    return start === null ? Infinity : performance.now() - start;
  }

  /** px scrolled since the moon started to set */
  function exitScroll() {
    return reduced ? 0 : Math.max(0, scrollY.get() - exitStart);
  }

  function round(v: number) {
    return Math.round(v * dpr) / dpr;
  }

  function rise(t: number) {
    return t < RISE_MS ? (1 - ease(t / RISE_MS)) * radius * 0.6 : 0;
  }

  /** the moon rises out of the horizon at boot and sets behind it on scroll */
  function place() {
    const sink = exitScroll() * 0.55;
    scene.style.transform = `translate3d(0, ${round(rise(elapsed()) + sink)}px, 0)`;
  }

  function fallback(time: number) {
    frame(time / 1000);
    raf = requestAnimationFrame(fallback);
  }

  function frame(time: number) {
    if (!colors) {
      readColors();
      if (colors) scene.style.visibility = '';
    }
    const t = elapsed();
    const scroll = exitScroll();
    const exit = Math.min(1, scroll / (span * 0.6));
    const bootCell = MOSAIC[Math.min(MOSAIC.length - 1, Math.max(0, Math.floor(t / TICK)))];
    const cell = Math.max(bootCell, Math.round(3 + exit * 9));

    // light: the pointer on hover devices, otherwise a slow orbit around the rest position
    let sx = springX.get();
    let sy = springY.get();
    if (!reduced && !hover.matches) {
      const a = Math.PI / 4 + time * 0.2;
      sx = Math.cos(a) * 1.22;
      sy = Math.sin(a) * 1.22;
    } else if (!pointerSeen) {
      sx = REST.x;
      sy = REST.y;
    }
    const elevation = Math.max(-50, Math.min(90, 90 - 45 * Math.hypot(sx, sy)));
    const azimuth = Math.atan2(-sy, sx);
    const el = (elevation * Math.PI) / 180;
    light[0] = Math.cos(el) * Math.cos(azimuth);
    light[1] = Math.cos(el) * Math.sin(azimuth);
    light[2] = Math.sin(el);

    shader?.set('uCell', cell);
    shader?.set('uOutline', cell < 4.5 && t >= BEAT_AT.outline * TICK ? 1 : 0);
    shader?.set('uSpin', 0.9 + (reduced ? 0 : time * SPIN));
    shader?.set('uLight', light);

    if (t < RISE_MS + TICK) place();

    // Draw: each ring strokes on as one pen line, the back half, then the front half
    const draw = ease(Math.min(1, Math.max(0, (t - BEAT_AT.orbits * TICK) / (6 * TICK))));
    for (let k = 0; k < ORBITS.length; k++) {
      const o = ORBITS[k];
      vec4[0] = o.a;
      vec4[1] = o.b;
      vec4[2] = o.tilt;
      vec4[3] = draw;
      shader?.set(ORBIT_UNIFORMS[k], vec4);
    }

    // the satellites fall faster than the moon sets
    const fall = (scroll / span) ** 2 * span * 1.2;
    const lift = rise(t) + scroll * 0.55;
    for (let i = 0; i < SATELLITES.length; i++) {
      const s = SATELLITES[i];
      const o = ORBITS[s.orbit];
      const angle = s.phase * Math.PI * 2 - (reduced ? 0 : (time / o.period) * Math.PI * 2);
      const ex = o.a * Math.cos(angle);
      const ey = o.b * Math.sin(angle);
      const x = ex * Math.cos(o.tilt) - ey * Math.sin(o.tilt);
      const y = ex * Math.sin(o.tilt) + ey * Math.cos(o.tilt) + fall / radius;
      const depth = Math.sqrt(o.a * o.a - o.b * o.b) * Math.sin(angle);

      // Pop: one inverted frame on its tick
      const at = (BEAT_AT.satellites + i) * TICK;
      vec4[0] = x;
      vec4[1] = -y;
      vec4[2] = depth;
      vec4[3] = t < at ? 0 : t < at + 70 ? 2 : 1;
      shader?.set(PRISM_UNIFORMS[i], vec4);
      // a quaternion tumbling around the satellite's axis
      const turn = (reduced ? 1 : time / s.spin) * Math.PI + i * 1.3;
      const sin = Math.sin(turn);
      vec4[0] = s.axis[0] * sin;
      vec4[1] = s.axis[1] * sin;
      vec4[2] = s.axis[2] * sin;
      vec4[3] = Math.cos(turn);
      shader?.set(ROTATION_UNIFORMS[i], vec4);

      // the label rides above its prism, kept in the frame, and Pops off while the moon hides it
      const [w, h, d] = PRISMS[i];
      const half = labelBox[i * 3];
      const lx = Math.min(labelBox[i * 3 + 2], Math.max(labelBox[i * 3 + 1], x * radius));
      const ly = y * radius - Math.hypot(w, h, d) * radius - 14;
      const nx = Math.min(lx + half, Math.max(lx - half, 0));
      const ny = Math.min(ly + 12, Math.max(ly - 12, 0));
      const hidden = depth < 0 && nx * nx + ny * ny < radius * radius;
      const state = t < at ? 0 : t < at + 70 ? 1 : hidden ? 0 : 2;
      const label = labels[i];
      label.style.transform = `translate3d(${round(lx)}px, ${round(ly + lift)}px, 0) translate(-50%, -50%)`;
      if (state === labelState[i]) continue;
      labelState[i] = state;
      label.style.visibility = state === 0 ? 'hidden' : 'visible';
      const chip = label.firstElementChild as HTMLElement;
      chip.style.background = state === 1 ? 'var(--lp-ink)' : '';
      chip.style.color = state === 1 ? 'var(--lp-paper)' : '';
    }

    // Scramble: the readout resolves on its tick, then quotes the light at most ~12 times a second
    const now = performance.now();
    const scrambleAt = BEAT_AT.readout * TICK;
    if (t < scrambleAt || now - readoutAt < 80) return;
    if (readoutAt === 0) readout.style.visibility = 'visible';
    readoutAt = now;
    const values = [
      'light ',
      `${(Math.round((azimuth * 180) / Math.PI) + 360) % 360}°`,
      ' · elevation ',
      `${Math.round(elevation)}°`,
    ];
    const resolved = (t - scrambleAt) / 24;
    let index = 0;
    for (let i = 0; i < values.length; i++) {
      let out = values[i];
      if (resolved < 40) {
        out = '';
        for (const char of values[i]) {
          out +=
            index++ < resolved || char === ' '
              ? char
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      const node = texts[i].firstChild!;
      if (node.nodeValue !== out) node.nodeValue = out;
    }
  }

  return () => {
    shader?.destroy();
    cancelAnimationFrame(raf);
    themeObserver.disconnect();
    resize.disconnect();
    unsubscribeScroll();
    clearTimeout(readyTimer);
    window.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', onPointerLeave);
  };
}
