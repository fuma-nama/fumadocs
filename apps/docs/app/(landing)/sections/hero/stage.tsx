'use client';
import { useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { Chip } from '../../ui/chip';
import { MATE_H, MATE_PAD, MATE_W, SEAT_CELL } from '../../ui/mascot';
import { createHero, SATELLITES } from './engine';

/** her canvas's cells below her seat, which rests on the moon's rim */
const LEGS = MATE_H - MATE_PAD[1] - SEAT_CELL[1] - 1;

/** the sky over the horizon: the moon with its ring and prisms (3.2 x 2.2 moon radii round its
 * centre), her sitting on its crown (2px cells where the sky has room), the labels on its centre */
export function Stage() {
  const reduced = useReducedMotion() === true;
  const ref = useCallback(
    (stage: HTMLDivElement | null) => (stage ? createHero(stage, reduced) : undefined),
    [reduced],
  );

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 bottom-(--h) overflow-clip">
        <div className="absolute bottom-[calc(var(--d)*-0.05-var(--cut))] left-[calc(var(--cx)-var(--d)*0.8)] z-3 h-[calc(var(--d)*1.1)] w-[calc(var(--d)*1.6)]">
          <canvas className="block size-full" />
          <canvas
            data-mate
            width={MATE_W}
            height={MATE_H}
            style={{
              width: `calc(${MATE_W} * var(--cell))`,
              bottom: `calc(50% + var(--d) / 2 - ${LEGS} * var(--cell))`,
            }}
            className="invisible absolute left-1/2 -translate-x-1/2 [--cell:1px] [image-rendering:pixelated] [@media(min-width:1024px)_and_(min-height:650px)]:[--cell:2px]"
          />
        </div>
        <div className="absolute bottom-[calc(var(--d)/2-var(--cut))] left-(--cx) z-5">
          {SATELLITES.map((s) => (
            <div key={s.layer} className="invisible absolute top-0 left-0">
              <Chip layer={s.layer} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
