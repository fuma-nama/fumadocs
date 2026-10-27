'use client';
import { type KeyboardEvent, useEffect, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { copy } from '../../content';
import { ditherPath } from '../../lib/dither';
import { TABS, type TabId } from './data';
import { Hazard, Led, Screw } from './parts';

/** ms the pointer rests on a switch, or lingers on it while still moving, before it counts */
const REST = 120;
const LINGER = 320;

/** a switch counts once the pointer rests or lingers on it; a sweep across the row counts none */
function createIntent(commit: (id: TabId) => void) {
  let current: TabId | null = null;
  let counted = false;
  let rest = 0;
  let linger = 0;

  function fire() {
    clearTimeout(rest);
    clearTimeout(linger);
    counted = true;
    if (current) commit(current);
  }

  return {
    move(id: TabId) {
      if (id !== current) {
        clearTimeout(linger);
        current = id;
        counted = false;
        linger = window.setTimeout(fire, LINGER);
      }
      clearTimeout(rest);
      if (!counted) rest = window.setTimeout(fire, REST);
    },
    cancel() {
      clearTimeout(rest);
      clearTimeout(linger);
      current = null;
    },
  };
}

/** a bat-handle toggle from the front, its hex nut around the pivot at (18, 24); up is on */
function Toggle({ on }: { on: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 36 48"
      className="h-12 w-9 overflow-visible fill-lp-paper stroke-lp-ink"
    >
      <path d="M28 24l-5 8.66H13L8 24l5-8.66h10z" />
      <circle cx="18" cy="24" r="6.5" strokeDasharray="1.4 1.4" />
      <g
        className="transition-[scale] duration-[120ms] ease-[steps(2,end)] [transform-origin:18px_24px] motion-reduce:transition-none"
        style={{ scale: on ? '1 1' : '1 -1' }}
      >
        <path d="M15.6 24L14 7.5a4 4 0 0 1 8 0L20.4 24z" />
        <path d="M15.6 24L14 7.5a4 4 0 0 1 4-4V24z" fill="url(#style-side)" stroke="none" />
        <ellipse cx="18" cy="7.5" rx="4" ry="1.6" />
      </g>
      <circle cx="18" cy="24" r="1.8" className="fill-lp-ink stroke-none" />
    </svg>
  );
}

interface SwitchesProps {
  value: TabId;
  onChange: (id: TabId) => void;
  /** the pointer rests on a switch, or the focus came to it: it may be flipped next */
  onIntent: (id: TabId) => void;
  className: string;
}

export function Switches({ value, onChange, onIntent, className }: SwitchesProps) {
  const intent = useMemo(() => createIntent(onIntent), [onIntent]);
  useEffect(() => intent.cancel, [intent]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = TABS.indexOf(value);
    let to = from;
    if (event.key === 'ArrowRight') to = (from + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') to = (from - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = TABS.length - 1;
    else return;
    event.preventDefault();
    onChange(TABS[to]);
    document.getElementById(`style-tab-${TABS[to]}`)?.focus();
  }

  const switches = [];
  for (const id of TABS) {
    const on = id === value;
    switches.push(
      <button
        key={id}
        type="button"
        role="tab"
        id={`style-tab-${id}`}
        aria-selected={on}
        aria-controls="style-panel"
        tabIndex={on ? 0 : -1}
        onClick={() => onChange(id)}
        onPointerMove={() => intent.move(id)}
        onPointerLeave={intent.cancel}
        onFocus={() => onIntent(id)}
        className="group/switch relative flex min-w-0 flex-1 cursor-pointer scroll-mt-[calc(var(--lp-menu-h)+16px)] flex-col items-center pt-2 pb-2.5 outline-none"
      >
        <span className="relative">
          <Toggle on={on} />
          <Led on={on} className="top-1/2 left-[calc(100%+2px)] size-2" />
        </span>
        <span
          className={cn(
            'mt-1 max-w-full truncate px-1 font-pixel text-[12px] leading-4 @min-[400px]:px-1.5 @min-[400px]:text-[13px]',
            on
              ? 'bg-lp-yellow text-[#121210]'
              : 'group-hover/switch:bg-lp-ink group-hover/switch:text-lp-paper',
            'group-focus-visible/switch:outline group-focus-visible/switch:outline-offset-2 group-focus-visible/switch:outline-lp-ink',
          )}
        >
          {copy.style.tabs[id].label}
        </span>
      </button>,
    );
  }

  return (
    // a narrow row, on a phone or beside the monitor, gets screws for stripes and smaller names
    <div className={cn('@container relative border border-lp-ink bg-lp-paper', className)}>
      <svg aria-hidden className="absolute size-0">
        <pattern id="style-side" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d={ditherPath(6)} className="fill-lp-ink" />
        </pattern>
      </svg>
      <Hazard className="inset-y-0 left-0 w-4 border-e border-lp-ink @max-[400px]:hidden" />
      <Hazard className="inset-y-0 right-0 w-4 border-s border-lp-ink @max-[400px]:hidden" />
      <Screw angle={35} className="top-2.5 left-2.5 size-2 @min-[400px]:hidden" />
      <Screw angle={-50} className="top-2.5 right-2.5 size-2 translate-x-1/2 @min-[400px]:hidden" />
      <div
        role="tablist"
        aria-label="Hands-on"
        onKeyDown={onKeyDown}
        className="flex px-3 @min-[400px]:px-7"
      >
        {switches}
      </div>
    </div>
  );
}
