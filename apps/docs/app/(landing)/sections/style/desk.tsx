'use client';
import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/cn';
import { DITHER_MASKS } from '../../lib/dither';
import { Window } from '../../ui/window';
import type { LayoutId } from './data';
import { createDesk } from './engine';
import type { Hardware } from './hardware';
import { Led, PART, type PartProps, Stamp } from './parts';
import { Plan } from './plan';
import {
  BOARD,
  FIRST_POSE,
  hangRopes,
  type Hung,
  HUB,
  hubTransform,
  percent,
  PLUG,
  plugTransform,
  ropePath,
  shadowInset,
  shadowLevel,
  shadowTransform,
  SLOTS,
  WINDOW,
  windowTransform,
} from './scene';

interface DeskProps {
  selected: LayoutId;
  /** the layouts feed the monitor; off, every cable hangs slack and the windows wait for a click */
  live: boolean;
  busy: boolean;
  hung: Hung;
  onSelect: (id: LayoutId) => void;
  hardware: Hardware;
  className: string;
}

/** one switch per layout, the patched one's up */
function DipBank({ on, className, style }: PartProps & { on: number }) {
  const slots = [];
  let legs = '';
  for (let i = 0; i < 6; i++) {
    const x = 16 + i * 16;
    legs += `M${x + 6} 2v5M${x + 6} 41v5`;
    slots.push(
      <g key={i}>
        <rect x={x + 0.5} y={13.5} width={11} height={21} />
        <rect
          x={x + 2}
          y={15}
          width={8}
          height={8}
          className={cn(
            'stroke-none transition-transform duration-[120ms] ease-[steps(2,end)] motion-reduce:transition-none',
            i === on ? 'fill-lp-ink' : 'fill-lp-ink-2',
          )}
          style={{ transform: i === on ? undefined : 'translateY(10px)' }}
        />
      </g>,
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 116 48" className={cn(PART, className)} style={style}>
      <path d={legs} />
      <rect x={0.5} y={7.5} width={115} height={33} />
      <path d="M6 30V17M3.5 20L6 16.5L8.5 20" className="fill-none" />
      {slots}
    </svg>
  );
}

/** its armature clicks over each time a layout is patched in */
function Relay({ flip, className, style }: PartProps & { flip: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 64 48" className={cn(PART, className)} style={style}>
      <rect x={0.5} y={0.5} width={63} height={47} strokeDasharray="3 2" />
      <rect x={8.5} y={14.5} width={16} height={26} />
      <path d="M8.5 18.5h16M8.5 21.5h16M8.5 24.5h16M8.5 27.5h16M8.5 30.5h16M8.5 33.5h16M8.5 36.5h16" />
      <path d="M16.5 14.5V8.5h30" className="fill-none" />
      <circle cx={46.5} cy={8.5} r={1.8} className="fill-lp-ink-2 stroke-none" />
      <g
        className="transition-transform duration-[120ms] ease-[steps(2,end)] [transform-origin:46.5px_8.5px] motion-reduce:transition-none"
        style={{ transform: flip ? 'rotate(-14deg)' : 'rotate(14deg)' }}
      >
        <path d="M46.5 8.5V34" strokeWidth={2} />
      </g>
      <path d="M36 36.5h5M52 36.5h5" strokeWidth={2} />
      <path d="M38.5 36.5v8M54.5 36.5v8" />
    </svg>
  );
}

/** the title bar of a mini window, striped when it is the chosen one; its lamp lights then */
function Bar({ active }: { active: boolean }) {
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

/** a plug from its jack at (0, 0) to its tail: the sleeve, a boot tapering to the cable */
const PLUG_BODY = `M4 -5.5H${PLUG - 8}L${PLUG} -2V2L${PLUG - 8} 5.5H4z`;
const PLUG_RIBS = `M${PLUG - 6} -4.6v9.2M${PLUG - 3.5} -3.7v7.4`;

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 };
const TILTS = [-1.5, 1, -0.5, 1.5, -1, 0.5];

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
  const ropes = useMemo(() => hangRopes(FIRST_POSE, hung), [hung]);
  const index = SLOTS.findIndex((slot) => slot.id === selected);
  const [relay, setRelay] = useState({ selected, flip: false });
  if (relay.selected !== selected) setRelay({ selected, flip: !relay.flip });

  const engine = useRef<ReturnType<typeof createDesk> | null>(null);
  const ref = useCallback(
    (board: HTMLDivElement | null) => {
      if (!board) return;
      const instance = createDesk(board, hung);
      engine.current = instance;
      return () => {
        instance.destroy();
        engine.current = null;
      };
    },
    [hung],
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

  const w = FIRST_POSE.windows;
  const cables = [];
  const ties = [];
  const plugs = [];
  const windows = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    const active = i === index;
    const on = active && live;
    const d = ropePath(ropes, i);
    // the patched cable is a coax, its core showing down the middle; the others hang slack
    cables.push(
      <g key={slot.id}>
        <path
          data-cable
          d={d}
          strokeDasharray={on ? undefined : '4 3'}
          strokeWidth={on ? 3.5 : 1}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-lp-ink"
        />
        <path
          data-cable
          d={d}
          visibility={on ? undefined : 'hidden'}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-lp-paper"
        />
      </g>,
    );
    ties.push(
      <g key={slot.id} data-tie>
        <rect x={-2.5} y={-6} width={5} height={12} className="fill-lp-paper stroke-lp-ink" />
        <path d="M2.5 -3h6" className="stroke-lp-ink" />
      </g>,
    );
    for (const end of [0, 1] as const) {
      plugs.push(
        <g key={`${slot.id}-${end}`} data-plug transform={plugTransform(i, ropes.ends, end)}>
          <path d={PLUG_BODY} className="fill-lp-ink" />
          <path d={PLUG_RIBS} className="stroke-lp-paper" />
          <rect x={1.5} y={-7.5} width={4.5} height={15} className="fill-lp-paper stroke-lp-ink" />
        </g>,
      );
    }
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
            'absolute left-0 -ms-1',
            slot.row === 0
              ? 'bottom-[calc(100%+var(--plate)+8px)] origin-[6px_100%]'
              : 'top-[calc(100%+var(--plate)+8px)] origin-[6px_0]',
          )}
          style={{ transform: `scale(${(1 / w[i * 3 + 1]).toFixed(4)})` }}
        >
          <Stamp tilt={TILTS[i]} active={on}>
            {slot.name}
          </Stamp>
        </span>
      </button>,
    );
  }

  return (
    <Window title={`fumadocs-ui/layouts/${selected}`} className={className}>
      <div className="@container flex [--plate:max(6px,1.4cqw)] xl:min-h-0 xl:flex-1">
        {/* A chosen window's plate stands out of the board by `--plate`, its stamp over its edge at
            the overshoot, a line tall: both keep the stamps' gap to the frame. Under the browser
            the board takes the width, beside it the height it is given. */}
        <div className="grid flex-1 place-items-center px-[calc(var(--plate)+8px)] py-[calc(1.5*(var(--plate)+8px)+1lh+3px)] leading-4 [container-type:inline-size] xl:[container-type:size]">
          <div
            ref={ref}
            role="radiogroup"
            aria-label="Layouts"
            onKeyDown={onKeyDown}
            className="@container relative w-full xl:w-[min(100cqw,100cqh*var(--wide))]"
            style={
              {
                aspectRatio: `${BOARD.w} / ${BOARD.h}`,
                '--wide': BOARD.w / BOARD.h,
              } as CSSProperties
            }
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
                transform: hubTransform(FIRST_POSE.hub[0], FIRST_POSE.hub[1]),
              }}
            >
              <span
                className="absolute inset-0 bg-lp-ink-2"
                style={{ maskImage: DITHER_MASKS[4], maskSize: '4px 4px', translate: '5px 7px' }}
              />
              <span className="absolute inset-0 border border-lp-ink bg-lp-paper" />
              {hardware.junction}
              <Led on className={cn('top-[31%] left-[50%]', busy && 'lp-caret')} />
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
    </Window>
  );
});
