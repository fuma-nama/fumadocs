'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

const ALPHABET = ' abcdefghijklmnopqrstuvwxyz0123456789-_./:@';

export interface RollerProps {
  value: string;
  className?: string;
  /** ms per character tick */
  step?: number;
  /** ms between neighbouring cells */
  stagger?: number;
}

/**
 * Characters that tick to a new value cell by cell, like an odometer. Works with proportional
 * fonts (Geist Pixel is one): a cell takes the width of its final character, which is also its
 * resting style, so a step easing that lands a hair before its end never leaves the previous one.
 */
export function Roller({ value, className, step = 36, stagger = 24 }: RollerProps) {
  const reduced = useReducedMotion();
  const [state, setState] = useState({ value, from: value, id: 0 });
  if (state.value !== value) setState({ value, from: state.value, id: state.id + 1 });

  // plain text until the first roll: a cell per character only once one can move
  if (state.id === 0 || reduced) {
    return <span className={cn('inline-flex whitespace-pre', className)}>{value}</span>;
  }

  const cells = [];
  const length = Math.max(state.from.length, value.length);
  for (let i = 0; i < length; i++) {
    const from = state.from[i] ?? ' ';
    const to = value[i] ?? ' ';
    cells.push(
      <Cell
        key={`${state.id}:${i}`}
        strip={reduced || from === to ? [to] : path(from, to)}
        step={step}
        delay={i * stagger}
      />,
    );
  }

  return (
    <span className={cn('inline-flex whitespace-pre', className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {cells}
      </span>
    </span>
  );
}

function Cell({ strip, step, delay }: { strip: string[]; step: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const ticks = strip.length - 1;
  const end = `translateY(${(-100 * ticks) / strip.length}%)`;

  useLayoutEffect(() => {
    if (ticks === 0) return;
    const animation = ref.current!.animate([{ transform: 'translateY(0)' }, { transform: end }], {
      duration: ticks * step,
      delay,
      easing: `steps(${ticks}, end)`,
      fill: 'backwards',
    });
    return () => animation.cancel();
  }, [ticks, end, step, delay]);

  return (
    <span className="relative h-[1lh] overflow-hidden">
      <span className="invisible">{strip[ticks]}</span>
      <span
        ref={ref}
        style={{ transform: end }}
        className="absolute inset-x-0 top-0 flex flex-col items-center"
      >
        {strip.map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </span>
    </span>
  );
}

/** characters passed between `from` and `to` on the wheel, at most six ticks */
function path(from: string, to: string): string[] {
  const a = ALPHABET.indexOf(from.toLowerCase());
  const b = ALPHABET.indexOf(to.toLowerCase());
  if (a === -1 || b === -1) return [from, to];
  const distance = (b - a + ALPHABET.length) % ALPHABET.length;
  const ticks = Math.min(distance, 6);
  const out = [from];
  for (let i = 1; i < ticks; i++) {
    out.push(ALPHABET[(a + Math.round((distance * i) / ticks)) % ALPHABET.length]);
  }
  out.push(to);
  return out;
}
