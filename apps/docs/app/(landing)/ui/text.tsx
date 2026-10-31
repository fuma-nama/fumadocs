'use client';
import { type ReactNode, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

const ALPHABET = ' abcdefghijklmnopqrstuvwxyz0123456789-_./:@';

interface RollerProps {
  value: string;
  className?: string;
  /** ms per character tick */
  step?: number;
  /** ms between neighbouring cells */
  stagger?: number;
  /** a class for each digit's cell: a fixed width keeps a number's width as it rolls */
  cell?: string;
  /**
   * the value it shows first, held till `play`, then rolled from to `value` once: its strips are
   * there from the start and stay at rest, so nothing is put in or taken out as it rolls
   */
  from?: string;
  play?: boolean;
}

/**
 * Characters that tick to a new value cell by cell, like an odometer, in proportional fonts too: a
 * rolling cell keeps its final character's width while a strip of the characters it passes steps
 * through it, one line a tick.
 */
export function Roller({
  value,
  className,
  step = 36,
  stagger = 24,
  cell,
  from: start,
  play = false,
}: RollerProps) {
  const reduced = useReducedMotion();
  // `from` is the value it rolls from, `null` at rest
  const [roll, setRoll] = useState<{ value: string; from: string | null; id: number }>({
    value,
    from: null,
    id: 0,
  });
  if (roll.value !== value) setRoll({ value, from: reduced ? null : roll.value, id: roll.id + 1 });
  const of = (char: string) => (cell && /\d/.test(char) ? cell : undefined);
  const held = start !== undefined && !reduced;
  const from = held ? start : roll.from;

  if (from === null) {
    if (!cell) return <span className={cn('inline-flex whitespace-pre', className)}>{value}</span>;
    const chars: ReactNode[] = [];
    for (let i = 0; i < value.length; i++)
      chars.push(
        <span key={i} className={of(value[i])}>
          {value[i]}
        </span>,
      );
    return <span className={cn('inline-flex whitespace-pre', className)}>{chars}</span>;
  }

  const cells: ReactNode[] = [];
  const length = Math.max(from.length, value.length);
  // the cell that lands last, whose landing puts it at rest
  let last = -1;
  let lands = -1;
  for (let i = 0; i < length; i++) {
    const was = from[i] ?? ' ';
    const to = value[i] ?? ' ';
    if (was === to) {
      cells.push(
        <span key={i} className={of(to)}>
          {to}
        </span>,
      );
      continue;
    }
    const strip = path(was, to);
    const ticks = strip.length - 1;
    if (i * stagger + ticks * step >= lands) {
      last = i;
      lands = i * stagger + ticks * step;
    }
    cells.push(
      <span key={i} className={cn('relative h-lh overflow-hidden', of(to))}>
        <span className="invisible">{to}</span>
        {/* tick `t` lands at `i * stagger + t * step` */}
        <span
          data-cell={i}
          className="absolute inset-x-0 top-0 text-center"
          style={{
            translate: `0 -${ticks}lh`,
            animation: `lp-roll ${ticks * step}ms steps(${ticks}) ${i * stagger}ms backwards ${held && !play ? 'paused' : 'running'}`,
          }}
        >
          {strip.join('\n')}
        </span>
      </span>,
    );
  }

  const id = roll.id;
  return (
    <span className={cn('inline-flex whitespace-pre', className)}>
      <span className="sr-only">{value}</span>
      {/* at rest once its last cell has landed */}
      <span
        key={id}
        aria-hidden
        className="inline-flex"
        onAnimationEnd={(event) => {
          if (held || (event.target as HTMLElement).dataset.cell !== String(last)) return;
          setRoll((current) => (current.id === id ? { ...current, from: null } : current));
        }}
      >
        {cells}
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
