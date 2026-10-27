'use client';
import { type CSSProperties, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { LEGS, MATE_H, MATE_W } from '@/components/mascot/sprite';
import { Chip } from '../../ui/chip';
import { createHero, SKY } from './engine';
import { HORIZON, REACH, SATELLITES } from './scene';

/** on phones the sky is as tall as the drawing at its width, beside the text it takes the row */
const sky = { '--fit': `calc(100cqw * ${SKY / (2 * REACH)})` } as CSSProperties;

/** the drawing's box (`REACH`, `HORIZON`, `SKY`), `--r` px a moon radius, as large as the sky fits */
const drawing = {
  '--r': `min(100cqw / ${2 * REACH}, 100cqh / ${SKY})`,
  width: `calc(var(--r) * ${2 * REACH})`,
  height: `calc(var(--r) * ${SKY})`,
} as CSSProperties;

/** her canvas, `--cell` px a cell: her seat on the moon's crown, her legs down its face */
const mate: CSSProperties = {
  width: `calc(${MATE_W} * var(--cell))`,
  left: `calc(50% - ${MATE_W / 2} * var(--cell))`,
  bottom: `calc(var(--r) * ${HORIZON + 1} - ${LEGS} * var(--cell))`,
};

/** the labels' origin, the moon's centre */
const centre: CSSProperties = { bottom: `calc(var(--r) * ${HORIZON})` };

/** the sky over the horizon: the moon with its ring and prisms, her on its crown, the labels on
 * its centre */
export function Stage() {
  const reduced = useReducedMotion() === true;
  const ref = useCallback(
    (stage: HTMLDivElement | null) => (stage ? createHero(stage, reduced) : undefined),
    [reduced],
  );

  return (
    <div
      ref={ref}
      aria-hidden
      style={sky}
      className="pointer-events-none flex items-end justify-center [container-type:size] max-lg:min-h-(--fit) [--moon-lit:var(--lp-sun)] dark:[--moon-lit:var(--lp-yellow)]"
    >
      <div style={drawing} className="relative">
        <canvas className="block size-full" />
        <canvas
          width={MATE_W}
          height={MATE_H}
          style={mate}
          className="invisible absolute [image-rendering:pixelated]"
        />
        <div style={centre} className="absolute left-1/2">
          {SATELLITES.map((s) => (
            <Chip
              key={s.layer}
              layer={s.layer}
              data-state="off"
              className="absolute top-0 left-0 data-[state=off]:invisible data-[state=pop]:bg-lp-ink data-[state=pop]:text-lp-paper"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
