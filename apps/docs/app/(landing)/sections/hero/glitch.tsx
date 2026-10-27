'use client';
import { useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { BEAT_AT, bootStart, untilBeat } from './engine';

const slice = 'invisible absolute inset-y-0 -inset-x-[0.12em] bg-lp-paper px-[0.12em]';

/** a frame of a slice: the band it shows, from its top and bottom in %, shifted in em */
function frame(top: number, bottom: number, shift: number, inverted = false): Keyframe {
  return {
    visibility: 'visible',
    clipPath: `inset(${top}% 0 ${bottom}% 0)`,
    transform: `translateX(${shift}em)`,
    backgroundColor: inverted ? 'var(--lp-ink)' : 'var(--lp-paper)',
    color: inverted ? 'var(--lp-paper)' : 'var(--lp-ink)',
    easing: 'step-end',
  };
}

/** each slice's three frames */
const KEYFRAMES = [
  [frame(14, 58, 0.07), frame(46, 38, -0.1, true), frame(70, 10, 0.08), { visibility: 'hidden' }],
  [frame(62, 20, -0.05), frame(20, 70, 0.04), frame(0, 100, 0), { visibility: 'hidden' }],
];

/** a burst of slice offsets at boot, then every 5-9s */
export function Glitch({ children }: { children: string }) {
  const reduced = useReducedMotion();
  const ref = useCallback(
    (root: HTMLSpanElement | null) => {
      if (!root) return;
      const start = bootStart(root);
      if (reduced) return;
      const layers = root.querySelectorAll('span');
      let timer = 0;
      const play = () => {
        for (let i = 0; i < layers.length; i++) layers[i].animate(KEYFRAMES[i], { duration: 150 });
        timer = window.setTimeout(play, 5000 + Math.random() * 4000);
      };
      timer = window.setTimeout(
        play,
        start === null ? 5000 + Math.random() * 4000 : untilBeat(start, BEAT_AT.glitch),
      );
      return () => clearTimeout(timer);
    },
    [reduced],
  );

  return (
    <span ref={ref} className="relative inline-block">
      {children}
      <span aria-hidden className={slice}>
        {children}
      </span>
      <span aria-hidden className={slice}>
        {children}
      </span>
    </span>
  );
}
