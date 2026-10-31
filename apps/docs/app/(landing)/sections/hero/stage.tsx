'use client';
import { type CSSProperties, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { LEGS, MATE_H, MATE_W } from '@/components/mascot/sprite';
import { DITHER_MASKS } from '../../lib/dither';
import { Chip } from '../../ui/chip';
import { NAMES } from '../parts/data';
import { createHero, SKY } from './engine';
import { CROWN, REACH, SATELLITES } from './scene';

/** on phones the sky is as tall as the drawing at its width, with room over her for her bubble
 * (`--room`, as much taller at 3x as its lines are); beside the text it takes the row */
const sky = { '--fit': `calc(100cqw * ${SKY / (2 * REACH)} + var(--room))` } as CSSProperties;

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

/** her bubble's tail, from its root on the bubble's foot to the dot, and its shadow, bubble and
 * tail as one shape; `createTalk` sets the root and the tip, the drop is 9px */
const tail = { clipPath: 'polygon(var(--tail-a) 0, var(--tail-b) 0, var(--tail-tip) 100%)' };
const shadow: CSSProperties = {
  clipPath:
    'polygon(0 0, 100% 0, 100% calc(100% - 9px), var(--tail-b) calc(100% - 9px), var(--tail-tip) 100%, var(--tail-a) calc(100% - 9px), 0 calc(100% - 9px))',
  maskImage: DITHER_MASKS[6],
  maskSize: '4px 4px',
};

/** what she says, laid over her head by `createTalk`: shaped as the CLI's bubble is, paper type on
 * the page's ink over a dithered shadow, its two lines sized in full as they type in. Its own box
 * takes in the shadow and the tail, so its dissolve's mask covers them. The pixel type is on its
 * grid, a unit (0.038em) a device px at 2x and two at 3x, in sizes Chromium keeps: it cuts them to
 * hundredths */
function Bubble() {
  return (
    <div
      data-bubble
      data-state="off"
      className="pointer-events-auto absolute top-0 left-0 isolate w-max pr-0.75 pb-3.25 font-pixel select-text text-[13.16px] leading-4 font-normal antialiased data-[state=off]:invisible [@media(min-resolution:3dppx)]:text-[17.54px] [@media(min-resolution:3dppx)]:leading-5.5"
    >
      <span
        style={shadow}
        className="absolute top-0 right-0.75 bottom-1 left-0 translate-x-0.75 translate-y-1 bg-lp-ink-2"
      />
      <span className="relative grid justify-items-start bg-lp-ink px-2.5 py-2 whitespace-pre text-lp-paper contain-layout contain-paint *:col-start-1 *:row-start-1">
        <span data-sizer className="invisible" />
        <span data-said />
      </span>
      {/* from a pixel into the box, so the two fills meet without a seam */}
      <span style={tail} className="absolute inset-x-0 bottom-1 h-2.5 bg-lp-ink" />
    </div>
  );
}

/** the sky over the horizon, its canvas the stars and the moon with its ring and prisms; the
 * drawing's box holds her on the moon's crown, her bubble over her and the labels on the moon's
 * centre. The scene sets as one behind the horizon, the sky's bottom edge. The pointer passes
 * through the sky to the hero, all but its text, which reads and selects as any */
export function Stage() {
  const reduced = useReducedMotion() === true;
  const ref = useCallback(
    (stage: HTMLDivElement | null) => (stage ? createHero(stage, reduced) : undefined),
    [reduced],
  );

  return (
    <div
      ref={ref}
      style={sky}
      className="pointer-events-none relative overflow-clip [--room:5rem] max-lg:min-h-(--fit) [@media(min-resolution:3dppx)]:[--room:5.75rem]"
    >
      <div style={scene} className="absolute inset-0 flex items-end justify-center">
        <canvas aria-hidden className="absolute inset-0 size-full" />
        <div style={drawing} className="relative">
          <canvas
            aria-hidden
            width={MATE_W}
            height={MATE_H}
            style={mate}
            className="invisible absolute [image-rendering:pixelated]"
          />
          <Bubble />
        </div>
        {SATELLITES.map((s) => (
          <Chip
            key={s.layer}
            layer={s.layer}
            data-satellite
            data-state="off"
            className="pointer-events-auto absolute top-0 left-0 select-text data-[state=off]:invisible data-[state=pop]:bg-lp-ink data-[state=pop]:text-lp-paper"
          >
            {NAMES[s.layer]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
