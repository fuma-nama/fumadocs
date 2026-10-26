'use client';
import { type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { DITHER_MASKS } from '../../lib/bayer';
import { LAYOUTS, type LayoutId } from './data';
import { Plan } from './plan';
import { ropePath } from './rope';
import {
  BOARD,
  createPose,
  hangRopes,
  type Hung,
  HUB,
  hubTransform,
  percent,
  PLUG,
  plugTransform,
  pose,
  shadowInset,
  shadowLevel,
  shadowTransform,
  SLOTS,
  WINDOW,
  windowTransform,
} from './board';
import { createDeskEngine, type DeskEngine } from './desk-engine';
import type { Hardware } from './hardware';
import { DipBank, Led, Relay, Stamp } from './parts';

interface DeskProps {
  selected: LayoutId;
  /** the layouts feed the monitor; off, every cable hangs slack and the windows wait for a click */
  live: boolean;
  /** the monitor is loading the next layout */
  busy: boolean;
  /** the cables of the first pose hanging still, settled on the server */
  hung: Hung;
  onSelect: (id: LayoutId) => void;
  /** the fixed hardware, drawn on the server */
  hardware: Hardware;
  className?: string;
}

/** the title bar of a mini window, striped when it is the chosen one; its lamp lights then */
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
      <span
        className={cn(
          'relative aspect-square h-[55%] rounded-full border',
          active ? 'border-lp-ink bg-lp-sun' : 'border-lp-line-strong bg-lp-paper',
        )}
      />
    </span>
  );
}

/** a plug from its jack (0, 0) out to its tail: the sleeve, then a boot tapering to the cable */
const PLUG_BODY = `M4 -5.5H${PLUG - 8}L${PLUG} -2V2L${PLUG - 8} 5.5H4z`;
/** the ribs of the boot, the cable's strain relief */
const PLUG_RIBS = `M${PLUG - 6} -4.6v9.2M${PLUG - 3.5} -3.7v7.4`;

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 };
/** stamps sit a little off their line, each its own way */
const TILTS = [-1.5, 1, -0.5, 1.5, -1, 0.5];

/**
 * The desk: the 6 layouts as windows bolted to scrap plates, each cabled from its search trigger
 * to the junction box they all share. A click, a tap or the arrow keys choose one.
 */
export const Desk = memo(function Desk({
  selected,
  live,
  busy,
  hung,
  onSelect,
  hardware,
  className,
}: DeskProps) {
  // the server draws the first pose; from then on the engine moves everything
  const [first] = useState(() => {
    const index = SLOTS.findIndex((slot) => slot.id === selected);
    const at = pose(index, createPose());
    return { index, at, hung, ropes: hangRopes(at, hung) };
  });
  const index = SLOTS.findIndex((slot) => slot.id === selected);
  // the relay clicks over each time a layout is patched in
  const [relay, setRelay] = useState({ selected, flip: false });
  if (relay.selected !== selected) setRelay({ selected, flip: !relay.flip });

  const engine = useRef<DeskEngine | null>(null);
  const ref = useCallback(
    (board: HTMLDivElement | null) => {
      if (!board) return;
      const instance = createDeskEngine(board, first.index, first.hung);
      engine.current = instance;
      return () => {
        instance.destroy();
        engine.current = null;
      };
    },
    [first],
  );

  useEffect(() => {
    engine.current?.select(live ? index : -1);
  }, [index, live]);

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

  const { windows: w } = first.at;
  const cables = [];
  const ties = [];
  const plugs = [];
  const windows = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    const active = i === index;
    const on = active && live;
    const d = ropePath(first.ropes, i);
    // the patched cable is a coax, its core showing down the middle; the others hang slack
    cables.push(
      <g key={slot.id}>
        <path
          data-cable={slot.id}
          d={d}
          strokeDasharray={on ? undefined : '4 3'}
          strokeWidth={on ? 3.5 : 1}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-lp-ink"
        />
        <path
          data-cable={slot.id}
          d={d}
          visibility={on ? undefined : 'hidden'}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-lp-paper"
        />
      </g>,
    );
    ties.push(
      <g key={slot.id} data-tie={slot.id}>
        <rect x={-2.5} y={-6} width={5} height={12} className="fill-lp-paper stroke-lp-ink" />
        <path d="M2.5 -3h6" className="stroke-lp-ink" />
      </g>,
    );
    for (const end of [0, 1] as const) {
      plugs.push(
        <g
          key={`${slot.id}-${end}`}
          data-plug={slot.id}
          transform={plugTransform(i, first.ropes.ends, end)}
        >
          <path d={PLUG_BODY} className="fill-lp-ink" />
          <path d={PLUG_RIBS} className="stroke-lp-paper" />
          <rect x={1.5} y={-7.5} width={4.5} height={15} className="fill-lp-paper stroke-lp-ink" />
        </g>,
      );
    }
    const item = LAYOUTS.find((entry) => entry.id === slot.id)!;
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
        className="group/window absolute isolate origin-top-left cursor-pointer text-start outline-none"
        style={{
          ...percent(slot.x, slot.y, WINDOW.w, WINDOW.h),
          transform: windowTransform(slot, w[i * 3], w[i * 3 + 1], lift),
        }}
      >
        <span
          data-shadow
          aria-hidden
          hidden={level === 0}
          className="absolute -z-20 bg-lp-ink-2"
          style={{
            inset: shadowInset(slot),
            maskImage: DITHER_MASKS[level],
            maskSize: '4px 4px',
            transform: shadowTransform(slot, lift),
          }}
        />
        {hardware.plates[slot.id]}
        <span
          className={cn(
            'flex size-full flex-col border bg-lp-paper group-focus-visible/window:outline group-focus-visible/window:outline-offset-[calc(var(--plate)+2px)] group-focus-visible/window:outline-lp-ink',
            on ? 'border-lp-ink' : 'border-lp-line-strong',
          )}
        >
          <Bar active={on} />
          <span className="relative block flex-1">
            <Plan layout={slot.id} />
          </span>
        </span>
        <span
          data-caption
          className={cn(
            'absolute left-0 -ms-1 text-[13px]',
            slot.row === 0
              ? 'bottom-[calc(100%+var(--plate)+8px)] origin-[6px_100%]'
              : 'top-[calc(100%+var(--plate)+8px)] origin-[6px_0]',
          )}
          style={{ transform: `scale(${(1 / w[i * 3 + 1]).toFixed(4)})` }}
        >
          <Stamp tilt={TILTS[i]} active={on}>
            {item.name}
          </Stamp>
        </span>
      </button>,
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Layouts"
      onKeyDown={onKeyDown}
      className={cn('@container py-11 [--plate:max(6px,1.4cqw)] sm:py-14 lg:py-11', className)}
    >
      {/* the plates stand out of the board by `--plate`, more on a chosen window grown from its edge,
          and never thinner than a stamp stands out of its window; the stamps above and below take the
          room around it, more on a wide desk's thicker plates */}
      <div className="px-[calc(var(--plate)*1.1)]">
        <div
          ref={ref}
          className="@container relative w-full"
          style={{ aspectRatio: `${BOARD.w} / ${BOARD.h}` }}
        >
          {hardware.bench}
          <DipBank
            on={live ? index : -1}
            className="pointer-events-none"
            style={percent(10, 344, 120, 50)}
          />
          <Relay
            flip={relay.flip}
            className="pointer-events-none"
            style={percent(140, 346, 56, 42)}
          />
          <div
            data-hub
            aria-hidden
            className="absolute"
            style={{
              ...percent(HUB.x, HUB.y, HUB.w, HUB.h),
              transform: hubTransform(first.at.hub[0], first.at.hub[1]),
            }}
          >
            <span
              className="absolute inset-0 bg-lp-ink-2"
              style={{ maskImage: DITHER_MASKS[4], maskSize: '4px 4px', translate: '5px 7px' }}
            />
            <span className="absolute inset-0 border border-lp-ink bg-lp-paper" />
            {hardware.junction}
            <Led on blink={busy} className="top-[31%] left-[50%]" />
          </div>
          {/* the cables run over the desk and behind the windows, their plugs over both */}
          <svg
            aria-hidden
            viewBox={`0 0 ${BOARD.w} ${BOARD.h}`}
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {cables}
            {ties}
          </svg>
          {windows}
          <svg
            aria-hidden
            viewBox={`0 0 ${BOARD.w} ${BOARD.h}`}
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {plugs}
          </svg>
        </div>
      </div>
    </div>
  );
});
