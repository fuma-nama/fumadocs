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
}

/**
 * Characters that tick to a new value cell by cell, like an odometer, in proportional fonts too: a
 * rolling cell keeps its final character's width while a strip of the characters it passes steps
 * through it, one line a tick.
 */
export function Roller({ value, className, step = 36, stagger = 24 }: RollerProps) {
  const reduced = useReducedMotion();
  // `from` is the value it rolls from, `null` at rest
  const [roll, setRoll] = useState<{ value: string; from: string | null; id: number }>({
    value,
    from: null,
    id: 0,
  });
  if (roll.value !== value) setRoll({ value, from: reduced ? null : roll.value, id: roll.id + 1 });

  if (roll.from === null) {
    return <span className={cn('inline-flex whitespace-pre', className)}>{value}</span>;
  }

  const cells: ReactNode[] = [];
  const length = Math.max(roll.from.length, value.length);
  for (let i = 0; i < length; i++) {
    const was = roll.from[i] ?? ' ';
    const to = value[i] ?? ' ';
    if (was === to) {
      cells.push(<span key={i}>{to}</span>);
      continue;
    }
    const strip = path(was, to);
    const ticks = strip.length - 1;
    cells.push(
      <span key={i} className="relative h-lh overflow-hidden">
        <span className="invisible">{to}</span>
        {/* tick `t` lands at `i * stagger + t * step` */}
        <span
          className="absolute inset-x-0 top-0 text-center"
          style={{
            translate: `0 -${ticks}lh`,
            animation: `lp-roll ${ticks * step}ms steps(${ticks}) ${i * stagger}ms backwards`,
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
          if (event.currentTarget.getAnimations({ subtree: true }).length > 0) return;
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
