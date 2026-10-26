'use client';
import { type KeyboardEvent, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';
import { ditherPath } from '../../lib/bayer';
import { createIntent } from './intent';
import { Hazard, Led, Screw } from './parts';

export interface SwitchItem {
  id: string;
  label: string;
}

interface SwitchesProps {
  items: SwitchItem[];
  value: string;
  onChange: (id: string) => void;
  /** the pointer rests on a switch, or the focus came to it: it may be flipped next */
  onIntent?: (id: string) => void;
  /** ids of the tabs and their panel */
  idPrefix: string;
  className?: string;
}

/** the hex nut of a toggle, flat on top, around its pivot at (18, 24) */
const NUT = 'M28 24l-5 8.66H13L8 24l5-8.66h10z';
/** the bat handle pointing up from the pivot with its rounded tip, and its shaded side */
const BAT = 'M15.6 24L14 7.5a4 4 0 0 1 8 0L20.4 24z';
const SIDE = 'M15.6 24L14 7.5a4 4 0 0 1 4-4V24z';

/** a bat-handle toggle from the front: up is on; `side` names the dither of the bat's side */
function Toggle({ on, side }: { on: boolean; side: string }) {
  return (
    <svg aria-hidden viewBox="0 0 36 48" className="h-12 w-9 overflow-visible">
      <path d={NUT} className="fill-lp-paper stroke-lp-ink" />
      <circle
        cx="18"
        cy="24"
        r="6.5"
        strokeDasharray="1.4 1.4"
        className="fill-lp-paper stroke-lp-ink"
      />
      <g
        className="transition-[scale] duration-[120ms] ease-[steps(2,end)] [transform-origin:18px_24px] motion-reduce:transition-none"
        style={{ scale: on ? '1 1' : '1 -1' }}
      >
        <path d={BAT} className="fill-lp-paper stroke-lp-ink" />
        <path d={SIDE} fill={`url(#${side})`} />
        <ellipse cx="18" cy="7.5" rx="4" ry="1.6" className="fill-lp-paper stroke-lp-ink" />
      </g>
      <circle cx="18" cy="24" r="1.8" className="fill-lp-ink" />
    </svg>
  );
}

/**
 * The tabs as a row of toggle switches on the desk, one up at a time: flipping one drops the one
 * that was up. Each has its pilot lamp and its name.
 */
export function Switches({ items, value, onChange, onIntent, idPrefix, className }: SwitchesProps) {
  const intended = useRef(onIntent);
  useEffect(() => {
    intended.current = onIntent;
  });
  // a sweep across the row counts none of them
  const intent = useMemo(() => createIntent<string>((id) => intended.current?.(id)), []);
  useEffect(() => intent.cancel, [intent]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = items.findIndex((item) => item.id === value);
    let to = from;
    if (event.key === 'ArrowRight') to = (from + 1) % items.length;
    else if (event.key === 'ArrowLeft') to = (from - 1 + items.length) % items.length;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[to].id);
    document.getElementById(`${idPrefix}-tab-${items[to].id}`)?.focus();
  }

  const switches = [];
  for (const item of items) {
    const on = item.id === value;
    switches.push(
      <button
        key={item.id}
        type="button"
        role="tab"
        id={`${idPrefix}-tab-${item.id}`}
        aria-selected={on}
        aria-controls={`${idPrefix}-panel`}
        tabIndex={on ? 0 : -1}
        onClick={() => onChange(item.id)}
        onPointerMove={() => intent.move(item.id)}
        onPointerLeave={intent.cancel}
        onFocus={() => onIntent?.(item.id)}
        className="group/switch relative flex min-w-0 flex-1 cursor-pointer scroll-mt-[calc(var(--lp-menu-h)+16px)] flex-col items-center pt-2 pb-2.5 outline-none"
      >
        <span className="relative">
          <Toggle on={on} side={`${idPrefix}-side`} />
          <Led on={on} className="top-1/2 left-[calc(100%+2px)] size-2" />
        </span>
        <span
          className={cn(
            'mt-1 max-w-full truncate px-1 font-pixel text-[12px] leading-4 sm:px-1.5 sm:text-[13px]',
            on
              ? 'bg-lp-yellow text-[#121210]'
              : 'group-hover/switch:bg-lp-ink group-hover/switch:text-lp-paper',
            'group-focus-visible/switch:outline group-focus-visible/switch:outline-offset-2 group-focus-visible/switch:outline-lp-ink',
          )}
        >
          {item.label}
        </span>
      </button>,
    );
  }

  return (
    <div className={cn('relative border border-lp-ink bg-lp-paper px-3 sm:px-7', className)}>
      <svg aria-hidden className="absolute size-0">
        <pattern id={`${idPrefix}-side`} width="4" height="4" patternUnits="userSpaceOnUse">
          <path d={ditherPath(6)} className="fill-lp-ink" />
        </pattern>
      </svg>
      <Hazard className="inset-y-0 left-0 w-4 border-e border-lp-ink max-sm:hidden" />
      <Hazard className="inset-y-0 right-0 w-4 border-s border-lp-ink max-sm:hidden" />
      <Screw angle={35} className="top-2.5 left-2.5 size-2 sm:hidden" />
      <Screw angle={-50} className="top-2.5 right-2.5 size-2 translate-x-1/2 sm:hidden" />
      <div role="tablist" aria-label="Hands-on" onKeyDown={onKeyDown} className="flex">
        {switches}
      </div>
    </div>
  );
}
