'use client';
import { type ReactNode, useCallback, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { whenSeen } from '../../lib/later';
import { BEAT } from '../../lib/motion';

/** the head sweeps the whole wall in two beats */
const SWEEP = BEAT * 2;

/**
 * The press: the wall is printed once in front of the reader, a head sweeping it down from a blank
 * sheet. A wall already in view, or with reduced motion, is simply there.
 */
export function Press({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [blank, setBlank] = useState(false);

  // only a wall the reader hasn't reached yet starts blank
  const wall = useCallback(
    (root: HTMLDivElement | null) => {
      if (root && !reduced && root.getBoundingClientRect().top > window.innerHeight) setBlank(true);
    },
    [reduced],
  );

  const sheet = useCallback((cover: HTMLDivElement | null) => {
    if (!cover) return;
    let sweep: Animation | undefined;
    const stop = whenSeen(
      cover,
      () => {
        sweep = cover.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], {
          duration: SWEEP,
        });
        sweep.onfinish = () => setBlank(false);
      },
      // once its top is a quarter of the screen up
      { rootMargin: '0px 0px -25% 0px' },
    );
    return () => {
      stop();
      sweep?.cancel();
    };
  }, []);

  return (
    <div ref={wall} className="relative">
      {children}
      {blank && (
        <div aria-hidden className="pointer-events-none absolute inset-px overflow-hidden">
          <div ref={sheet} className="size-full border-t border-lp-ink bg-lp-paper" />
        </div>
      )}
    </div>
  );
}
