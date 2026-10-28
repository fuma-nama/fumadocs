'use client';
import { type CSSProperties, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { LEGS, MATE_H, MATE_W } from '@/components/mascot/sprite';
import { Chip } from '../../ui/chip';
import { createHero, SKY } from './engine';
import { CROWN, HORIZON, REACH, SATELLITES } from './scene';

/** on phones the sky is as tall as the drawing at its width, beside the text it takes the row */
const sky = { '--fit': `calc(100cqw * ${SKY / (2 * REACH)})` } as CSSProperties;

/** `--feet` px from the horizon up to her feet, from `--r` px a moon radius and `--cell` px a cell
 * of hers, both measured by the engine */
const scene = { '--feet': `calc(var(--r) * ${CROWN} - ${LEGS} * var(--cell))` } as CSSProperties;

/** the drawing's box, `REACH` either side of the moon's centre and `SKY` high */
const drawing: CSSProperties = {
  width: `calc(var(--r) * ${2 * REACH})`,
  height: `calc(var(--r) * ${SKY})`,
};

/** her canvas: her seat on the moon's crown, her legs down its face */
const mate: CSSProperties = {
  width: `calc(${MATE_W} * var(--cell))`,
  left: `calc(50% - ${MATE_W / 2} * var(--cell))`,
  bottom: 'var(--feet)',
};

/** the labels' origin, the moon's centre */
const centre: CSSProperties = { bottom: `calc(var(--r) * ${HORIZON})` };

/** the sky over the horizon, its canvas the stars and the moon with its ring and prisms; the
 * drawing's box holds her on the moon's crown and the labels on its centre. The scene sets as one
 * behind the horizon, the sky's bottom edge */
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
      className="pointer-events-none relative overflow-clip max-lg:min-h-(--fit)"
    >
      <div style={scene} className="absolute inset-0 flex items-end justify-center">
        <canvas className="absolute inset-0 size-full" />
        <div style={drawing} className="relative">
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
                className="absolute top-0 left-0 will-change-[translate] data-[state=off]:invisible data-[state=pop]:bg-lp-ink data-[state=pop]:text-lp-paper"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
