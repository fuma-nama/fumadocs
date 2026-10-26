'use client';
import { useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { BEAT_AT, bootStart, untilBeat } from './boot';

const slice = 'invisible absolute inset-y-0 -inset-x-[0.12em] bg-lp-paper px-[0.12em]';

// three frames of horizontal slices: [top %, bottom %, shift em, inverted]
const FRAMES: [number, number, number, boolean][][] = [
  [
    [14, 58, 0.07, false],
    [62, 20, -0.05, false],
  ],
  [
    [46, 38, -0.1, true],
    [20, 70, 0.04, false],
  ],
  [
    [70, 10, 0.08, false],
    [0, 100, 0, false],
  ],
];

function keyframes(layer: number): Keyframe[] {
  const out: Keyframe[] = [];
  for (const frame of FRAMES) {
    const [top, bottom, shift, inverted] = frame[layer];
    out.push({
      visibility: 'visible',
      clipPath: `inset(${top}% 0 ${bottom}% 0)`,
      transform: `translateX(${shift}em)`,
      backgroundColor: inverted ? 'var(--lp-ink)' : 'var(--lp-paper)',
      color: inverted ? 'var(--lp-paper)' : 'var(--lp-ink)',
      easing: 'step-end',
    });
  }
  out.push({ visibility: 'hidden' });
  return out;
}

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
        for (let i = 0; i < layers.length; i++) layers[i].animate(keyframes(i), { duration: 150 });
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
