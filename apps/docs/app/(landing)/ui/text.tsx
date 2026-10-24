'use client';
import { type ComponentProps, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789<>/{}[]=+*#';

export interface ScrambleProps extends Omit<ComponentProps<'span'>, 'children'> {
  text: string;
  /** `view`: when first on screen, `mount`: right away; a changed `text` always replays */
  trigger?: 'view' | 'mount';
  /** ms per resolved character */
  speed?: number;
  delay?: number;
  glyphs?: string;
}

/** text that decodes from random glyphs, left to right */
export function Scramble({
  text,
  trigger = 'view',
  speed = 28,
  delay = 0,
  glyphs = GLYPHS,
  className,
  ...props
}: ScrambleProps) {
  const reduced = useReducedMotion();
  const ref = useCallback(
    (element: HTMLSpanElement | null) => {
      const node = element?.firstChild;
      if (!element || reduced || !(node instanceof Text)) return;
      let raf = 0;
      let observer: IntersectionObserver | undefined;

      const play = () => {
        const start = performance.now() + delay;
        let frame = 0;
        const tick = (now: number) => {
          const resolved = Math.floor((now - start) / speed);
          // glyphs flicker at half the display rate, like video frames
          if (frame++ % 2 === 0) {
            let out = '';
            for (let i = 0; i < text.length; i++) {
              out +=
                i < resolved || text[i] === ' '
                  ? text[i]
                  : glyphs[Math.floor(Math.random() * glyphs.length)];
            }
            node.nodeValue = out;
          }
          if (resolved < text.length) raf = requestAnimationFrame(tick);
          else node.nodeValue = text;
        };
        raf = requestAnimationFrame(tick);
      };

      if (trigger === 'mount') play();
      else {
        observer = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          observer?.disconnect();
          play();
        });
        observer.observe(element);
      }

      return () => {
        observer?.disconnect();
        cancelAnimationFrame(raf);
        node.nodeValue = text;
      };
    },
    [text, trigger, speed, delay, glyphs, reduced],
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
