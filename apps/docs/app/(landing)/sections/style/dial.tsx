'use client';
import { type ReactNode, useCallback, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ditherPath } from '../../lib/dither';
import { clamp } from '../../lib/motion';
import { reduce } from '../../lib/script';
import { paint, THEME_NAMES, THEMES, type ThemeId } from './data';
import { createSprings, due, settleSprings, stepSprings } from './engine';
import type { InkTable } from './presets';

/** the knob's base, how deep its sides show, and its pointer: a hub tapering to a tip */
const BASE = 37;
const SIDE = 5;
const TIP = 56;
const HUB = 15;
/** the chips' ring, and the circle the names stand outside of, a corner on it, past the chips */
const CHIP = 66;
const LABEL = 75;
/** the drawing's reach from the axle: the chips */
const REACH = CHIP + 6;
/** the detents 30° apart; the stop sits at the bottom, between the last preset and the first */
const SWEEP = 330;
const START = -SWEEP / 2;
const DEG = SWEEP / (THEMES.length - 1);
const LAST = THEMES.length - 1;
/** the topmost names' corners, either side of the top, this far over the axle */
const TOP = LABEL * Math.cos((DEG * Math.PI) / 360);
/** inside this radius a drag turns the knob by its height, the angle jumps about near the axle */
const NEAR = 16;
function angleOf(index: number) {
  return START + index * DEG;
}

/** from the axle, 0° up and clockwise */
function polar(r: number, deg: number): [x: number, y: number] {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

function rotate(deg: number) {
  return `rotate(${deg.toFixed(2)})`;
}

/** the pointer of a chicken-head knob pointing up from the axle */
const POINTER = (() => {
  const a = Math.acos(HUB / TIP);
  const x = HUB * Math.sin(a);
  const y = -HUB * Math.cos(a);
  return `M0 ${-TIP}L${x.toFixed(2)} ${y.toFixed(2)}A${HUB} ${HUB} 0 1 1 ${(-x).toFixed(2)} ${y.toFixed(2)}Z`;
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
  onChange: (index: number, instant: boolean) => void,
) {
  const face = root.querySelector<SVGGElement>('[data-face]')!;
  const side = root.querySelector<SVGGElement>('[data-side]')!;
  const handle = root.querySelector<HTMLElement>('[role="slider"]')!;
  const turn = createSprings(1, angleOf(initial));
  const clock = { last: 0, acc: 0 };
  let value = initial;
  let raf = 0;
  /** a drag, around the axle where it was when it began */
  let drag: { id: number; x: number; y: number; prev: number; py: number; raw: number } | null =
    null;

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
    if (reduce()) {
      settleSprings(turn);
      draw();
    } else if (raf === 0) raf = requestAnimationFrame(frame);
  }

  function set(index: number, instant: boolean) {
    if (index === value) return;
    value = index;
    onChange(index, instant);
  }

  /** the pointer around the axle at `x, y`: its angle (0 up, clockwise) and distance */
  function polarOf(event: PointerEvent, x: number, y: number): [deg: number, r: number] {
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    return [(Math.atan2(dx, -dy) * 180) / Math.PI, Math.hypot(dx, dy)];
  }

  function onDown(event: PointerEvent) {
    if (event.button !== 0) return;
    // a drag turns the knob, it never selects the page's text
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
    const box = handle.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const [prev] = polarOf(event, x, y);
    drag = { id: event.pointerId, x, y, prev, py: event.clientY, raw: turn.value[0] };
    cancelAnimationFrame(raf);
    raf = 0;
    turn.velocity[0] = 0;
  }

  function onMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const [deg, r] = polarOf(event, drag.x, drag.y);
    let delta = deg - drag.prev;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (r < NEAR) delta = (drag.py - event.clientY) * 1.5;
    drag.prev = deg;
    drag.py = event.clientY;
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
    // a held key steps faster than a print: keys turn it like a drag
    set(clamp(next, 0, LAST), true);
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
  /** `instant` while the knob is dragged or stepped through the presets */
  onChange: (theme: ThemeId, instant: boolean) => void;
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
      const instance = createKnob(element, start, (i, instant) => onChange(THEMES[i], instant));
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
  const names: Record<'left' | 'right', ReactNode[]> = { left: [], right: [] };
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
    // a name's corner nearest the axle sits on its circle, the name stands outside it in the flow
    const [lx, ly] = polar(LABEL, deg);
    const top = ly < 0 ? `${TOP + ly}px` : `calc(${TOP + ly}px + 1lh)`;
    names[lx < 0 ? 'left' : 'right'].push(
      <button
        key={theme}
        type="button"
        tabIndex={-1}
        onClick={() => {
          engine.current?.turnTo(i);
          onChange(theme, false);
        }}
        className={cn(
          'col-start-1 row-start-1 self-start px-1.5 font-pixel text-xs leading-5 whitespace-nowrap transition-none',
          i === index ? 'bg-lp-yellow text-lp-on-yellow' : 'hover:bg-lp-ink hover:text-lp-paper',
        )}
        style={
          lx < 0
            ? { marginTop: top, marginRight: -lx, justifySelf: 'end' }
            : { marginTop: top, marginLeft: lx, justifySelf: 'start' }
        }
      >
        {THEME_NAMES[theme]}
      </button>,
    );
  }
  const [sx, sy] = polar(CHIP, 180);
  const turned = rotate(angleOf(start));

  return (
    // the names on each side make the dial as wide as they are; the axle is where the sides meet
    <div ref={ref} className="mx-auto grid w-max grid-flow-col auto-cols-max">
      <div className="relative grid" style={{ minWidth: REACH }}>
        {names.left}
        <svg
          aria-hidden
          viewBox={`${-REACH} ${-REACH} ${2 * REACH} ${2 * REACH}`}
          className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 overflow-visible"
          style={{ width: 2 * REACH, height: 2 * REACH }}
        >
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
          <circle cx={5} cy={10} r={BASE} fill={`url(#${id}-shadow)`} />
          <circle cy={SIDE} r={BASE} className="fill-lp-paper stroke-lp-ink" />
          <circle cy={SIDE} r={BASE} fill={`url(#${id}-side)`} />
          <circle r={BASE} className="fill-lp-paper stroke-lp-ink" />
          <g data-side transform={`translate(0 ${SIDE}) ${turned}`}>
            <path d={POINTER} className="fill-lp-paper stroke-lp-ink" />
            <path d={POINTER} fill={`url(#${id}-side)`} />
          </g>
          <g data-face transform={turned}>
            <path d={POINTER} className="fill-lp-paper stroke-lp-ink" />
            <path d={`M0 -8V${9 - TIP}`} strokeWidth={2} className="stroke-lp-ink" />
          </g>
          <circle r={3} className="fill-lp-paper stroke-lp-ink" />
        </svg>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Theme"
          aria-valuemin={0}
          aria-valuemax={LAST}
          aria-valuenow={index}
          aria-valuetext={THEME_NAMES[value]}
          className="absolute top-1/2 right-0 size-28 translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink active:cursor-grabbing"
        />
      </div>
      <div className="grid" style={{ minWidth: REACH }}>
        {names.right}
      </div>
    </div>
  );
}
