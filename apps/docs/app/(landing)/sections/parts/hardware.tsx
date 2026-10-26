import type { CSSProperties, ReactNode } from 'react';
import { DITHER_MASKS } from '../../lib/bayer';
import { cn } from '@/lib/cn';

/**
 * The stack's hardware in the sheet's 1-bit language: paper and ink with a dither for anything
 * darker, hardware in the mid-grey ink so the page and the nameplates stay the strongest marks.
 * Sizes are in the stack's own px; the camera scales them with it.
 */

/** an ink dither over its box, `level` of 16 cells */
function Dither({ level, className }: { level: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 bg-lp-ink', className)}
      style={{ maskImage: DITHER_MASKS[level], maskSize: '6px 6px' }}
    />
  );
}

/** diagonal warning stripes over a box */
export function Hazard({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute bg-[repeating-linear-gradient(-45deg,var(--lp-ink-2)_0_5px,transparent_5px_11px)]',
        className,
      )}
    />
  );
}

/** a slotted screw head */
export function Screw({ angle, className }: { angle: number; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-8 -8 16 16"
      className={cn('absolute size-4 -translate-1/2 overflow-visible', className)}
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

/** a hex bolt head with its washer: what holds the core in place */
export function Bolt({ angle, className }: { angle: number; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-12 -12 24 24"
      className={cn('absolute size-6 -translate-1/2 overflow-visible', className)}
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

/** a row of domed rivets along a line, in its box */
export function Rivets({ count, className }: { count: number; className?: string }) {
  const rivets: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    rivets.push(
      <span
        key={i}
        className="relative size-2.5 overflow-hidden rounded-full border-[1.5px] border-lp-ink-2 bg-lp-paper"
      >
        <Dither level={6} className="left-1/2" />
      </span>,
    );
  }
  return (
    <span aria-hidden className={cn('flex items-center justify-between', className)}>
      {rivets}
    </span>
  );
}

/**
 * The latch on a tray's front: a slide bolt shot into a keeper. A tray marked `data-open` draws
 * the bolt back before it slides out, and shoots it once it is back in.
 */
export function Latch({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('relative block h-10 w-[104px] shrink-0', className)}>
      {/* the bolt's guide, screwed to the tray, and the keeper on the case beside it */}
      <span className="absolute inset-y-2 left-0 w-[58%] border-[1.5px] border-lp-ink-2 bg-lp-paper" />
      <span className="absolute inset-y-1.5 right-0 w-5 border-[1.5px] border-lp-ink bg-lp-paper-2" />
      <span className="absolute inset-0 transition-transform duration-[125ms] ease-[steps(2,end)] group-data-open/tray:-translate-x-[34%] motion-reduce:transition-none">
        <span className="absolute top-1/2 right-1.5 left-2 h-2.5 -translate-y-1/2 border-[1.5px] border-lp-ink bg-lp-paper-2" />
        {/* its knob, the handle a hand pulls */}
        <span className="absolute top-1/2 left-[46%] h-7 w-3.5 -translate-y-1/2 border-[1.5px] border-lp-ink bg-lp-sun" />
      </span>
    </span>
  );
}

/** a pin header's socket on the top of a tray: two rows of holes the tray above plugs into */
export function Socket({ className }: { className?: string }) {
  const holes: ReactNode[] = [];
  for (let i = 0; i < 16; i++)
    holes.push(<span key={i} className="size-2 rounded-full bg-lp-paper" />);
  return (
    <span
      aria-hidden
      className={cn(
        'absolute grid w-[136px] grid-cols-8 place-items-center gap-y-1.5 border-[1.5px] border-lp-ink bg-lp-ink-2 px-1.5 py-1.5',
        className,
      )}
    >
      {holes}
    </span>
  );
}

/** the pins under a tray that go into the socket of the one below, edge on to the camera */
export function Pins({ className, style }: { className: string; style: CSSProperties }) {
  const pins: ReactNode[] = [];
  for (let i = 0; i < 8; i++) pins.push(<span key={i} className="h-full w-[3px] bg-lp-ink-2" />);
  return (
    <span
      aria-hidden
      className={cn('absolute flex justify-between px-[9px]', className)}
      style={style}
    >
      {pins}
    </span>
  );
}
