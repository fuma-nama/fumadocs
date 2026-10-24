'use client';
import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { TICK } from '../../lib/motion';
import { DitherSwap } from '../../ui/dither';
import { paint } from './data';
import type { Wiring } from './presets';
import { STEP } from './rope';
import { createSprings, type Springs, stepSprings } from './spring';

export interface ConvertProps {
  /** the variables, without `--color-fd-` */
  names: string[];
  light: Wiring;
  dark: Wiring;
  /** the preset, a new one re-routes the wires and dithers the chips in */
  preset: string;
}

/**
 * The variables of a preset wired to its colours, light to dark, like a cipher: shared values
 * gather many variables, so the wires cross. A preset that maps to your own variables (shadcn)
 * wires one to one; this page's palette stands in for them. Rows are `--row` tall.
 */
export function Convert({ names, light, dark, preset }: ConvertProps) {
  const rows = [];
  for (const name of names) {
    rows.push(
      <li key={name} className="truncate">
        {name}
      </li>,
    );
  }

  return (
    <div className="flex px-4 py-3 font-mono text-[11px] leading-(--row)">
      <ol aria-label="Variables" className="w-[150px] shrink-0 text-end text-lp-ink-2">
        {rows}
      </ol>
      <Wires wiring={light} preset={preset} className="flex dark:hidden" />
      <Wires wiring={dark} preset={preset} className="hidden dark:flex" />
    </div>
  );
}

function Wires({
  wiring,
  preset,
  className,
}: {
  wiring: Wiring;
  preset: string;
  className: string;
}) {
  const n = wiring.to.length;
  const pitch = n / wiring.chips.length;
  const svg = useRef<SVGSVGElement>(null);
  /** where the wires end, on springs: they swing over to the new chips */
  const ends = useRef<Springs | null>(null);

  useLayoutEffect(() => {
    const lines = svg.current!.querySelectorAll('line');
    let springs = ends.current;
    if (!springs) {
      springs = createSprings(lines.length);
      for (let i = 0; i < lines.length; i++)
        springs.value[i] = springs.target[i] = Number(lines[i].getAttribute('y2'));
      ends.current = springs;
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      springs.target[i] = Number(lines[i].getAttribute('y2'));
      lines[i].setAttribute('y2', springs.value[i].toFixed(3));
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      springs.value.set(springs.target);
      for (let i = 0; i < lines.length; i++) lines[i].setAttribute('y2', String(springs.target[i]));
      return;
    }
    const s = springs;
    let raf = 0;
    let last = 0;
    let acc = 0;
    const tick = (now: number) => {
      acc += last === 0 ? STEP : Math.min(0.05, (now - last) / 1000);
      last = now;
      let energy = 0;
      while (acc >= STEP) {
        acc -= STEP;
        energy = stepSprings(s, STEP, 320, 20);
      }
      for (let i = 0; i < lines.length; i++) lines[i].setAttribute('y2', s.value[i].toFixed(3));
      if (energy > 0.002) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wiring]);

  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push(
      <line
        key={i}
        x1={0}
        y1={i + 0.5}
        x2={100}
        y2={pitch * (wiring.to[i] + 0.5)}
        vectorEffect="non-scaling-stroke"
      />,
    );
  }
  const chips = [];
  for (let i = 0; i < wiring.chips.length; i++) {
    chips.push(
      <span
        key={i}
        className="absolute left-1.5 size-4 border border-lp-ink"
        style={{
          top: `calc(var(--row) * ${(pitch * (i + 0.5)).toFixed(3)} - 8px)`,
          background: paint(wiring.chips[i]),
        }}
      />,
    );
  }

  return (
    <div aria-hidden className={cn('min-w-0 flex-1', className)}>
      <svg
        ref={svg}
        viewBox={`0 0 100 ${n}`}
        preserveAspectRatio="none"
        className="ms-3 w-0 flex-1 overflow-visible stroke-lp-ink"
        style={{ height: `calc(var(--row) * ${n})` }}
      >
        {lines}
      </svg>
      {/* the chips sit on the preset's own background, so translucent values show as they do */}
      <DitherSwap swapKey={preset} cell={2} duration={2 * TICK} className="w-7 shrink-0">
        <span
          className="relative block h-full border-x border-lp-line-strong"
          style={{ background: paint(wiring.chips[wiring.to[0]]) }}
        >
          {chips}
        </span>
      </DitherSwap>
    </div>
  );
}
