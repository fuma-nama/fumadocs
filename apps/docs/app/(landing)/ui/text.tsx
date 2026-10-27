'use client';
import { type ComponentProps, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { whenSeen } from '../lib/later';

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789<>/{}[]=+*#';

interface ScrambleProps extends Omit<ComponentProps<'span'>, 'children'> {
  text: string;
  /** ms per resolved character */
  speed?: number;
  delay?: number;
}

/** text that decodes from random glyphs, left to right, when mounted and whenever `text` changes */
export function Scramble({ text, speed = 28, delay = 0, className, ...props }: ScrambleProps) {
  const reduced = useReducedMotion();
  const ref = useCallback(
    (element: HTMLSpanElement | null) => {
      const node = element?.firstChild;
      if (!element || reduced || !(node instanceof Text)) return;
      const start = performance.now() + delay;
      let frame = 0;
      let raf = 0;
      const tick = (now: number) => {
        const resolved = Math.floor((now - start) / speed);
        // glyphs flicker at half the display rate, like video frames
        if (frame++ % 2 === 0) {
          let out = '';
          for (let i = 0; i < text.length; i++) {
            out +=
              i < resolved || text[i] === ' '
                ? text[i]
                : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          node.nodeValue = out;
        }
        if (resolved < text.length) raf = requestAnimationFrame(tick);
        else node.nodeValue = text;
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        node.nodeValue = text;
      };
    },
    [text, speed, delay, reduced],
  );

  return (
    // remount per text so React and the effect never share a stale text node
    <span key={text} ref={ref} {...props} className={cn('whitespace-pre', className)}>
      {text}
    </span>
  );
}

const ALPHABET = ' abcdefghijklmnopqrstuvwxyz0123456789-_./:@';

interface RollerProps {
  value: string;
  /** a value to roll in from as it mounts */
  from?: string;
  className?: string;
  /** ms per character tick */
  step?: number;
  /** ms between neighbouring cells */
  stagger?: number;
}

/**
 * Characters that tick to a new value cell by cell, like an odometer, in proportional fonts too: a
 * rolling cell takes its final character's width and swaps its glyph in place on each tick.
 */
export function Roller({ value, from, className, step = 36, stagger = 24 }: RollerProps) {
  const reduced = useReducedMotion();
  // `from` is the value it rolls from, `null` at rest
  const [roll, setRoll] = useState<{ value: string; from: string | null; id: number }>({
    value,
    from: from ?? null,
    id: 0,
  });
  if (roll.value !== value) setRoll({ value, from: reduced ? null : roll.value, id: roll.id + 1 });
  const rolling = roll.from !== null && !reduced;
  const cells = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!rolling) return;
    const from = roll.from!;
    const row = cells.current!.children;
    const glyphs: Text[] = [];
    const strips: string[][] = [];
    for (let i = 0; i < row.length; i++) {
      const was = from[i] ?? ' ';
      const to = roll.value[i] ?? ' ';
      glyphs.push(row[i].lastChild!.firstChild as Text);
      strips.push(was === to ? [to] : path(was, to));
    }
    // tick `t` of cell `i` lands at `i * stagger + t * step` after the roll's first frame
    let start = -1;
    let frame = requestAnimationFrame(function tick(now) {
      if (start < 0) start = now;
      let moving = false;
      for (let i = 0; i < glyphs.length; i++) {
        const strip = strips[i];
        const at = Math.min(
          strip.length - 1,
          Math.floor(Math.max(0, now - start - i * stagger) / step),
        );
        if (at < strip.length - 1) moving = true;
        if (glyphs[i].data !== strip[at]) glyphs[i].data = strip[at];
      }
      if (moving) frame = requestAnimationFrame(tick);
      else setRoll((current) => (current === roll ? { ...current, from: null } : current));
    });
    return () => cancelAnimationFrame(frame);
  }, [roll, rolling, step, stagger]);

  if (!rolling) {
    return <span className={cn('inline-flex whitespace-pre', className)}>{value}</span>;
  }

  const items = [];
  const length = Math.max(roll.from!.length, value.length);
  for (let i = 0; i < length; i++) {
    items.push(
      <span key={`${roll.id}:${i}`} className="relative h-[1lh] overflow-hidden">
        <span className="invisible">{value[i] ?? ' '}</span>
        <span className="absolute inset-x-0 top-0 flex justify-center">{roll.from![i] ?? ' '}</span>
      </span>,
    );
  }

  return (
    <span className={cn('inline-flex whitespace-pre', className)}>
      <span className="sr-only">{value}</span>
      <span ref={cells} aria-hidden className="inline-flex">
        {items}
      </span>
    </span>
  );
}

/**
 * Text that regenerates once, rolling in from blank, when it's all on screen: an update the reader
 * sees land. Static before that, without script and under reduced motion.
 */
export function Regenerate({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [seen, setSeen] = useState(false);
  const ref = useCallback(
    (element: HTMLSpanElement | null) => {
      if (element && !reduced) return whenSeen(element, () => setSeen(true), { threshold: 1 });
    },
    [reduced],
  );

  return (
    <span ref={ref}>
      {seen ? <Roller value={text} from={' '.repeat(text.length)} stagger={32} /> : text}
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
