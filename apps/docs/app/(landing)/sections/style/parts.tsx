import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** an SVG part: paper in the mid-grey ink, its hairlines 1px at any size */
export const PART =
  'absolute overflow-visible fill-lp-paper stroke-lp-ink-2 **:[vector-effect:non-scaling-stroke]';

export interface PartProps {
  className?: string;
  style?: CSSProperties;
}

export function Screw({ angle, className }: { angle: number; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-5 -5 10 10"
      className={cn(PART, 'size-[max(6px,1.2cqw)] -translate-1/2', className)}
    >
      <circle r="4.4" />
      <path d="M-2.6 0H2.6" transform={`rotate(${angle})`} />
    </svg>
  );
}

export function Led({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute size-[max(6px,1.2cqw)] -translate-1/2 rounded-full border',
        on ? 'border-lp-ink bg-lp-sun' : 'border-lp-ink-2 bg-lp-paper',
        className,
      )}
    />
  );
}

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

interface StampProps {
  children: ReactNode;
  tilt: number;
  active?: boolean;
  className?: string;
}

/** a hand-stamped name, off its line, a second strike beside it; it inverts under the pointer */
export function Stamp({ children, tilt, active, className }: StampProps) {
  return (
    <span
      className={cn(
        'relative inline-block text-xs leading-4 font-medium whitespace-nowrap',
        className,
      )}
      style={{ rotate: `${tilt}deg` }}
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
