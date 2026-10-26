'use client';
import { memo, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { ShowcaseObject } from '@/lib/showcases';
import { pad } from '../../lib/clock';
import { TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { useIsClient } from '../../lib/use-is-client';
import { Roller } from '../../ui/roller';
import { level, print, show, SiteTile } from '../../ui/site-tile';

/** tiles on phones, the rest are on desktop only */
const PHONE_TILES = 12;
/**
 * the plate prints in over two ticks and rests one, then the head develops the wall in six ticks
 * whatever its rows: one row per tick on both the 5 and the 2 column wall
 */
const PLATE = TICK * 2;
const SWEEP = PLATE + TICK;
const HEAD = TICK * 6;

const sizes = '(min-width: 1280px) 208px, (min-width: 768px) 20vw, 50vw';

interface Row {
  /** bottom edge inside the wall */
  bottom: number;
  /** tiles up to and including this row */
  to: number;
  prints: HTMLCanvasElement[];
}

/** the visible tiles, grouped by row */
function rowsOf(list: HTMLUListElement): Row[] {
  const rows: Row[] = [];
  let index = 0;
  for (const tile of list.children) {
    if (!(tile instanceof HTMLElement) || tile.offsetParent === null) continue;
    const bottom = tile.offsetTop + tile.offsetHeight - list.clientTop;
    let row = rows[rows.length - 1];
    if (row?.bottom !== bottom) {
      row = { bottom, to: index, prints: [] };
      rows.push(row);
    }
    const canvas = tile.querySelector('canvas');
    if (canvas) row.prints.push(canvas);
    row.to = ++index;
  }
  return rows;
}

/**
 * the narrowest title bar (five columns at 768px) fits about 17 characters of the pixel type;
 * longer names end on a word
 */
function fit(name: string): string {
  if (name.length <= 17) return name;
  const end = name.lastIndexOf(' ', 16);
  return `${name.slice(0, end > 0 ? end : 16)}…`;
}

interface TileProps {
  site: Required<ShowcaseObject>;
  index: number;
  /** the print run has started: names leave the title bars at once and roll back in */
  played: boolean;
  /** render the 1-bit print over the screenshot, hidden unless the tile is undeveloped */
  printable: boolean;
  /** developed: colour, striped title bar with the name */
  printed: boolean;
  onPeek: (index: number) => void;
}

const Tile = memo(function Tile({ site, index, played, printable, printed, onPeek }: TileProps) {
  const name = useRef<HTMLSpanElement>(null);
  // Pop: a name printed by the head shows inverted for two ticks
  useLayoutEffect(() => {
    if (!played || !printed) return;
    const animation = name.current!.animate(
      {
        backgroundColor: ['var(--lp-ink)', 'var(--lp-ink)'],
        color: ['var(--lp-paper)', 'var(--lp-paper)'],
      },
      { duration: TICK * 2 },
    );
    return () => animation.cancel();
  }, [played, printed]);

  return (
    <li className={cn(index >= PHONE_TILES && 'max-md:hidden')}>
      <SiteTile
        site={site}
        sizes={sizes}
        name={
          <>
            <span className="sr-only">{site.name}</span>
            <span aria-hidden>
              <Roller
                key={played ? 'print' : 'rest'}
                value={printed ? fit(site.name) : ''}
                step={TICK / 4}
                stagger={TICK / 16}
              />
            </span>
          </>
        }
        nameRef={name}
        printed={printed}
        printable={printable}
        onPointerEnter={() => onPeek(index)}
        onPointerLeave={() => onPeek(-1)}
        onFocus={() => onPeek(index)}
        onBlur={() => onPeek(-1)}
      />
    </li>
  );
});

/**
 * The press: a wall of real sites in colour. When it comes into view, it is printed once in 1-bit
 * and a print head walks down it, developing one row per beat. `children` go under the wall.
 */
export function Press({
  sites,
  children,
}: {
  sites: Required<ShowcaseObject>[];
  children: ReactNode;
}) {
  const isClient = useIsClient();
  const reduced = useReducedMotion();
  const live = isClient && !reduced;
  const grid = useRef<HTMLUListElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const carriage = useRef<HTMLSpanElement>(null);
  /** rest: the finished colour wall, before and after its one print run */
  const [phase, setPhase] = useState<'rest' | 'run' | 'done'>('rest');
  const [developed, setDeveloped] = useState(0);
  /** tiles the run develops, the rest are hidden on phones and stay as they are */
  const [total, setTotal] = useState(sites.length);
  const [peek, setPeek] = useState(-1);
  const running = phase === 'run';
  const printing = live && phase !== 'done';

  // prints are computed once per tile when its screenshot is decoded, again on theme or size
  // changes, a few per frame; the run starts once the wall is 40% on screen with its prints
  useEffect(() => {
    if (!printing) return;
    const list = grid.current!;
    const images = new Map<HTMLCanvasElement, HTMLImageElement>();
    const queue = new Set<HTMLCanvasElement>();
    let frame = 0;
    let pending = 0;
    let disposed = false;
    let onReady: () => void;
    const ready = new Promise<void>((resolve) => (onReady = resolve));

    const flush = () => {
      const end = performance.now() + 4;
      for (const canvas of queue) {
        queue.delete(canvas);
        const image = images.get(canvas)!;
        if (image.complete && canvas.offsetParent !== null) print(canvas, image);
        if (performance.now() > end) break;
      }
      frame = queue.size > 0 ? requestAnimationFrame(flush) : 0;
      if (frame === 0 && pending === 0) onReady();
    };
    const enqueue = (canvas: HTMLCanvasElement) => {
      queue.add(canvas);
      if (frame === 0) frame = requestAnimationFrame(flush);
    };
    const reprint = () => {
      for (const canvas of images.keys()) enqueue(canvas);
    };

    for (const canvas of list.querySelectorAll('canvas')) {
      const image = canvas.parentElement!.querySelector('img');
      if (!image) continue;
      images.set(canvas, image);
      if (canvas.offsetParent === null) continue;
      pending++;
      void image
        .decode()
        .catch(() => undefined)
        .then(() => {
          pending--;
          if (!disposed) enqueue(canvas);
        });
    }

    const resize = new ResizeObserver(reprint);
    resize.observe(list);
    const theme = new MutationObserver(reprint);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const view = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        view.disconnect();
        void Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 3000))]).then(() => {
          if (disposed) return;
          // the prints start blank, so showing them changes nothing until the plate prints in
          for (const canvas of images.keys()) show(canvas, 0);
          setTotal(rowsOf(list).at(-1)?.to ?? 0);
          setPhase((current) => (current === 'rest' ? 'run' : current));
        });
      },
      { threshold: 0.4 },
    );
    view.observe(list);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      theme.disconnect();
      view.disconnect();
    };
  }, [printing]);

  // the run, one loop: the plate prints in (Dither), rests a tick, then the head steps down a row
  // at a time while the row above it dithers into colour; its names roll in as it leaves the row,
  // and the carriage readout crosses each row like a printer's
  useEffect(() => {
    if (!running) return;
    const list = grid.current!;
    const rows = rowsOf(list);
    const count = rows.at(-1)?.to ?? 0;
    const perRow = HEAD / rows.length;
    const travel = list.clientWidth - carriage.current!.offsetWidth;
    const sweep: Keyframe[] = [];
    for (let r = 0; r <= rows.length; r++) {
      sweep.push({ transform: `translateX(${r % 2 === 0 ? 0 : travel}px)` });
    }
    const animations = [
      head.current!.animate(
        [
          { transform: 'translateY(0)' },
          { transform: `translateY(${rows.at(-1)?.bottom ?? 0}px)` },
        ],
        { delay: SWEEP, duration: HEAD, easing: `steps(${rows.length}, start)`, fill: 'both' },
      ),
      carriage.current!.animate(sweep, { delay: SWEEP, duration: HEAD, fill: 'both' }),
    ];
    report(list, `developing ${count} sites`);

    const start = performance.now();
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let done = 0;
    const tick = (now: number) => {
      const t = now - start;
      if (t < SWEEP) {
        const plate = level(t, PLATE);
        for (const row of rows) for (const canvas of row.prints) show(canvas, plate);
      } else {
        const r = Math.floor((t - SWEEP) / perRow);
        if (r < rows.length) {
          const fade = 16 - level(t - SWEEP - r * perRow, perRow);
          for (const canvas of rows[r].prints) show(canvas, fade);
        }
        if (Math.min(r, rows.length) > done) {
          done = Math.min(r, rows.length);
          setDeveloped(rows[done - 1].to);
        }
      }
      if (done < rows.length) raf = requestAnimationFrame(tick);
      // the head leaves two ticks after the last row, in a frame of its own
      else
        timer = setTimeout(() => {
          report(list, `${count} sites developed`);
          setPhase('done');
        }, TICK * 2);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      for (const animation of animations) animation.cancel();
    };
  }, [running]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <ul
          ref={grid}
          className="grid grid-cols-2 gap-px border border-lp-line-strong bg-lp-line-strong md:grid-cols-5"
        >
          {sites.map((site, i) => (
            <Tile
              key={site.url}
              site={site}
              index={i}
              played={live && phase !== 'rest'}
              printable={printing}
              printed={!running || i < developed || i >= total || peek === i}
              onPeek={setPeek}
            />
          ))}
        </ul>
        {running && (
          <div aria-hidden className="pointer-events-none absolute inset-px">
            <div ref={head} className="absolute inset-x-0 top-0">
              {/* across the wall, frame to frame: the sheet's gutters stay clear */}
              <div className="absolute -inset-x-px -top-px border-y border-t-lp-ink border-b-lp-paper" />
              <span
                ref={carriage}
                className="absolute top-0 left-0 flex h-5 -translate-y-1/2 items-center gap-1.5 border border-lp-line-strong bg-lp-paper px-1.5 font-mono text-[11px] whitespace-nowrap text-lp-ink-2"
              >
                developing
                <Roller
                  value={`${pad(developed)}/${pad(total)}`}
                  step={TICK / 8}
                  stagger={TICK / 16}
                  className="text-lp-orange"
                />
              </span>
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
