'use client';
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { LEGS, MATE_H, MATE_PAD, MATE_W, SPRITE_W } from '@/components/mascot/sprite';
import { cn } from '@/lib/cn';
import type { ShowcaseObject } from '@/lib/showcases';
import { clamp, TICK } from '../lib/motion';
import { report } from '../lib/status';
import { address } from '../ui/site-tile';
import { Roller } from '../ui/text';
import { Window } from '../ui/window';
import {
  BAND,
  createProjector,
  DEVELOP,
  dither,
  FRAME_H,
  FRAME_W,
  H,
  hidePrint,
  LEADER,
  PITCH,
  printFrame,
  type ProjectorEngine,
  SEAT_X,
  SIDE,
  STRIP_Y,
  TRACK_LEFT,
  TRACK_RIGHT,
  W,
} from './engine';

interface ProjectorProps {
  sites: Required<ShowcaseObject>[];
  /** the deck's fixed hardware, drawn on the server: under the strip, and over it */
  back: ReactNode;
  front: ReactNode;
}

/** strokes stay 1px at any size */
const LINE = { vectorEffect: 'non-scaling-stroke' } as const;
const TRACK = TRACK_RIGHT - TRACK_LEFT;
/** frames kept on the strip either side of the gate and the next frame; their screenshots load */
const NEAR = 4;
const DARKEN = TICK * 2;
/** the name on the base rolls to the next within the pull and the develop, 6 ticks a cell at most */
const ROLL = 500;
const ROLL_STEP = TICK / 4;

/** where frame `i` of the reel sits, in % of the reel, its leader first */
function slot(i: number, frames: number): CSSProperties {
  return {
    left: `${(((LEADER + i) * PITCH + (PITCH - FRAME_W) / 2) / (frames * PITCH)) * 100}%`,
    width: `${(FRAME_W / (frames * PITCH)) * 100}%`,
    top: `${((BAND - FRAME_H) / 2 / BAND) * 100}%`,
    height: `${(FRAME_H / BAND) * 100}%`,
  };
}

/** a frame on the strip at the start prints in on its tick, from the left */
function pop(i: number): CSSProperties {
  return { '--pop': `${Math.max(0, i + SIDE) * TICK}ms` } as CSSProperties;
}

/** hidden until the reel first comes into view, then shown on its tick */
const reveal =
  'invisible group-data-booted/projector:visible [transition:visibility_0s_linear_var(--pop,0ms)] motion-reduce:[transition:none] [@media(scripting:none)]:visible';

/** the perforations: 4 a frame, punched in both rails */
const PERFS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 48' preserveAspectRatio='none'%3E%3Crect x='5.5' y='2' width='7' height='4' rx='1'/%3E%3Crect x='5.5' y='42' width='7' height='4' rx='1'/%3E%3C/svg%3E")`;

/** blank film at each end of the reel, with the countdown leader's cross and rings */
function Leader({ style }: { style: CSSProperties }) {
  return (
    <span aria-hidden className="absolute bg-lp-paper" style={style}>
      <svg
        viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
        className={cn('size-full fill-none stroke-lp-ink-2', reveal)}
      >
        <circle cx={FRAME_W / 2} cy={FRAME_H / 2} r={12} style={LINE} />
        <circle cx={FRAME_W / 2} cy={FRAME_H / 2} r={7.5} style={LINE} />
        <path
          d={`M${FRAME_W / 2} 2v${FRAME_H - 4}M8 ${FRAME_H / 2}h${FRAME_W - 16}`}
          style={LINE}
        />
      </svg>
    </span>
  );
}

const subscribeNone = () => () => {};

/**
 * The showcase on a reel: the strip runs one frame at a time through the gate, and the window above
 * shows the frame in the gate. Pick a frame and the strip runs to it; the switch stops the reel.
 */
export function Projector({ sites, back, front }: ProjectorProps) {
  const reduced = useReducedMotion() === true;
  const client = useSyncExternalStore(
    subscribeNone,
    () => true,
    () => false,
  );
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  /** the frame the strip is on its way to */
  const [heading, setHeading] = useState<number | null>(null);
  const [on, setOn] = useState(true);
  const engine = useRef<ProjectorEngine | null>(null);
  const screen = useRef<HTMLSpanElement>(null);
  const site = sites[current];
  const checked = picked ?? current;
  /** the name on the base, and the frame the screen has ready next */
  const name = sites[heading ?? current].name;
  const incoming = heading ?? (current + 1) % sites.length;
  const frames = sites.length + LEADER * 2;
  // a roll covers the longer of two names: the cells of the longest one start within the budget
  let longest = 1;
  for (const item of sites) longest = Math.max(longest, item.name.length);
  const stagger = Math.min(TICK / 6, (ROLL - 6 * ROLL_STEP) / Math.max(1, longest - 1));

  const root = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const layer = (index: number) => screen.current?.querySelector(`[data-layer="${index}"]`);
      /** strips that left so far: an arrival from before the last one is stale */
      let leaves = 0;
      const instance = createProjector(element, sites.length, reduced, {
        leave(from, to) {
          leaves++;
          if (!reduced) dither(layer(from), 16, DARKEN);
          setHeading(to);
          report(element, `showing ${address(sites[to].url)}`);
        },
        arrive(index) {
          // the screen keeps the last frame until the new one is ready to show
          const at = leaves;
          const show = () => {
            if (at !== leaves) return;
            // the frame in the gate develops on the screen, the others go back to their colours
            const developing = layer(index);
            for (const other of screen.current?.querySelectorAll('[data-layer]') ?? []) {
              if (other !== developing) hidePrint(other);
            }
            if (!reduced) dither(developing, 0, DEVELOP);
            setCurrent(index);
            // a pick queued past this frame stays checked
            setPicked((pick) => (pick === index ? null : pick));
            setHeading(null);
            // the same line as at the leave, unless a pick turned the strip on its way
            report(element, `showing ${address(sites[index].url)}`);
          };
          const image = layer(index)?.querySelector('img');
          if (image) void image.decode().then(show, show);
          else show();
        },
      });
      engine.current = instance;
      return () => {
        instance.destroy();
        engine.current = null;
      };
    },
    [sites, reduced],
  );

  function pick(index: number) {
    setPicked(index);
    engine.current?.seek(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let to = checked;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') to++;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') to--;
    else return;
    event.preventDefault();
    to = clamp(to, 0, sites.length - 1);
    // the picked frame comes onto the strip before it takes focus
    flushSync(() => pick(to));
    event.currentTarget.querySelector<HTMLElement>(`[data-frame="${to}"]`)?.focus();
  }

  function toggle() {
    setOn(!on);
    engine.current?.power(!on);
  }

  const layers: ReactNode[] = [];
  for (const index of current === incoming ? [current] : [current, incoming]) {
    const item = sites[index];
    layers.push(
      <span
        key={item.url}
        data-layer={index}
        className={cn('absolute inset-0', index !== current && 'invisible')}
      >
        <Image
          src={item.image}
          alt=""
          width={640}
          height={335}
          loading={index === 0 ? 'eager' : undefined}
          fetchPriority={index === 0 ? 'high' : undefined}
          className="absolute inset-0 size-full object-cover"
        />
        <canvas
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 [image-rendering:pixelated]"
        />
      </span>,
    );
  }

  // the strip shows the frames either side of the gate, those it passes on its way to the next and
  // the picked one; their screenshots load a few frames ahead, the rest of the reel is wound away
  const low = Math.min(current, heading ?? current, checked);
  const high = Math.max(current, heading ?? current, checked);
  const first = Math.min(current, incoming) - NEAR;
  const last = Math.max(current, incoming) + NEAR;
  const strip: ReactNode[] = [];
  for (let i = 0; i < sites.length; i++) {
    const item = sites[i];
    const shown = i >= low - SIDE && i <= high + SIDE;
    strip.push(
      <button
        key={item.url}
        // a frame prints as it comes onto the strip: a hidden one has no size to print at
        ref={shown ? printFrame : undefined}
        type="button"
        role="radio"
        aria-checked={i === checked}
        aria-label={item.name}
        aria-posinset={i + 1}
        aria-setsize={sites.length}
        tabIndex={i === checked ? 0 : -1}
        data-frame={i}
        onClick={() => pick(i)}
        className={cn(
          // focused like hovered, its print inverted, and ringed on the strip outside the gate
          'group/frame absolute bg-lp-paper outline-lp-yellow focus-visible:outline-2 focus-visible:outline-offset-1',
          !shown && 'hidden',
        )}
        style={{ ...slot(i, frames), ...(i <= SIDE ? pop(i) : undefined) }}
      >
        {i >= first && i <= last && (
          <Image
            src={item.image}
            alt=""
            width={FRAME_W + 1}
            height={FRAME_H + 1}
            // eager once hydrated: on the server it would add a preload for every frame
            loading={client ? 'eager' : 'lazy'}
            onLoad={(event) => printFrame(event.currentTarget.parentElement)}
            className="invisible absolute inset-0 size-full object-cover [@media(scripting:none)]:visible"
          />
        )}
        <canvas
          aria-hidden
          className={cn(
            'absolute inset-0 size-full [image-rendering:pixelated] group-hover/frame:invert group-focus-visible/frame:invert',
            reveal,
          )}
        />
      </button>,
    );
  }
  const leader: ReactNode[] = [];
  for (let i = 0; i < LEADER; i++) {
    leader.push(
      <Leader key={`a${i}`} style={{ ...slot(i - LEADER, frames), ...pop(i - LEADER) }} />,
      <Leader key={`b${i}`} style={slot(sites.length + i, frames)} />,
    );
  }

  return (
    <div ref={root} className="group/projector flex flex-col">
      <a
        href={site.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group outline-offset-2 outline-lp-ink focus-visible:outline"
      >
        <Window
          title={
            <span className="-mx-2 block px-2 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
              {address(site.url)}
            </span>
          }
        >
          <span className="sr-only">{site.name}</span>
          <span ref={screen} className="relative block aspect-og overflow-hidden">
            {layers}
          </span>
        </Window>
      </a>
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <div className="pointer-events-none">{back}</div>
        <div
          role="radiogroup"
          aria-label="Reel"
          onKeyDown={onKeyDown}
          className="@container absolute overflow-hidden bg-lp-ink dark:bg-lp-paper-2 dark:outline dark:outline-lp-line-strong"
          style={{
            left: `${(TRACK_LEFT / W) * 100}%`,
            width: `${(TRACK / W) * 100}%`,
            top: `${((STRIP_Y - BAND / 2) / H) * 100}%`,
            height: `${(BAND / H) * 100}%`,
          }}
        >
          <div
            data-reel
            className="absolute inset-y-0 will-change-transform"
            style={{
              left: `${((TRACK / 2 - (LEADER + 0.5) * PITCH) / TRACK) * 100}%`,
              width: `${((frames * PITCH) / TRACK) * 100}%`,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-lp-paper dark:bg-lp-ink-2"
              style={{ maskImage: PERFS, maskSize: `calc(100cqw * ${PITCH / 4 / TRACK}) 100%` }}
            />
            {leader}
            {strip}
          </div>
        </div>
        <div className="pointer-events-none">{front}</div>
        {/* her, sitting on the screen's bottom edge, her legs over the gap above the strip */}
        <canvas
          data-mate
          aria-hidden
          width={MATE_W}
          height={MATE_H}
          className="pointer-events-none invisible absolute [--cell:1px] [image-rendering:pixelated]"
          style={{
            top: `calc(${LEGS - MATE_H} * var(--cell))`,
            left: `calc(${(SEAT_X / W) * 100}% - ${MATE_PAD[0] + SPRITE_W / 2} * var(--cell))`,
            width: `calc(${MATE_W} * var(--cell))`,
          }}
        />
      </div>
      {/* the base: the name of the site in the gate, the run switch and its lamp */}
      <div className="flex h-12 items-center gap-3 border border-lp-line-strong bg-lp-paper px-4">
        {/* a name longer than the gate fades out at its edge */}
        <p className="min-w-0 flex-1 overflow-hidden font-pixel text-2xl leading-none whitespace-nowrap [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]">
          <Roller value={name} step={ROLL_STEP} stagger={stagger} />
        </p>
        <span className="font-pixel text-xs leading-none text-lp-ink-2 motion-reduce:hidden">
          run
        </span>
        <button
          type="button"
          aria-pressed={on}
          aria-label="Run the reel"
          onClick={toggle}
          className="relative h-6 w-4 shrink-0 outline-offset-2 outline-lp-ink focus-visible:outline motion-reduce:hidden"
        >
          <svg aria-hidden viewBox="0 0 16 24" className="size-full overflow-visible">
            <rect
              x="0.5"
              y="0.5"
              width="15"
              height="23"
              rx="2"
              className="fill-lp-paper stroke-lp-ink-2"
            />
            <circle cx="8" cy="12" r="3.5" className="fill-lp-paper stroke-lp-ink-2" />
            <path
              d={on ? 'M8 12V3' : 'M8 12v9'}
              strokeWidth={2.5}
              strokeLinecap="round"
              className="stroke-lp-ink"
            />
          </svg>
        </button>
        <span
          aria-hidden
          className={cn(
            'size-2.5 shrink-0 rounded-full border motion-reduce:hidden',
            on ? 'border-lp-ink bg-lp-sun' : 'border-lp-ink-2 bg-lp-paper',
          )}
        />
      </div>
    </div>
  );
}
