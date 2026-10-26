'use client';
import { type ReactNode, type Ref, useState } from 'react';
import { cn } from '@/lib/cn';
import { Screw } from './parts';

/** the gauge's sweep: from slack to taut */
const SWEEP = 100;

/** the needle at a tension from 0 (slack) to 1 (taut) */
export function needleTransform(tension: number): string {
  return `rotate(${(-SWEEP / 2 + tension * SWEEP).toFixed(2)} 30 30)`;
}

function Gauge({ needle, tension }: { needle: Ref<SVGGElement>; tension: number }) {
  let ticks = '';
  for (let i = 0; i <= 10; i++) {
    const a = ((-SWEEP / 2 + (i * SWEEP) / 10 - 90) * Math.PI) / 180;
    const r1 = i % 5 === 0 ? 19 : 21;
    ticks += `M${(30 + Math.cos(a) * r1).toFixed(2)} ${(30 + Math.sin(a) * r1).toFixed(2)}L${(30 + Math.cos(a) * 24).toFixed(2)} ${(30 + Math.sin(a) * 24).toFixed(2)}`;
  }
  const end = ((SWEEP / 2 - 90) * Math.PI) / 180;
  const mark = ((SWEEP / 2 - 20 - 90) * Math.PI) / 180;
  return (
    <svg aria-hidden viewBox="0 0 60 36" className="h-9 w-[60px] shrink-0 overflow-visible">
      <path
        d="M2.5 35.5V10.5a8 8 0 0 1 8-8h39a8 8 0 0 1 8 8v25z"
        className="fill-lp-paper stroke-lp-ink"
      />
      <path d={ticks} className="stroke-lp-ink" />
      <path
        d={`M${(30 + Math.cos(mark) * 24).toFixed(2)} ${(30 + Math.sin(mark) * 24).toFixed(2)}A24 24 0 0 1 ${(30 + Math.cos(end) * 24).toFixed(2)} ${(30 + Math.sin(end) * 24).toFixed(2)}`}
        strokeWidth={3}
        className="fill-none stroke-lp-sun"
      />
      <g ref={needle} transform={needleTransform(tension)}>
        <path d="M30 30L30 9" strokeWidth={1.5} className="stroke-lp-ink" />
      </g>
      <circle cx="30" cy="30" r="3" className="fill-lp-ink" />
    </svg>
  );
}

/** the old top half folds down to its axle, in the plane, and is gone */
function fall(element: HTMLElement | null) {
  if (!element) return;
  const animation = element.animate([{ scale: '1 1' }, { scale: '1 0' }], {
    duration: 120,
    easing: 'steps(3, end)',
    fill: 'forwards',
  });
  return () => animation.cancel();
}

/** a split-flap digit: on a new value the old one's top half falls toward the axle */
function Flap({ digit }: { digit: string }) {
  const [shown, setShown] = useState({ digit, prev: digit, n: 0 });
  if (shown.digit !== digit) setShown({ digit, prev: shown.digit, n: shown.n + 1 });

  return (
    <span className="relative grid h-[18px] w-[13px] place-items-center overflow-hidden bg-lp-ink font-pixel text-[15px] leading-none text-lp-sun tabular-nums dark:bg-lp-paper-2">
      {digit}
      {shown.n > 0 && (
        <span
          key={shown.n}
          ref={fall}
          aria-hidden
          className="absolute inset-0 grid origin-center place-items-center bg-inherit [clip-path:inset(0_0_50%_0)] motion-reduce:hidden"
        >
          {shown.prev}
        </span>
      )}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-lp-paper dark:bg-lp-ink-2" />
    </span>
  );
}

/**
 * The strip under the desk: a stripboard of parts between a gauge, how taut the chosen cable
 * runs, and a flap counter of the layouts swapped in.
 */
export function Strip({
  needle,
  tension,
  swaps,
  stripboard,
  className,
}: {
  /** the gauge's needle, turned by the desk as its cable moves */
  needle: Ref<SVGGElement>;
  /** its first reading */
  tension: number;
  swaps: number;
  /** the parts between them, drawn on the server */
  stripboard: ReactNode;
  className?: string;
}) {
  const digits = String(Math.min(999, swaps)).padStart(3, '0');
  const flaps = [];
  for (let i = 0; i < digits.length; i++) flaps.push(<Flap key={i} digit={digits[i]} />);

  return (
    <div
      className={cn(
        '@container relative flex items-center justify-between gap-3 border border-lp-line-strong bg-lp-paper px-5 py-2',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        <Gauge needle={needle} tension={tension} />
        <span className="font-mono text-[11px] leading-none text-lp-ink-2">tension</span>
      </div>
      {stripboard}
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-[11px] leading-none text-lp-ink-2">swaps</span>
        <span role="img" aria-label={`${swaps} swaps`} className="flex gap-px">
          {flaps}
        </span>
      </div>
      <Screw angle={40} className="top-1/2 left-2.5 size-2" />
      <Screw angle={-20} className="top-1/2 right-2.5 size-2 translate-x-1/2" />
    </div>
  );
}
