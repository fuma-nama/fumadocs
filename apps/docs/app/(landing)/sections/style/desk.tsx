'use client';
import { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { DITHER_MASKS } from '../../lib/bayer';
import { LAYOUTS, type LayoutId } from './data';
import { Plan } from './plan';
import { ropePath } from './rope';
import {
  BOARD,
  createPose,
  hangRopes,
  HUB,
  hubPort,
  hubTransform,
  percent,
  pose,
  shadowLevel,
  shadowTransform,
  SLOTS,
  WINDOW,
  windowPort,
  windowTransform,
} from './board';
import { createDeskEngine, type DeskEngine } from './desk-engine';

export interface DeskProps {
  selected: LayoutId;
  onSelect: (id: LayoutId) => void;
  className?: string;
}

/** a port on a frame line, where a cable plugs in; `x, y` from the top left of a `w` by `h` box */
function Port({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <span
      aria-hidden
      className="absolute size-[7px] -translate-1/2 border border-lp-ink bg-lp-yellow"
      style={{ left: `${(x / w) * 100}%`, top: `${(y / h) * 100}%` }}
    />
  );
}

/** the title bar of a mini window, striped when it is the chosen one */
function Bar({ active }: { active?: boolean }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-between border-b border-lp-line-strong px-[3%]"
      style={{ height: `${(WINDOW.bar / WINDOW.h) * 100}%` }}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-[3%] inset-y-[22%] bg-[repeating-linear-gradient(to_bottom,var(--lp-line-strong)_0_1px,transparent_1px_3px)]',
          !active && 'hidden group-focus-visible/window:block',
        )}
      />
      <span className="relative aspect-square h-1/2 border border-lp-line-strong bg-lp-paper" />
      <span className="relative aspect-square h-1/2 border border-lp-line-strong bg-lp-paper" />
    </span>
  );
}

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 };

/**
 * The desk: the 6 layouts as windows, each cabled to the search trigger they all render. Held
 * under the pointer, a window is chosen; a click, a tap or the arrow keys choose at once.
 */
export const Desk = memo(function Desk({ selected, onSelect, className }: DeskProps) {
  // the server draws the first pose; from then on the engine moves everything
  const [initial] = useState(selected);
  const first = useMemo(() => {
    const at = pose(
      SLOTS.findIndex((slot) => slot.id === initial),
      -1,
      createPose(),
    );
    return { at, ropes: hangRopes(at) };
  }, [initial]);
  const index = SLOTS.findIndex((slot) => slot.id === selected);

  const engine = useRef<DeskEngine | null>(null);
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });
  const ref = useCallback(
    (board: HTMLDivElement | null) => {
      if (!board) return;
      const instance = createDeskEngine(
        board,
        SLOTS.findIndex((slot) => slot.id === initial),
        (i) => select.current(SLOTS[i].id),
      );
      engine.current = instance;
      return () => {
        instance.destroy();
        engine.current = null;
      };
    },
    [initial],
  );

  useEffect(() => {
    engine.current?.select(index);
  }, [index]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = SLOTS.findIndex((slot) => slot.id === (event.target as HTMLElement).dataset.slot);
    let next = STEPS[event.key];
    if (event.key === 'Home') next = -from;
    else if (event.key === 'End') next = SLOTS.length - 1 - from;
    if (from < 0 || next === undefined) return;
    event.preventDefault();
    const to = SLOTS[(from + next + SLOTS.length) % SLOTS.length].id;
    onSelect(to);
    event.currentTarget.querySelector<HTMLElement>(`[data-slot="${to}"]`)?.focus();
  }

  const cables = [];
  const windows = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    const active = i === index;
    const { windows: w } = first.at;
    cables.push(
      <path
        key={slot.id}
        data-cable={slot.id}
        d={ropePath(first.ropes, i)}
        strokeDasharray={active ? undefined : '4 3'}
        strokeWidth={active ? 1.5 : 1}
        vectorEffect="non-scaling-stroke"
        className="fill-none stroke-lp-ink"
      />,
    );
    const [px, py] = windowPort(slot);
    const name = LAYOUTS.find((item) => item.id === slot.id)!.name;
    const lift = w[i * 3 + 2];
    const level = shadowLevel(lift);
    windows.push(
      <button
        key={slot.id}
        type="button"
        role="radio"
        aria-checked={active}
        data-slot={slot.id}
        tabIndex={active ? 0 : -1}
        onClick={() => onSelect(slot.id)}
        className="group/window absolute origin-top-left cursor-pointer text-start outline-none"
        style={{
          ...percent(slot.x, slot.y, WINDOW.w, WINDOW.h),
          transform: windowTransform(slot, w[i * 3], w[i * 3 + 1], lift),
        }}
      >
        <span
          data-shadow
          aria-hidden
          hidden={level === 0}
          className="absolute inset-0 -z-10 bg-lp-ink-2"
          style={{
            maskImage: DITHER_MASKS[level],
            maskSize: '4px 4px',
            transform: shadowTransform(slot, lift),
          }}
        />
        <span
          className={cn(
            'flex size-full flex-col border bg-lp-paper group-focus-visible/window:outline group-focus-visible/window:outline-offset-2 group-focus-visible/window:outline-lp-ink',
            active ? 'border-lp-ink' : 'border-lp-line-strong',
          )}
        >
          <Bar active={active} />
          <span className="relative block flex-1">
            <Plan layout={slot.id} />
          </span>
        </span>
        <Port x={px} y={py} w={WINDOW.w} h={WINDOW.h} />
        <span
          data-caption
          className={cn(
            'absolute left-0 -ms-1.5 px-1.5 font-pixel text-[13px] leading-4 whitespace-nowrap',
            slot.row === 0 ? 'bottom-full mb-3 origin-[6px_100%]' : 'top-full mt-3 origin-[6px_0]',
            active && 'bg-lp-yellow text-[#121210]',
          )}
          style={{ transform: `scale(${(1 / w[i * 3 + 1]).toFixed(4)})` }}
        >
          {name}
        </span>
      </button>,
    );
  }

  const ports = [];
  for (const slot of SLOTS) {
    const [x, y] = hubPort(slot);
    ports.push(<Port key={slot.id} x={x} y={y} w={HUB.w} h={HUB.h} />);
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* the captions sit in the padding, outside the board */}
      <div role="radiogroup" aria-label="Layouts" onKeyDown={onKeyDown} className="pt-9 pb-7">
        <div
          ref={ref}
          className="relative w-full"
          style={{ aspectRatio: `${BOARD.w} / ${BOARD.h}` }}
        >
          <svg
            aria-hidden
            viewBox={`0 0 ${BOARD.w} ${BOARD.h}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {cables}
          </svg>
          <div
            data-hub
            aria-hidden
            className="absolute flex flex-col border border-lp-ink bg-lp-paper"
            style={{
              ...percent(HUB.x, HUB.y, HUB.w, HUB.h),
              transform: hubTransform(first.at.hub[0], first.at.hub[1]),
            }}
          >
            <Bar active />
            <span className="flex flex-1 items-center justify-center">
              {/* ink on the yellow is always the dark one, in both themes */}
              <svg viewBox="0 0 72 24" className="w-[78%] overflow-visible">
                <rect
                  x="0.5"
                  y="0.5"
                  width="71"
                  height="23"
                  rx="6"
                  className="fill-lp-yellow stroke-[#121210]"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx="11"
                  cy="11"
                  r="4"
                  className="fill-none stroke-[#121210]"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M14 14l3.5 3.5"
                  className="stroke-[#121210]"
                  vectorEffect="non-scaling-stroke"
                />
                <rect x="22" y="10.5" width="22" height="3" className="fill-[#121210]" />
                <rect
                  x="53"
                  y="6.5"
                  width="13"
                  height="11"
                  rx="2"
                  className="fill-none stroke-[#121210]"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
            {ports}
          </div>
          {windows}
        </div>
      </div>
      <p className="flex items-center gap-2 font-mono text-xs text-lp-ink-2">
        <span aria-hidden className="size-3 shrink-0 border border-lp-ink bg-lp-yellow" />
        layouts/shared/slots/search-trigger.tsx
      </p>
    </div>
  );
});
