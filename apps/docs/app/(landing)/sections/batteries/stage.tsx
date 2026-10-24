import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Choreography } from './choreography';
import { CELL } from './px';

function box(x: number, y: number, w?: number, h?: number): CSSProperties {
  return {
    left: x * CELL,
    top: y * CELL,
    width: w === undefined ? undefined : w * CELL,
    height: h === undefined ? undefined : h * CELL,
  };
}

/** a 96x40 cell stage running one choreography, children are placed in cells */
export function Stage({ c, children }: { c: Choreography; children: ReactNode }) {
  return (
    <span aria-hidden className="bt-stage" style={{ '--bt-dur': `${c.dur}ms` } as CSSProperties}>
      <style href={`bt-${c.name}`} precedence="default">
        {c.css}
      </style>
      {children}
    </span>
  );
}

export interface PxProps {
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
export function Px({
  x = 0,
  y = 0,
  w = 96,
  h = 40,
  ink,
  orange,
  hi,
  paper,
  knock,
  className,
}: PxProps) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      style={box(x, y, w, h)}
    >
      {paper && <path d={paper} className="bt-paper" />}
      {hi && <path d={hi} className="bt-hi" />}
      {ink && <path d={ink} className="bt-ink" />}
      {knock && <path d={knock} className="bt-paper" />}
      {orange && <path d={orange} className="bt-orange" />}
    </svg>
  );
}

/** a Geist Pixel label where one font pixel is one CSS px */
export function Text({
  x,
  y,
  children,
  className,
}: {
  x: number;
  y: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('bt-text', className)} style={box(x, y)}>
      {children}
    </span>
  );
}

/** a group of parts that animates together */
export function Layer({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn('bt-layer', className)}>{children}</span>;
}

/** a window that clips what moves inside it */
export function Clip({
  x,
  y,
  w,
  h,
  className,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn('bt-clip', className)} style={box(x, y, w, h)}>
      {children}
    </span>
  );
}

/** values stacked in rows of `h` cells, moved by a track to show one at a time */
export function Strip({
  items,
  h,
  loop = false,
  className,
}: {
  items: readonly ReactNode[];
  h: number;
  /** end with a copy of the first row, for strips that roll forward with `cycle()` */
  loop?: boolean;
  className?: string;
}) {
  const rows = [];
  const count = loop ? items.length + 1 : items.length;
  for (let i = 0; i < count; i++) {
    rows.push(
      <span key={i} className="bt-row" style={{ height: h * CELL }}>
        {items[i % items.length]}
      </span>,
    );
  }
  return <span className={cn('bt-strip', className)}>{rows}</span>;
}
