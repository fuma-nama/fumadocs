'use client';
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Clipboard } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { TICK } from '../../lib/motion';
import { report, restore, setStatus } from '../../lib/status';
import { useIsClient } from '../../lib/use-is-client';
import { Roller, Scramble } from '../../ui/text';
import { Window } from '../../ui/window';
import type { Module } from './data';

/** the docs pages already prefetched, each once */
const prefetched = new Set<string>();

/**
 * the tick of cell `i`'s inverted frame after power-on: the wave runs corner to corner on wide
 * boards, row by row under three columns
 */
function wave(i: number, cols: number): number {
  return cols < 3 ? 2 + (i % cols) : 4 + (i % cols) + Math.floor(i / cols);
}

export function Board({
  header,
  modules,
  mechanisms,
  loaded,
  children,
}: {
  header: ReactNode;
  modules: Module[];
  /** each module's `<Stage>` by its title, its `--bt-dur` sets how long the cell stays active */
  mechanisms: Record<string, ReactNode>;
  /** the figure's line once the board is up */
  loaded: string;
  /** the marquee row under the board */
  children: ReactNode;
}) {
  // `null` until hydrated, the server can't know the preference
  const prefersReduced = useReducedMotion();
  const reduced = useIsClient() ? prefersReduced : null;
  const all = (1 << modules.length) - 1;
  // bit i: cell i powered on; `null` renders every cell on (server, reduced motion)
  const [powered, setPowered] = useState<number | null>(null);
  // `null` on the server: the board runs until it knows it is off screen
  const [visible, setVisible] = useState<boolean | null>(null);
  // the board's columns, read from its CSS as it powers up
  const [cols, setCols] = useState<number | null>(null);
  const [waveDone, setWaveDone] = useState(false);
  // wide boards scan on a timer once the wave is done, stacked ones follow the cell in the
  // middle of the viewport
  const stacked = cols !== null && cols < 3;
  const scanning = reduced === true || waveDone || (stacked && powered !== 0);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? (scanning ? active : null);
  const boardElement = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const search = useSearchContext();

  // a link's page is prefetched once a mouse moves onto it, never as it scrolls past: that parsed
  // every page's payload mid-scroll, and content scrolling under a still pointer doesn't move it
  function prefetch(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || (event.movementX === 0 && event.movementY === 0)) return;
    const href = (event.target as Element).closest('a')?.getAttribute('href');
    if (!href?.startsWith('/') || prefetched.has(href)) return;
    prefetched.add(href);
    router.prefetch(href);
  }

  const rootRef = useCallback((root: HTMLDivElement | null) => {
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const boardRef = useCallback(
    (board: HTMLDivElement | null) => {
      boardElement.current = board;
      if (!board || reduced !== false) return;
      const columns = Number(getComputedStyle(board).getPropertyValue('--cols'));
      const isStacked = columns < 3;
      setPowered(0);
      setCols(columns);
      let timer = 0;
      const power = new IntersectionObserver(
        (entries) => {
          let bits = 0;
          for (const entry of entries) {
            const passed = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
            if (!entry.isIntersecting && !passed) continue;
            power.unobserve(entry.target);
            const i = (entry.target as HTMLElement).dataset.i;
            bits |= i === undefined ? all : 1 << Number(i);
          }
          if (bits === 0) return;
          setPowered((prev) => (prev ?? 0) | bits);
          if (isStacked) return;
          // a wide board powers every cell at once; the wave ends on the last cell's inverted
          // frame, then one more tick
          report(board, 'powering on');
          const end = (wave(modules.length - 1, columns) + 2) * TICK;
          timer = window.setTimeout(() => {
            report(board, loaded);
            setWaveDone(true);
          }, end);
        },
        // the wide board waits until it fills the view, stacked cells boot as they arrive
        { rootMargin: isStacked ? '0px 0px -15% 0px' : '0px 0px -45% 0px' },
      );
      const middle = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.i));
          }
        },
        { rootMargin: '-45% 0px -45% 0px' },
      );
      if (isStacked) {
        for (const cell of board.querySelectorAll('[data-i]')) {
          power.observe(cell);
          middle.observe(cell);
        }
      } else {
        power.observe(board);
      }
      return () => {
        clearTimeout(timer);
        power.disconnect();
        middle.disconnect();
      };
    },
    [reduced, all, loaded, modules.length],
  );

  useEffect(() => {
    const stage = boardElement.current?.querySelector(`[data-i="${active}"] .bt-stage`);
    if (!stage || !scanning || stacked || !visible || reduced !== false || hovered !== null) return;
    // the active cell plays one loop of its mechanism
    const loop = parseFloat(getComputedStyle(stage).getPropertyValue('--bt-dur'));
    const timer = setTimeout(() => setActive((i) => (i + 1) % modules.length), loop);
    return () => clearTimeout(timer);
  }, [scanning, stacked, visible, reduced, hovered, active, modules.length]);

  function enter(i: number) {
    setHovered(i);
    // the scan carries on from the cell the reader looked at
    setActive(i);
    setStatus(`inspecting ${modules[i].pkg}`);
  }

  function leave() {
    setHovered(null);
    restore();
  }

  const cells = [];
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    const on = powered === null || (powered & (1 << i)) !== 0;
    // the tick of the cell's inverted frame while it boots, its readout decodes a tick later
    const at = powered !== null && on && cols !== null ? wave(i, cols) * TICK : undefined;
    const readout = (text: string) =>
      at === undefined ? text : <Scramble text={text} delay={at + TICK} />;
    const props = {
      'data-i': i,
      'data-on': on ? '' : undefined,
      'data-active': i === shown ? '' : undefined,
      style: at === undefined ? undefined : ({ '--bt-at': `${at}ms` } as CSSProperties),
      className:
        'bt-cell group relative flex flex-col p-(--lp-gutter) text-start text-lp-ink transition-none',
      onPointerEnter: () => enter(i),
      onPointerLeave: leave,
      onFocus: () => enter(i),
      onBlur: leave,
    };
    const content = (
      <>
        {/* as wide as the mechanism, so the hotkeys end on its right edge */}
        <span className="flex max-w-(--bt-stage) items-start justify-between gap-4">
          <span className="bt-num -ms-[3px] px-[3px] font-pixel text-[28px] leading-none text-lp-orange group-data-active:bg-lp-yellow group-data-active:text-[#121210]">
            {module.title}
          </span>
          {!module.href && (
            <span className="flex gap-1 font-pixel text-xs max-md:hidden">
              {search.hotKey.map((key, k) => (
                <kbd key={k} className="border border-current px-1.5 leading-5">
                  {key.display}
                </kbd>
              ))}
            </span>
          )}
        </span>
        {/* the command takes the package's place where the install window is hidden */}
        <span className="mt-1.5 font-mono text-xs text-lp-ink-2 group-hover:text-lp-paper/60 group-focus-visible:text-lp-paper/60">
          <span className="lg:hidden">{readout(module.install)}</span>
          <span className="max-lg:hidden">{readout(module.pkg)}</span>
        </span>
        <span className="mt-4 block">{mechanisms[module.title]}</span>
        <span className="mt-auto pt-4 text-sm leading-snug text-pretty text-lp-ink-2 group-hover:text-lp-paper/60 group-focus-visible:text-lp-paper/60">
          {module.line}
        </span>
      </>
    );
    cells.push(
      module.href ? (
        <Link key={module.title} href={module.href} prefetch={false} {...props}>
          {content}
        </Link>
      ) : (
        <button
          key={module.title}
          type="button"
          onClick={() => search.setOpenSearch(true)}
          {...props}
        >
          {content}
        </button>
      ),
    );
  }

  const seams = [];
  for (let k = 0; k < modules.length; k++) {
    const style = { gridRowStart: k + 1, '--k': k } as CSSProperties;
    seams.push(<i key={`h${k}`} aria-hidden className="bt-seam-h" style={style} />);
  }
  for (let k = 1; k < 4; k++) {
    const style = { gridColumnStart: k + 1, '--k': k } as CSSProperties;
    seams.push(<i key={`v${k}`} aria-hidden className="bt-seam-v" style={style} />);
  }

  return (
    <div
      ref={rootRef}
      data-run={visible === null ? undefined : visible ? 'on' : 'off'}
      onPointerMove={prefetch}
      className="flex flex-col [--bt-stage:288px] [--cols:1] sm:[--cols:2] lg:[--cols:3] xl:[--cols:4]"
    >
      <div className="flex flex-col gap-10 p-(--lp-gutter) pt-16 pb-12 lg:flex-row lg:items-end lg:justify-between">
        {header}
        <Install command={modules[shown ?? active].install} />
      </div>
      <div
        ref={boardRef}
        data-power={powered === null ? undefined : powered === 0 ? 'off' : 'on'}
        className="bt-board relative grid"
      >
        {cells}
        {seams}
      </div>
      {children}
    </div>
  );
}

function Install({ command }: { command: string }) {
  const [copied, onCopy] = useCopyButton(() => navigator.clipboard.writeText(command));

  return (
    // below 1024 each cell shows its own command: the window would sit screens above most cells
    <Window title="install" className="w-[420px] shrink-0 max-lg:hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 font-mono text-[13px]">
        <span aria-hidden className="text-lp-ink-2">
          $
        </span>
        <Roller value={command} step={24} stagger={6} className="min-w-0 flex-1 overflow-clip" />
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? 'Copied' : `Copy "${command}"`}
          className="flex size-6 shrink-0 items-center justify-center border border-lp-line-strong hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
        </button>
      </div>
    </Window>
  );
}
