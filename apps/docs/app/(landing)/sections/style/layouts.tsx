'use client';
import { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';
import { BOARD, HUB, hubPort, percent, restRopes, SLOTS, WINDOW, windowPort } from './board';
import { LAYOUTS, type LayoutId } from './data';
import { createDeskEngine, type DeskEngine } from './desk-engine';
import { Plan } from './plan';
import { ropePath } from './rope';

export interface DeskProps {
  pinned: LayoutId;
  onPreview: (id: LayoutId | null) => void;
  onPin: (id: LayoutId) => void;
}

interface PortProps {
  /** the port in board units, and the box it sits on */
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** a port on a frame line, where a cable plugs in */
function Port({ x, y, left, top, width, height }: PortProps) {
  return (
    <span
      aria-hidden
      className="absolute size-[7px] -translate-1/2 border border-lp-ink bg-lp-yellow"
      style={{ left: `${((x - left) / width) * 100}%`, top: `${((y - top) / height) * 100}%` }}
    />
  );
}

/** the title bar of a mini window: plain, or striped when it is the active one */
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
          !active &&
            'hidden group-hover/window:block group-focus-visible/window:block group-data-active/window:block',
        )}
      />
      <span className="relative aspect-square h-1/2 border border-lp-line-strong bg-lp-paper" />
      <span className="relative aspect-square h-1/2 border border-lp-line-strong bg-lp-paper" />
    </span>
  );
}

/**
 * The desk: the 6 layouts as windows, each wired to the search trigger they all render. Hover or
 * focus brings one forward and previews it, a click (or Enter) pins it.
 */
export const Desk = memo(function Desk({ pinned, onPreview, onPin }: DeskProps) {
  const rest = useMemo(() => restRopes(), []);
  const engine = useRef<DeskEngine | null>(null);
  const preview = useRef(onPreview);
  useEffect(() => {
    preview.current = onPreview;
  });
  const ref = useCallback((board: HTMLDivElement | null) => {
    if (!board) return;
    const instance = createDeskEngine(board, 'docs', (id) => preview.current(id));
    engine.current = instance;
    return () => {
      instance.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setPinned(pinned);
  }, [pinned]);

  // arrow keys move the focus between the windows, the focus previews
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = SLOTS.findIndex((slot) => slot.id === (event.target as HTMLElement).dataset.slot);
    if (index < 0) return;
    const step = { ArrowRight: 1, ArrowDown: 2, ArrowLeft: -1, ArrowUp: -2 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + SLOTS.length) % SLOTS.length;
    event.currentTarget.querySelector<HTMLElement>(`[data-slot="${SLOTS[next].id}"]`)?.focus();
  }

  const cables = [];
  const windows = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    const active = slot.id === pinned;
    cables.push(
      <path
        key={slot.id}
        data-cable={slot.id}
        d={ropePath(rest, i)}
        strokeDasharray={active ? undefined : '4 3'}
        vectorEffect="non-scaling-stroke"
        className="fill-none stroke-lp-ink"
      />,
    );
    const [px, py] = windowPort(slot);
    const name = LAYOUTS.find((item) => item.id === slot.id)!.name;
    windows.push(
      <button
        key={slot.id}
        type="button"
        data-slot={slot.id}
        data-active={active ? '' : undefined}
        aria-pressed={active}
        aria-label={`${name} layout`}
        tabIndex={active ? 0 : -1}
        onClick={() => onPin(slot.id)}
        className="group/window absolute origin-top-left cursor-pointer text-start outline-none"
        style={percent(slot.x, slot.y, WINDOW.w, WINDOW.h)}
      >
        <span className="flex size-full flex-col border border-lp-line-strong bg-lp-paper group-hover/window:border-lp-ink group-focus-visible/window:outline group-focus-visible/window:outline-offset-2 group-focus-visible/window:outline-lp-ink group-data-active/window:border-lp-ink">
          <Bar active={active} />
          <span className="relative block flex-1">
            <Plan layout={slot.id} />
          </span>
        </span>
        <Port x={px} y={py} left={slot.x} top={slot.y} width={WINDOW.w} height={WINDOW.h} />
        <span
          className={cn(
            'absolute top-full left-0 mt-1 -ms-1.5 px-1.5 font-pixel text-[13px] leading-4 whitespace-nowrap',
            active && 'bg-lp-yellow text-[#121210]',
          )}
        >
          {name}
        </span>
      </button>,
    );
  }

  const ports = [];
  for (const slot of SLOTS) {
    const [x, y] = hubPort(slot);
    ports.push(
      <Port key={slot.id} x={x} y={y} left={HUB.x} top={HUB.y} width={HUB.w} height={HUB.h} />,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={ref}
        role="group"
        aria-label="Layouts"
        onKeyDown={onKeyDown}
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
          style={percent(HUB.x, HUB.y, HUB.w, HUB.h)}
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
      <p className="flex items-center gap-2 font-mono text-xs text-lp-ink-2">
        <span aria-hidden className="size-3 shrink-0 border border-lp-ink bg-lp-yellow" />
        layouts/shared/slots/search-trigger.tsx
      </p>
    </div>
  );
});
