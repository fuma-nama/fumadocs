'use client';
import { type ComponentProps, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

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

/** a solid block caret */
export function Caret({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      {...props}
      className={cn(
        'lp-caret inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] bg-current',
        className,
      )}
    />
  );
}
