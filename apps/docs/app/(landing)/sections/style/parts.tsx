import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The small hardware of the desk, drawn in its 1-bit language: hairlines that stay 1px, flat
 * paper and ink, dither for anything darker. Hardware is drawn in the mid-grey ink, so the
 * cables, the windows and the live layout stay the strongest marks. Sizes follow the desk
 * (`cqw`) with a floor, so parts stay crisp on a phone.
 *
 * These are the parts the browser draws too: the ones that change with the reader, and a few the
 * switches and the strip share with the fixed hardware drawn on the server (`hardware.tsx`).
 */

/** strokes stay 1px at any size */
export const LINE = { vectorEffect: 'non-scaling-stroke' } as const;

export interface PartProps {
  className?: string;
  style?: CSSProperties;
}

/** a slotted screw head */
export function Screw({ angle, className, style }: PartProps & { angle: number }) {
  return (
    <svg
      aria-hidden
      viewBox="-5 -5 10 10"
      className={cn('absolute size-[max(6px,1.2cqw)] -translate-1/2 overflow-visible', className)}
      style={style}
    >
      <circle r="4.4" className="fill-lp-paper stroke-lp-ink-2" style={LINE} />
      <path
        d="M-2.6 0H2.6"
        transform={`rotate(${angle})`}
        className="stroke-lp-ink-2"
        style={LINE}
      />
    </svg>
  );
}

/** a status LED, lit in the sun's orange */
export function Led({ on, blink, className, style }: PartProps & { on: boolean; blink?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute size-[max(6px,1.2cqw)] -translate-1/2 rounded-full border',
        on ? 'border-lp-ink bg-lp-sun' : 'border-lp-ink-2 bg-lp-paper',
        on && blink && 'lp-caret',
        className,
      )}
      style={style}
    />
  );
}

/** diagonal warning stripes */
export function Hazard({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute bg-[repeating-linear-gradient(-45deg,var(--lp-ink-2)_0_3px,transparent_3px_7px)]',
        className,
      )}
    />
  );
}

/**
 * A hand-stamped name: a frame, slightly off its line, a second strike beside it. On a desk
 * window, it inverts under the pointer.
 */
export function Stamp({
  children,
  tilt,
  active,
  className,
  style,
}: PartProps & { children: ReactNode; tilt: number; active?: boolean }) {
  return (
    <span
      className={cn('relative inline-block font-pixel leading-4 whitespace-nowrap', className)}
      style={{ ...style, rotate: `${tilt}deg` }}
    >
      <span
        aria-hidden
        className="absolute inset-0 translate-x-px translate-y-px border border-lp-line-strong"
      />
      <span
        className={cn(
          'relative block border border-lp-ink px-1.5',
          active
            ? 'bg-lp-yellow text-[#121210]'
            : 'bg-lp-paper group-hover/window:bg-lp-ink group-hover/window:text-lp-paper',
        )}
      >
        {children}
      </span>
    </span>
  );
}

/* the hardware screwed to the board, in its own units; the box sizes it */

/**
 * A bank of 6 DIP switches, one per layout: the patched layout's is on (up). `ON` and its arrow
 * are printed on the body like on the real part.
 */
export function DipBank({ on, className, style }: PartProps & { on: number }) {
  const slots = [];
  for (let i = 0; i < 6; i++) {
    const x = 16 + i * 16;
    slots.push(
      <g key={i}>
        <rect
          x={x + 0.5}
          y={13.5}
          width={11}
          height={21}
          className="fill-lp-paper stroke-lp-ink-2"
          style={LINE}
        />
        <rect
          x={x + 2}
          y={15}
          width={8}
          height={8}
          className={cn(
            'transition-transform duration-[120ms] ease-[steps(2,end)] motion-reduce:transition-none',
            i === on ? 'fill-lp-ink' : 'fill-lp-ink-2',
          )}
          style={{ transform: i === on ? undefined : 'translateY(10px)' }}
        />
      </g>,
    );
  }
  let legs = '';
  for (let i = 0; i < 6; i++) legs += `M${22 + i * 16} 2v5M${22 + i * 16} 41v5`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 116 48"
      className={cn('absolute overflow-visible', className)}
      style={style}
    >
      <path d={legs} className="stroke-lp-ink-2" style={LINE} />
      <rect
        x={0.5}
        y={7.5}
        width={115}
        height={33}
        className="fill-lp-paper stroke-lp-ink-2"
        style={LINE}
      />
      <path d="M6 30V17M3.5 20L6 16.5L8.5 20" className="fill-none stroke-lp-ink-2" style={LINE} />
      {slots}
    </svg>
  );
}

/**
 * A relay: a coil, and an armature that clicks over to its other contact each time a layout is
 * swapped in.
 */
export function Relay({ flip, className, style }: PartProps & { flip: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 48"
      className={cn('absolute overflow-visible', className)}
      style={style}
    >
      <rect
        x={0.5}
        y={0.5}
        width={63}
        height={47}
        strokeDasharray="3 2"
        className="fill-lp-paper stroke-lp-ink-2"
        style={LINE}
      />
      <rect
        x={8.5}
        y={14.5}
        width={16}
        height={26}
        className="fill-lp-paper stroke-lp-ink-2"
        style={LINE}
      />
      <path
        d="M8.5 18.5h16M8.5 21.5h16M8.5 24.5h16M8.5 27.5h16M8.5 30.5h16M8.5 33.5h16M8.5 36.5h16"
        className="stroke-lp-ink-2"
        style={LINE}
      />
      <path d="M16.5 14.5V8.5h30" className="fill-none stroke-lp-ink-2" style={LINE} />
      <circle cx={46.5} cy={8.5} r={1.8} className="fill-lp-ink-2" />
      <g
        className="transition-transform duration-[120ms] ease-[steps(2,end)] [transform-origin:46.5px_8.5px] motion-reduce:transition-none"
        style={{ transform: flip ? 'rotate(-14deg)' : 'rotate(14deg)' }}
      >
        <path d="M46.5 8.5V34" strokeWidth={2} className="stroke-lp-ink-2" style={LINE} />
      </g>
      <path d="M36 36.5h5M52 36.5h5" strokeWidth={2} className="stroke-lp-ink-2" style={LINE} />
      <path d="M38.5 36.5v8M54.5 36.5v8" className="stroke-lp-ink-2" style={LINE} />
    </svg>
  );
}
