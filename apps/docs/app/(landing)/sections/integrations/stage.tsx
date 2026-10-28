import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BAYER4 } from '../../lib/dither';
import { TICK } from '../../lib/motion';

/*
 * The stage of a mechanism: 96x40 cells of 3px. Parts are SVG paths and labels placed in cells,
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
export type Poses = Readonly<Record<number, string>>;

export interface Track {
  /** the key pose, kept with reduced motion */
  base?: string;
  poses: Poses;
  /** a longer cycle for this track, e.g. a flap that changes once per loop */
  ticks?: number;
}

export interface Choreography<K extends string = string> {
  name: string;
  /** loop length in ms */
  dur: number;
  css: string;
  /** class name of each track */
  cls: Record<K, string>;
}

/** keyframes of a mechanism: every track loops over `ticks` ticks, `steps(1, end)` from `.bt-a` */
export function choreograph<T extends Record<string, Track>>(
  name: string,
  ticks: number,
  tracks: T,
): Choreography<keyof T & string> {
  let css = '';
  const cls = {} as Record<keyof T & string, string>;
  for (const key in tracks) {
    const id = `bt-${name}-${key}`;
    const { base = '', poses, ticks: length = ticks } = tracks[key];
    cls[key] = `bt-a ${id}`;
    let rule = `${base};animation-name:${id}`;
    if (length !== ticks) rule += `;--bt-dur:${length * TICK}ms`;
    css += `.${id}{${rule}}@keyframes ${id}{`;
    // integer keys come in ascending order
    for (const [tick, pose] of Object.entries(poses)) {
      css += `${+((Number(tick) / length) * 100).toFixed(4)}%{${pose}}`;
    }
    css += '}';
  }
  return { name, dur: ticks * TICK, css, cls };
}

/** `css`, moving on to the next pose in `count` steps */
export function steps(count: number, css: string): string {
  return `${css};animation-timing-function:steps(${count},end)`;
}

/** visible from the first tick, then hidden and shown in turn on the next ones */
export function show(...ticks: number[]): Poses {
  const poses: Record<number, string> = { 0: 'opacity:0' };
  for (let i = 0; i < ticks.length; i++) poses[ticks[i]] = i % 2 === 0 ? 'opacity:1' : 'opacity:0';
  return poses;
}

/** moves a strip up by `cells` */
export function up(cells: number): string {
  return `transform:translateY(${-cells * CELL}px)`;
}

/**
 * a strip of `count` rows `h` cells tall plus a copy of the first, rolling to the next row
 * every `every` ticks with one half-way frame
 */
export function cycle(h: number, every: number, count: number): Track {
  const poses: Record<number, string> = {};
  for (let i = 0; i < count; i++) {
    poses[i * every] = up((i === 0 ? count : i) * h - h / 2);
    poses[i * every + 1] = up(i * h);
  }
  return { poses, ticks: every * count };
}

/** `<Frames>` of `h` cells showing frame `at[tick]` from each tick on, frame `base` at rest */
export function roll(h: number, at: Readonly<Record<number, number>>, base: number): Track {
  const poses: Record<number, string> = {};
  for (const tick in at) poses[tick] = up(at[tick] * h);
  return { base: up(base * h), poses };
}

/** a `<Cover>` slid down by `at[tick]` cells from each tick on, off its part at rest */
export function uncover(h: number, at: Readonly<Record<number, number>>): Track {
  const poses: Record<number, string> = {};
  for (const tick in at) poses[tick] = `transform:translateY(${at[tick] * CELL}px)`;
  return { base: `transform:translateY(${h * CELL}px)`, poses };
}

/** a line drawn from its left end in `count` steps from tick `from`, gone on `to` */
export function draw(from: number, count: number, to: number): Track {
  return {
    base: 'transform-origin:left',
    poses: {
      0: 'transform:scaleX(0)',
      [from]: steps(count, 'transform:scaleX(0)'),
      [from + count]: 'transform:scaleX(1)',
      [to]: 'transform:scaleX(0)',
    },
  };
}

function box(x: number, y: number, w: number | undefined, h: number | undefined): CSSProperties {
  return {
    left: x * CELL,
    top: y * CELL,
    width: w === undefined ? undefined : w * CELL,
    height: h === undefined ? undefined : h * CELL,
  };
}

/**
 * A 96x40 cell stage running one choreography. Its parts draw still ones first: the compositor
 * takes a moving part to cover anything drawn after it in its clip, the stage at most.
 */
export function Stage({ c, children }: { c: Choreography; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="relative block h-30 w-(--bt-stage) overflow-clip text-(--bt-ink) *:absolute"
      style={{ '--bt-dur': `${c.dur}ms` } as CSSProperties}
    >
      <style href={`bt-${c.name}`} precedence="default">
        {c.css}
      </style>
      {children}
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

/** pixel art, one path per tone */
export function Px({ x = 0, y = 0, w = 96, h = 40, className, ...tones }: PxProps) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      style={box(x, y, w, h)}
    >
      {tones.paper && <path d={tones.paper} className="fill-(--bt-paper)" />}
      {tones.hi && <path d={tones.hi} className="fill-lp-yellow" />}
      {tones.ink && <path d={tones.ink} className="fill-(--bt-ink)" />}
      {tones.knock && <path d={tones.knock} className="fill-(--bt-paper)" />}
      {tones.orange && <path d={tones.orange} className="fill-(--bt-orange)" />}
    </svg>
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
  /** end with a copy of the first row, for strips that roll forward with `cycle()` */
  loop?: boolean;
  itemClassName?: string;
  className?: string;
}

/** values stacked in rows of `h` cells, moved by a track to show one at a time */
export function Strip({ items, h, loop = false, itemClassName, className }: StripProps) {
  const rows = [];
  for (let i = 0; i < (loop ? items.length + 1 : items.length); i++) {
    rows.push(
      <span key={i} className="flex shrink-0 items-center" style={{ height: h * CELL }}>
        <span className={cn('text-xs leading-none font-medium whitespace-pre', itemClassName)}>
          {items[i % items.length]}
        </span>
      </span>,
    );
  }
  return <span className={cn('flex w-full flex-col', className)}>{rows}</span>;
}
