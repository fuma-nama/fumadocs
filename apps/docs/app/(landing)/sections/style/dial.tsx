'use client';
import { type ReactNode, useCallback, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ditherPath } from '../../lib/dither';
import { clamp } from '../../lib/motion';
import { paint, THEME_NAMES, THEMES, type ThemeId } from './data';
import { createSprings, due, settleSprings, stepSprings } from './engine';
import type { InkTable } from './presets';

/** the dial's box in px, the axle's place in it: the names on the left run a little longer */
const W = 320;
const H = 194;
const CX = 164;
const CY = 97;
/** the knob's base, how deep its sides show, and its pointer: a hub tapering to a tip */
const BASE = 42;
const SIDE = 5;
const TIP = 64;
const HUB = 17;
/** where the chips and the names sit, from the axle */
const CHIP = 74;
const LABEL = 88;
/** the detents 30° apart; the stop sits at the bottom, between the last preset and the first */
const SWEEP = 330;
const START = -SWEEP / 2;
const DEG = SWEEP / (THEMES.length - 1);
const LAST = THEMES.length - 1;
/** inside this radius a drag turns the knob by its height, the angle jumps about near the axle */
const NEAR = 16;
function angleOf(index: number) {
  return START + index * DEG;
}

function polar(r: number, deg: number): [x: number, y: number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function rotate(deg: number) {
  return `rotate(${deg.toFixed(2)} ${CX} ${CY})`;
}

/** the pointer of a chicken-head knob pointing up from the axle */
const POINTER = (() => {
  const a = Math.acos(HUB / TIP);
  const x = HUB * Math.sin(a);
  const y = CY - HUB * Math.cos(a);
  return `M${CX} ${CY - TIP}L${(CX + x).toFixed(2)} ${y.toFixed(2)}A${HUB} ${HUB} 0 1 1 ${(CX - x).toFixed(2)} ${y.toFixed(2)}Z`;
})();

/** the scale's ring through the detents, open at the stop */
const SCALE = (() => {
  const [x1, y1] = polar(CHIP, START);
  const [x2, y2] = polar(CHIP, -START);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${CHIP} ${CHIP} 0 1 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
})();

/** dragged, the knob follows the pointer with a pull toward the nearest detent and snaps onto it */
function createKnob(
  root: HTMLElement,
  initial: number,
  onChange: (index: number, turning: boolean) => void,
) {
  const face = root.querySelector<SVGGElement>('[data-face]')!;
  const side = root.querySelector<SVGGElement>('[data-side]')!;
  const handle = root.querySelector<HTMLElement>('[role="slider"]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const turn = createSprings(1, angleOf(initial));
  const clock = { last: 0, acc: 0 };
  let value = initial;
  let raf = 0;
  let drag: { id: number; prev: number; y: number; raw: number } | null = null;

  function draw() {
    face.setAttribute('transform', rotate(turn.value[0]));
    side.setAttribute('transform', `translate(0 ${SIDE}) ${rotate(turn.value[0])}`);
  }

  function frame(now: number) {
    raf = 0;
    let energy = Infinity;
    for (let i = due(clock, now); i > 0; i--) energy = stepSprings(turn, 320, 24);
    draw();
    if (energy > 0.01 && !drag) raf = requestAnimationFrame(frame);
    else clock.last = clock.acc = 0;
  }

  function settle() {
    turn.target[0] = angleOf(value);
    if (reduce.matches) {
      settleSprings(turn);
      draw();
    } else if (raf === 0) raf = requestAnimationFrame(frame);
  }

  function set(index: number, turning: boolean) {
    if (index === value) return;
    value = index;
    onChange(index, turning);
  }

  /** the pointer around the axle: its angle (0 up, clockwise) and distance */
  function polarOf(event: PointerEvent): [deg: number, r: number] {
    const box = handle.getBoundingClientRect();
    const x = event.clientX - (box.left + box.width / 2);
    const y = event.clientY - (box.top + box.height / 2);
    return [(Math.atan2(x, -y) * 180) / Math.PI, Math.hypot(x, y)];
  }

  function onDown(event: PointerEvent) {
    if (event.button !== 0) return;
    // a drag turns the knob, it never selects the page's text
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, prev: polarOf(event)[0], y: event.clientY, raw: turn.value[0] };
    cancelAnimationFrame(raf);
    raf = 0;
    turn.velocity[0] = 0;
  }

  function onMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const [deg, r] = polarOf(event);
    let delta = deg - drag.prev;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (r < NEAR) delta = (drag.y - event.clientY) * 1.5;
    drag.prev = deg;
    drag.y = event.clientY;
    // past a stop it gives a little, then holds
    drag.raw = clamp(drag.raw + delta, angleOf(0) - 12, angleOf(LAST) + 12);
    const index = clamp(Math.round((drag.raw - START) / DEG), 0, LAST);
    turn.value[0] = turn.target[0] = drag.raw + (angleOf(index) - drag.raw) * 0.35;
    draw();
    set(index, true);
  }

  function onUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    onChange(value, false);
    settle();
  }

  function onKey(event: KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowRight: value + 1,
      ArrowUp: value + 1,
      ArrowLeft: value - 1,
      ArrowDown: value - 1,
      PageUp: value + 3,
      PageDown: value - 3,
      Home: 0,
      End: LAST,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    set(clamp(next, 0, LAST), false);
    settle();
  }

  const listening = new AbortController();
  const { signal } = listening;
  handle.addEventListener('pointerdown', onDown, { signal });
  handle.addEventListener('pointermove', onMove, { signal });
  handle.addEventListener('pointerup', onUp, { signal });
  handle.addEventListener('pointercancel', onUp, { signal });
  handle.addEventListener('keydown', onKey, { signal });

  return {
    turnTo(index: number) {
      if (drag || index === value) return;
      value = index;
      settle();
    },
    destroy() {
      cancelAnimationFrame(raf);
      listening.abort();
    },
  };
}

interface DialProps {
  table: InkTable;
  value: ThemeId;
  /** `turning` while the knob is dragged through the presets */
  onChange: (theme: ThemeId, turning: boolean) => void;
}

export function Dial({ table, value, onChange }: DialProps) {
  const id = useId();
  const engine = useRef<ReturnType<typeof createKnob> | null>(null);
  const index = THEMES.indexOf(value);
  // the server draws the knob where it starts; from then on the engine turns it
  const [start] = useState(index);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const instance = createKnob(element, start, (i, turning) => onChange(THEMES[i], turning));
      engine.current = instance;
      return () => {
        instance.destroy();
        engine.current = null;
      };
    },
    [start, onChange],
  );

  const bg = table.tokens.indexOf('background');
  const primary = table.tokens.indexOf('primary');
  const chips: Record<'light' | 'dark', ReactNode[]> = { light: [], dark: [] };
  const labels = [];
  for (let i = 0; i < THEMES.length; i++) {
    const theme = THEMES[i];
    const deg = angleOf(i);
    const [cx, cy] = polar(CHIP, deg);
    for (const mode of ['light', 'dark'] as const) {
      const ink = table.inks[theme][mode];
      chips[mode].push(
        <g key={theme}>
          <rect
            x={cx - 4.5}
            y={cy - 4.5}
            width={9}
            height={9}
            fill={paint(ink[bg])}
            className="stroke-lp-ink"
            shapeRendering="crispEdges"
          />
          <rect x={cx - 1.5} y={cy - 1.5} width={3} height={3} fill={paint(ink[primary])} />
        </g>,
      );
    }
    const [lx, ly] = polar(LABEL, deg);
    const left = Math.sin((deg * Math.PI) / 180) < 0;
    labels.push(
      <button
        key={theme}
        type="button"
        tabIndex={-1}
        onClick={() => {
          engine.current?.turnTo(i);
          onChange(theme, false);
        }}
        className={cn(
          'absolute -translate-y-1/2 px-1.5 font-mono text-xs leading-5 whitespace-nowrap transition-none',
          i === index ? 'bg-lp-yellow text-[#121210]' : 'hover:bg-lp-ink hover:text-lp-paper',
        )}
        style={left ? { right: W - lx, top: ly } : { left: lx, top: ly }}
      >
        {THEME_NAMES[theme]}
      </button>,
    );
  }
  const [sx, sy] = polar(CHIP, 180);
  const turned = rotate(angleOf(start));

  return (
    <div ref={ref} className="relative mx-auto" style={{ width: W, height: H }}>
      <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 overflow-visible">
        <defs>
          <pattern id={`${id}-shadow`} width="4" height="4" patternUnits="userSpaceOnUse">
            <path d={ditherPath(4)} className="fill-lp-ink-2" />
          </pattern>
          <pattern id={`${id}-side`} width="4" height="4" patternUnits="userSpaceOnUse">
            <path d={ditherPath(6)} className="fill-lp-ink" />
          </pattern>
        </defs>
        <path d={SCALE} className="fill-none stroke-lp-line-strong" />
        <g className="dark:hidden">{chips.light}</g>
        <g className="hidden dark:inline">{chips.dark}</g>
        <rect x={sx - 2} y={sy - 6} width={4} height={12} className="fill-lp-ink" />
        <circle cx={CX + 5} cy={CY + 10} r={BASE} fill={`url(#${id}-shadow)`} />
        <circle cx={CX} cy={CY + SIDE} r={BASE} className="fill-lp-paper stroke-lp-ink" />
        <circle cx={CX} cy={CY + SIDE} r={BASE} fill={`url(#${id}-side)`} />
        <circle cx={CX} cy={CY} r={BASE} className="fill-lp-paper stroke-lp-ink" />
        <g data-side transform={`translate(0 ${SIDE}) ${turned}`}>
          <path d={POINTER} className="fill-lp-paper stroke-lp-ink" />
          <path d={POINTER} fill={`url(#${id}-side)`} />
        </g>
        <g data-face transform={turned}>
          <path d={POINTER} className="fill-lp-paper stroke-lp-ink" />
          <path d={`M${CX} ${CY - 8}V${CY - TIP + 9}`} strokeWidth={2} className="stroke-lp-ink" />
        </g>
        <circle cx={CX} cy={CY} r={3} className="fill-lp-paper stroke-lp-ink" />
      </svg>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Theme"
        aria-valuemin={0}
        aria-valuemax={LAST}
        aria-valuenow={index}
        aria-valuetext={THEME_NAMES[value]}
        className="absolute cursor-grab touch-none rounded-full focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink active:cursor-grabbing"
        style={{ left: CX - 56, top: CY - 56, width: 112, height: 112 }}
      />
      {labels}
    </div>
  );
}
