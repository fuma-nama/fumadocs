'use client';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { BEAT, settleCss, TICK } from '../lib/motion';
import { setStatus } from '../lib/status';
import { useIsClient } from '../lib/use-is-client';
import { address } from '../ui/site-tile';
import { develop, dither, prepare } from './develop';

interface Stop {
  element: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Cable {
  d: string;
  /** top-left corners of the two ports, 6px squares just outside the windows' frames */
  ports: [number, number][];
}

interface Layout {
  cables: Cable[];
  /** one window per row: nothing to plot */
  single: boolean;
}

/** a port's size in CSS px */
const PORT = 6;

/** the stops in visiting order: row by row, every other row backwards, like a plotter */
function route(desk: HTMLElement): Stop[] {
  const origin = desk.getBoundingClientRect();
  const rows: Stop[][] = [];
  for (const element of desk.querySelectorAll<HTMLElement>('[data-stop]')) {
    const r = element.getBoundingClientRect();
    const stop = {
      element,
      x: r.left - origin.left,
      y: r.top - origin.top,
      w: r.width,
      h: r.height,
    };
    const row = rows.find((items) => Math.abs(items[0].y - stop.y) < 8);
    if (row) row.push(stop);
    else rows.push([stop]);
  }
  const stops: Stop[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i % 2 === 1) row.reverse();
    for (const stop of row) stops.push(stop);
  }
  return stops;
}

/** a dashed cable from one window to the next, through the gap between them, plugged into ports */
function cable(a: Stop, b: Stop): Cable {
  const half = PORT / 2;
  if (Math.abs(a.y - b.y) < 8) {
    const forward = b.x > a.x;
    const x1 = forward ? a.x + a.w + PORT : a.x - PORT;
    const x2 = forward ? b.x - PORT : b.x + b.w + PORT;
    const y1 = Math.round(a.y + a.h * 0.68);
    const y2 = Math.round(b.y + b.h * 0.32);
    const mx = (x1 + x2) / 2;
    return {
      d: `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`,
      ports: [
        [forward ? x1 - PORT : x1, y1 - half],
        [forward ? x2 : x2 - PORT, y2 - half],
      ],
    };
  }
  const x1 = Math.round(a.x + a.w * 0.5);
  const x2 = Math.round(b.x + b.w * 0.5);
  const y1 = a.y + a.h + PORT;
  const y2 = b.y - PORT;
  const my = (y1 + y2) / 2;
  return {
    d: `M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}`,
    ports: [
      [x1 - half, y1 - PORT],
      [x2 - half, y2],
    ],
  };
}

/** the readout under the cursor: where it is on the desk, in CSS px */
function coordinates(path: SVGPathElement, progress: number): string {
  const point = path.getPointAtLength(progress * path.getTotalLength());
  return `x ${Math.round(point.x)} y ${Math.round(point.y)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const flash = {
  backgroundColor: ['var(--lp-ink)', 'var(--lp-ink)'],
  color: ['var(--lp-paper)', 'var(--lp-paper)'],
};

/**
 * The featured desk's tour: once on screen, the screenshots print in 1-bit together, then a cursor
 * plots a path through the windows, drawing a cable behind it, and develops each one it reaches.
 */
export function Tour({ className, children }: { className?: string; children: ReactNode }) {
  const id = useId();
  const isClient = useIsClient();
  const reduced = useReducedMotion();
  const desk = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>({ cables: [], single: false });
  /** the tour has run, its cables stay */
  const [toured, setToured] = useState(false);
  const drawn = toured || layout.single || (isClient && reduced === true);

  // the cables follow the layout
  useEffect(() => {
    const element = desk.current!;
    const observer = new ResizeObserver(() => {
      const stops = route(element);
      const cables: Cable[] = [];
      let single = true;
      for (let i = 1; i < stops.length; i++) {
        cables.push(cable(stops[i - 1], stops[i]));
        if (stops[i].x !== stops[0].x) single = false;
      }
      setLayout({ cables, single });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const element = desk.current!;
    const pointer = cursor.current!;
    const animations: Animation[] = [];
    let disposed = false;
    let started = false;

    const finish = () => {
      disposed = true;
      for (const animation of animations) animation.cancel();
      for (const canvas of element.querySelectorAll('canvas')) develop(canvas);
      pointer.style.visibility = '';
      setToured(true);
    };

    async function play() {
      const stops = route(element);
      const ports = element.querySelectorAll<SVGRectElement>('[data-port]');
      const readout = pointer.querySelector<HTMLElement>('[data-readout]')!;
      let masks = element.querySelectorAll<SVGPathElement>('[data-cable-mask]');
      // the cables render a frame after the first measure
      for (let frame = 0; masks.length !== stops.length - 1 && frame < 30; frame++) {
        await new Promise(requestAnimationFrame);
        masks = element.querySelectorAll<SVGPathElement>('[data-cable-mask]');
      }
      if (masks.length !== stops.length - 1 || stops.every((stop) => stop.x === stops[0].x)) {
        disposed = true;
        return;
      }
      // the prints are made ahead of the plate, one per frame
      const prints: [HTMLCanvasElement, HTMLImageElement][] = [];
      for (const stop of stops) {
        const canvas = stop.element.querySelector('canvas');
        const image = stop.element.querySelector('img');
        if (!canvas || !image) continue;
        await image.decode().catch(() => undefined);
        await new Promise(requestAnimationFrame);
        if (disposed) return;
        prepare(canvas, image);
        prints.push([canvas, image]);
      }

      // the plate: every screenshot prints in 1-bit at once
      setStatus(`printing ${prints.length} sites`);
      for (const [canvas, image] of prints) dither(canvas, image, 0, 16);
      await wait(BEAT + TICK * 2);

      for (let i = 0; i < stops.length && !disposed; i++) {
        const stop = stops[i];
        const mask = masks[Math.max(0, i - 1)];
        pointer.style.offsetPath = `path("${mask.getAttribute('d')}")`;
        if (i === 0) {
          pointer.style.offsetDistance = '0%';
          pointer.style.visibility = 'visible';
          ports[0].style.opacity = '1';
          readout.textContent = coordinates(mask, 0);
          await wait(TICK * 2);
        } else {
          // Draw: the cable follows the cursor from port to port, its readout counting along
          const timing: KeyframeAnimationOptions = {
            duration: BEAT,
            easing: settleCss,
            fill: 'forwards',
          };
          const travel = pointer.animate(
            [{ offsetDistance: '0%' }, { offsetDistance: '100%' }],
            timing,
          );
          animations.push(
            mask.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], timing),
            travel,
          );
          ports[i * 2 - 2].style.opacity = '1';
          const count = () => {
            if (disposed || travel.playState !== 'running') return;
            readout.textContent = coordinates(
              mask,
              travel.effect?.getComputedTiming().progress ?? 0,
            );
            requestAnimationFrame(count);
          };
          requestAnimationFrame(count);
          await wait(BEAT);
          readout.textContent = coordinates(mask, 1);
          ports[i * 2 - 1].style.opacity = '1';
        }
        if (disposed) return;

        // a click: the cursor and the window's title flash inverted, the window develops
        const link = stop.element.closest('a') ?? stop.element.querySelector('a');
        if (link) setStatus(`developing ${address(link.href)}`);
        const title = stop.element.querySelector<HTMLElement>('[data-title]');
        animations.push(pointer.animate({ filter: ['invert(1)', 'invert(1)'] }, TICK));
        if (title) animations.push(title.animate(flash, TICK * 2));
        const canvas = stop.element.querySelector('canvas');
        const image = stop.element.querySelector('img');
        if (canvas && image) dither(canvas, image, 16, 0);
        await wait(TICK * 2);
      }
      if (disposed) return;
      await wait(BEAT);
      const figure = element.closest<HTMLElement>('[data-figure]');
      if (figure?.dataset.status) setStatus(figure.dataset.status);
      finish();
    }

    // the tour plays with the whole desk between the navbar and the status bar; a desk taller than
    // that just shows its cables
    const style = getComputedStyle(document.documentElement);
    const top = parseFloat(style.getPropertyValue('--lp-menu-h'));
    const bottom = parseFloat(style.getPropertyValue('--lp-status-h'));
    const view = new IntersectionObserver(
      ([entry]) => {
        if (!started && entry.isIntersecting) {
          const tall = element.offsetHeight > window.innerHeight - top - bottom;
          if (tall || entry.intersectionRatio >= 0.98) {
            started = true;
            if (tall) finish();
            else void play();
          }
        } else if (started && !disposed && !entry.isIntersecting) finish();
      },
      { rootMargin: `-${top}px 0px -${bottom}px 0px`, threshold: [0, 0.98] },
    );
    view.observe(element);
    return () => {
      view.disconnect();
      if (started && !disposed) finish();
    };
  }, [reduced]);

  return (
    <div ref={desk} className={cn('relative', className)}>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          {layout.cables.map(({ d }, i) => (
            <mask key={i} id={`${id}-${i}`} maskUnits="userSpaceOnUse">
              <path
                data-cable-mask=""
                d={d}
                pathLength={1}
                fill="none"
                stroke="white"
                strokeWidth={4}
                strokeDasharray="1 1"
                strokeDashoffset={drawn ? 0 : 1}
              />
            </mask>
          ))}
        </defs>
        {layout.cables.map(({ d, ports }, i) => (
          <g key={i}>
            <path
              d={d}
              fill="none"
              mask={`url(#${id}-${i})`}
              className="stroke-lp-line-strong [stroke-dasharray:4_4]"
            />
            {ports.map(([x, y], j) => (
              <rect
                key={j}
                data-port=""
                x={x + 0.5}
                y={y + 0.5}
                width={PORT - 1}
                height={PORT - 1}
                opacity={drawn ? 1 : 0}
                shapeRendering="crispEdges"
                className="fill-lp-paper stroke-lp-line-strong"
              />
            ))}
          </g>
        ))}
      </svg>
      {children}
      <div
        ref={cursor}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 z-20 [offset-anchor:0_0] [offset-rotate:0deg]"
      >
        <span
          data-readout=""
          className="absolute top-5 left-3 border border-lp-line-strong bg-lp-paper px-1 font-mono text-[10px] leading-4 whitespace-nowrap text-lp-ink"
        />
        <svg viewBox="0 0 12 19" shapeRendering="crispEdges" className="h-[19px] w-3">
          <path
            className="fill-lp-paper"
            d="M1 1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1H7v3h1v2H6v-2H5v-2H4v1H3v1H2v1H1z"
          />
          <path
            className="fill-lp-ink"
            d="M0 0h1v17H0zM1 1h1v1H1zM2 2h1v1H2zM3 3h1v1H3zM4 4h1v1H4zM5 5h1v1H5zM6 6h1v1H6zM7 7h1v1H7zM8 8h1v1H8zM9 9h1v1H9zM10 10h1v1h-1zM7 11h4v1H7zM1 16h1v-1h1v-1h1v-1h1v1H4v1H3v1H2v1H1zM5 12h1v2H5zM6 14h1v2H6zM7 12h1v2H7zM8 14h1v2H8zM6 16h2v1H6z"
          />
        </svg>
      </div>
    </div>
  );
}
