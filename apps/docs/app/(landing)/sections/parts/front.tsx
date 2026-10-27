import type { ReactNode } from 'react';
import type { Layer } from '../../ui/chip';
import { Roller } from '../../ui/text';
import { cn } from '@/lib/cn';
import { NAMES, OPTIONS, SWAPS } from './data';

/** the most options a layer has: every front keeps room for that many dots, so nameplates line up */
let most = 0;
for (const layer of SWAPS) most = Math.max(most, OPTIONS[layer].length);

interface FrontProps {
  layer: Layer;
  title: string;
  /** the option in use, and how many the layer has: none for the core */
  option: number;
  count: number;
  /** the panel shows this layer's options */
  active: boolean;
}

/**
 * A layer's front, a button the engine sizes to its face on screen and lays on it: the module on a
 * nameplate that rolls when it changes and lights up for the layer the panel shows, and a dot per
 * option with the one in use lit, or the core's bolts. Its parts are sized by its height, so it
 * reads the same at any size. Pointers press the layer through the stack (`engine.ts`), keys here.
 */
export function Front({ layer, title, option, count, active }: FrontProps) {
  const dots: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    dots.push(
      <span
        key={i}
        className={cn(
          'size-[16cqh] shrink-0 rounded-full border-[1.5px]',
          i === option ? 'border-lp-ink bg-lp-sun' : 'border-lp-ink-2',
        )}
      />,
    );
  }

  return (
    <button
      type="button"
      data-front={layer}
      data-active={active || undefined}
      aria-label={`${NAMES[layer]}: ${title}, ${count > 0 ? 'press to switch' : 'fixed'}`}
      className="parts-face parts-front group/front bg-lp-paper text-lp-ink focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-lp-orange"
    >
      {/* container units size what's inside the front, not the front itself */}
      <span className="relative flex size-full items-center gap-[20cqh] px-[30cqh]">
        <Screw angle={35} className="left-[14cqh]" />
        <Screw angle={-50} className="right-[14cqh] translate-x-1/2" />
        <span className="relative flex h-[64cqh] min-w-0 flex-1">
          {/* the stamp's second strike, a hair off its line */}
          <span className="absolute inset-0 translate-[4cqh] border-[1.5px] border-lp-ink-2" />
          <span className="relative flex min-w-0 flex-1 items-center overflow-hidden border-[1.5px] border-lp-ink bg-lp-paper-2 px-[22cqh] text-[40cqh] leading-none font-medium group-data-active/front:bg-lp-yellow group-data-active/front:text-[#121210]">
            <Roller value={title} />
          </span>
        </span>
        <span
          className="relative flex h-full shrink-0 items-center justify-end gap-[10cqh]"
          style={{ width: `${most * 26}cqh` }}
        >
          {count > 0 ? (
            dots
          ) : (
            // bolted in, never swapped
            <>
              <span className="absolute inset-x-0 inset-y-[14cqh] border-[1.5px] border-lp-ink-2 bg-[repeating-linear-gradient(-45deg,var(--lp-ink-2)_0_5px,transparent_5px_11px)]" />
              <Bolt angle={15} className="left-1/4" />
              <Bolt angle={-20} className="left-3/4" />
            </>
          )}
        </span>
      </span>
    </button>
  );
}

/** a slotted screw head */
function Screw({ angle, className }: { angle: number; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-8 -8 16 16"
      className={cn('absolute top-1/2 size-[18cqh] -translate-1/2 overflow-visible', className)}
    >
      <circle r="6.5" strokeWidth={1.5} className="fill-lp-paper stroke-lp-ink-2" />
      <path
        d="M-4 0H4"
        strokeWidth={1.5}
        transform={`rotate(${angle})`}
        className="stroke-lp-ink-2"
      />
    </svg>
  );
}

/** a hex bolt head with its washer */
function Bolt({ angle, className }: { angle: number; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-12 -12 24 24"
      className={cn('absolute top-1/2 size-[34cqh] -translate-1/2 overflow-visible', className)}
    >
      <circle r="10.5" strokeWidth={1.5} className="fill-lp-paper stroke-lp-ink-2" />
      <path
        d="M7 0L3.5 6.06H-3.5L-7 0L-3.5-6.06H3.5Z"
        strokeWidth={1.5}
        transform={`rotate(${angle})`}
        className="fill-lp-paper-2 stroke-lp-ink-2"
      />
      <circle r="2" className="fill-lp-ink-2" />
    </svg>
  );
}
