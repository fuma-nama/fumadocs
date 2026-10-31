import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BAYER4 } from '../../lib/dither';
import { TICK } from '../../lib/motion';

/*
 * The stage of a mechanism: 96x40 cells of 3px in a 120x56 unit. Parts are SVG paths and labels placed in cells,
 * posed by tracks on the 125 ms tick grid. Tracks move only transform and opacity, so the
 * compositor plays them: a part with several looks is a strip of pre-drawn frames, and parts that
 * come in one after another are uncovered by a sheet of paper sliding off them.
 */
const CELL = 3;

export function rect(x: number, y: number, w: number, h: number): string {
  return `M${x} ${y}h${w}v${h}h${-w}z`;
}

export function frame(x: number, y: number, w: number, h: number): string {
  return (
    rect(x, y, w, 1) +
    rect(x, y + h - 1, w, 1) +
    rect(x, y + 1, 1, h - 2) +
    rect(x + w - 1, y + 1, 1, h - 2)
  );
}

/** the cells of `rows` drawn with `char`, e.g. `art(['.#.', '###'], 4, 2)` */
export function art(rows: readonly string[], x = 0, y = 0, char = '#'): string {
  let d = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      if (row[c] !== char) {
        c++;
        continue;
      }
      const start = c;
      while (row[c] === char) c++;
      d += rect(x + start, y + r, c - start, 1);
    }
  }
  return d;
}

/** ordered dither fill keeping `level` of 16 cells of every 4x4 tile */
export function dither(x: number, y: number, w: number, h: number, level: number): string {
  const rows = [];
  for (let r = 0; r < h; r++) {
    let row = '';
    for (let c = 0; c < w; c++)
      row += BAYER4[((y + r) % 4) * 4 + ((x + c) % 4)] < level ? '#' : '.';
    rows.push(row);
  }
  return art(rows, x, y);
}

/** a horizontal dashed rule, `on` cells drawn then `off` cells skipped */
export function dashes(x: number, y: number, w: number, on: number, off: number): string {
  let d = '';
  for (let c = 0; c < w; c += on + off) d += rect(x + c, y, Math.min(on, w - c), 1);
  return d;
}

/** the CSS a track holds from each tick on */
type Poses = Readonly<Record<number, string>>;

interface Track {
  /** its style before its first pose, and under its pose at rest */
  base?: string;
  poses: Poses;
}

interface Choreography<K extends string = string> {
  name: string;
  /** its ticks in ms */
  dur: number;
  css: string;
  /** class name of each track */
  cls: Record<K, string>;
}

/**
 * keyframes of a mechanism, played once through while its card is `[data-play]`: every track runs
 * over `ticks` ticks, each pose held till the next (`steps(1, end)` from `.bt-a`) unless it
 * `glide`s, and stops on its pose at tick `rest`, its payoff, which it also holds at rest. A card
 * `[data-queued]` for its turn holds its first pose.
 */
export function choreograph<T extends Record<string, Track>>(
  name: string,
  ticks: number,
  rest: number,
  tracks: T,
): Choreography<keyof T & string> {
  let css = '';
  const cls = {} as Record<keyof T & string, string>;
  for (const key in tracks) {
    const id = `bt-${name}-${key}`;
    const { base = '', poses } = tracks[key];
    cls[key] = `bt-a ${id}`;
    let held = '';
    let frames = 0 in poses ? '' : `0%{${base}}`;
    // integer keys come in ascending order
    for (const [tick, pose] of Object.entries(poses)) {
      if (Number(tick) <= rest) held = pose.replace(LINEAR, '');
      frames += `${+((Number(tick) / ticks) * 100).toFixed(4)}%{${pose}}`;
    }
    const first = 0 in poses ? poses[0].replace(LINEAR, '') : '';
    // just short of the tick after `rest`, still on its pose
    const count = +((rest + 0.999) / ticks).toFixed(5);
    css += `.${id}{${base};${held}}[data-queued] .${id}{${base};${first}}[data-play] .${id}{animation-name:${id};animation-iteration-count:${count}}@keyframes ${id}{${frames}}`;
  }
  return { name, dur: ticks * TICK, css, cls };
}

const LINEAR = ';animation-timing-function:linear';

/** `css`, moving on to the next pose steadily */
export function glide(css: string): string {
  return css + LINEAR;
}

/**
 * hidden from the first tick, then shown and hidden in turn on the next ones: by `visibility`, which
 * swaps in place and keeps no layer between swaps
 */
export function show(...ticks: number[]): Poses {
  const poses: Record<number, string> = { 0: 'visibility:hidden' };
  for (let i = 0; i < ticks.length; i++)
    poses[ticks[i]] = i % 2 === 0 ? 'visibility:visible' : 'visibility:hidden';
  return poses;
}

/** a strip `cells` up behind its clip, held there: by `top`, which keeps no layer */
function at(cells: number): string {
  return `top:${-cells * CELL}px`;
}

/** `<Frames>` of `h` cells showing frame `frames[tick]` from each tick on, frame `base` at rest */
export function roll(h: number, frames: Readonly<Record<number, number>>, base: number): Track {
  const poses: Record<number, string> = {};
  for (const tick in frames) poses[tick] = at(frames[tick] * h);
  return { base: at(base * h), poses };
}

/**
 * a `<Cover>` from `at[tick]` cells down from each tick on, off its part at rest: by its `top`, the
 * paper under it the same, which keeps no layer
 */
export function uncover(h: number, at: Readonly<Record<number, number>>): Track {
  const poses: Record<number, string> = {};
  for (const tick in at) poses[tick] = `top:${at[tick] * CELL}px`;
  return { base: `top:${h * CELL}px`, poses };
}

function box(x: number, y: number, w: number | undefined, h: number | undefined): CSSProperties {
  return {
    left: x * CELL,
    top: y * CELL,
    width: w === undefined ? undefined : w * CELL,
    height: h === undefined ? undefined : h * CELL,
  };
}

/** a slotted screw head, 3x3 cells */
const SCREW = ['###', '#.#', '###'];

interface StageProps {
  c: Choreography;
  /** the unit's readout: a status a frame, rolled by `status`, the lamp lit by `lamp` */
  states: readonly string[];
  status: string;
  lamp: string;
  /** set at the readout's end: what the unit runs on */
  spec: string;
  children: ReactNode;
}

/**
 * A mechanism's unit, 120x56 cells: its 96x40 cell stage on a plate screwed at its corners, a
 * ruler down either side, and under it the readout, a lamp lit while it works, its status in the
 * machine's voice and what it runs on. Its parts draw still ones first: the compositor takes a
 * moving part to cover anything drawn after it in its clip, the unit at most.
 */
export function Stage({ c, states, status, lamp, spec, children }: StageProps) {
  let rulers = rect(4, 8, 1, 40) + rect(115, 8, 1, 40);
  for (let y = 8; y <= 48; y += 4) {
    const tick = y % 8 === 0 ? 3 : 2;
    rulers += rect(5 - tick, y, tick, 1) + rect(115, y, tick, 1);
  }
  return (
    <span
      aria-hidden
      className="bt-stage relative block h-42 w-(--bt-stage) overflow-clip text-(--bt-ink) *:absolute"
      style={{ '--bt-dur': `${c.dur}ms` } as CSSProperties}
    >
      <style href={`bt-${c.name}`} precedence="default">
        {c.css}
      </style>
      <Px
        w={120}
        h={56}
        ink={
          art(SCREW, 0, 0) +
          art(SCREW, 117, 0) +
          art(SCREW, 0, 53) +
          art(SCREW, 117, 53) +
          rulers +
          rect(12, 50, 96, 1)
        }
        className="opacity-55"
      />
      <Layer x={12} y={6} w={96} h={40}>
        {children}
      </Layer>
      <Px x={12} y={52} w={3} h={3} ink={frame(0, 0, 3, 3)} />
      <Px x={12} y={52} w={3} h={3} orange={rect(0, 0, 3, 3)} className={lamp} />
      <Clip x={17} y={51} w={60} h={5}>
        <Strip
          items={states}
          h={5}
          itemClassName="font-pixel font-normal text-(--bt-ink) opacity-75"
          className={status}
        />
      </Clip>
      <Text x={60} y={51} w={48} h={5} className="justify-end font-pixel font-normal opacity-55">
        {spec}
      </Text>
    </span>
  );
}

interface PxProps {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  ink?: string;
  orange?: string;
  /** active highlight, yellow */
  hi?: string;
  /** background colour under the ink */
  paper?: string;
  /** background colour over the ink, e.g. text on a dark card */
  knock?: string;
  className?: string;
}

/** pixel art, one path per tone; posed by `className` in an HTML box, which the compositor can
 * move, as it can't an svg */
export function Px({ x = 0, y = 0, w = 96, h = 40, className, ...tones }: PxProps) {
  const svg = (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className && 'block size-full'}
      style={className ? undefined : box(x, y, w, h)}
    >
      {tones.paper && <path d={tones.paper} className="fill-(--bt-paper)" />}
      {tones.hi && <path d={tones.hi} className="fill-lp-yellow" />}
      {tones.ink && <path d={tones.ink} className="fill-(--bt-ink)" />}
      {tones.knock && <path d={tones.knock} className="fill-(--bt-paper)" />}
      {tones.orange && <path d={tones.orange} className="fill-(--bt-orange)" />}
    </svg>
  );
  if (!className) return svg;
  return (
    <span className={className} style={box(x, y, w, h)}>
      {svg}
    </span>
  );
}

interface PartProps {
  x: number;
  y: number;
  /** cells across; a label without it is as wide as its text */
  w?: number;
  h: number;
  className?: string;
  children: ReactNode;
}

/** a label in the middle of its row of `h` cells, its parts laid out in a line */
export function Text({ x, y, w, h, className, children }: PartProps) {
  return (
    <span
      className={cn('flex items-center text-xs leading-none font-medium whitespace-pre', className)}
      style={box(x, y, w, h)}
    >
      {children}
    </span>
  );
}

/** a window that clips what moves inside it */
export function Clip({ x, y, w, h, className, children }: PartProps & { w: number }) {
  return (
    <span className={cn('overflow-clip *:absolute', className)} style={box(x, y, w, h)}>
      {children}
    </span>
  );
}

/** a sheet of the card's paper over the part under it, slid off by an `uncover` track */
export function Cover({ x, y, w, h, className }: Omit<PartProps, 'children'> & { w: number }) {
  return (
    <Clip x={x} y={y} w={w} h={h}>
      <span className={cn('inset-0 bg-(--bt-paper)', className)} />
    </Clip>
  );
}

/** a group of parts that animates together, over the stage or over its own box */
export function Layer({
  x,
  y,
  w,
  h,
  className,
  children,
}: Partial<Omit<PartProps, 'children'>> & { children: ReactNode }) {
  return (
    <span
      className={cn(x === undefined && 'inset-0', '*:absolute', className)}
      style={x === undefined ? undefined : box(x, y ?? 0, w, h)}
    >
      {children}
    </span>
  );
}

/** pre-drawn frames `h` cells tall, stacked; a `roll` track shows one at a time */
export function Frames({
  h,
  className,
  children,
}: {
  h: number;
  className: string;
  children: ReactNode[];
}) {
  const rows = [];
  for (let i = 0; i < children.length; i++) {
    rows.push(
      <span key={i} className="relative shrink-0 *:absolute" style={{ height: h * CELL }}>
        {children[i]}
      </span>,
    );
  }
  return <span className={cn('flex w-full flex-col', className)}>{rows}</span>;
}

interface StripProps {
  items: readonly string[];
  h: number;
  itemClassName?: string;
  className?: string;
}

/** values stacked in rows of `h` cells, moved by a track to show one at a time */
export function Strip({ items, h, itemClassName, className }: StripProps) {
  const rows = [];
  for (let i = 0; i < items.length; i++) {
    rows.push(
      <span key={i} className="flex shrink-0 items-center" style={{ height: h * CELL }}>
        <span className={cn('text-xs leading-none font-medium whitespace-pre', itemClassName)}>
          {items[i]}
        </span>
      </span>,
    );
  }
  return <span className={cn('flex w-full flex-col', className)}>{rows}</span>;
}
