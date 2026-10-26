'use client';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { Check, Clipboard } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { TICK } from '../../lib/motion';
import { report, setStatus } from '../../lib/status';
import { useIsClient } from '../../lib/use-is-client';
import { Roller } from '../../ui/roller';
import { Scramble } from '../../ui/text';
import { Window } from '../../ui/window';
import type { ModuleInfo } from './modules';

export interface Module extends ModuleInfo {
  /** a `<Stage>`, its `--bt-dur` sets how long the cell stays active */
  mechanism: ReactNode;
}

const LOADED = '12 integrations loaded';

/** the board's columns and the delay before its first cell, read from its CSS */
interface Layout {
  cols: number;
  lead: number;
  /** under three columns the cells boot as they scroll in, the wave runs row by row */
  stacked: boolean;
}

/** diagonal of a cell: the wave runs corner to corner on wide boards, row by row when stacked */
function diagonal(i: number, { cols, stacked }: Layout) {
  return stacked ? i % cols : (i % cols) + Math.floor(i / cols);
}

export function Board({
  header,
  modules,
  children,
}: {
  header: ReactNode;
  modules: Module[];
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
  const [layout, setLayout] = useState<Layout | null>(null);
  const [waveDone, setWaveDone] = useState(false);
  // wide boards scan on a timer once the wave is done, stacked ones follow the cell in the
  // middle of the viewport
  const stacked = layout !== null && layout.stacked;
  const scanning = reduced === true || waveDone || (stacked && powered !== 0);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? (scanning ? active : null);
  const boardElement = useRef<HTMLDivElement | null>(null);

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
      setPowered(0);
      const cells = board.querySelectorAll<HTMLElement>('[data-i]');
      const style = getComputedStyle(board);
      const cols = Number(style.getPropertyValue('--cols'));
      const isStacked = cols < 3;
      setLayout({
        cols,
        lead: parseFloat(style.getPropertyValue('--bt-lead')),
        stacked: isStacked,
      });
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
          if (bits !== 0) setPowered((prev) => (prev ?? 0) | bits);
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
        for (const cell of cells) {
          power.observe(cell);
          middle.observe(cell);
        }
      } else {
        power.observe(board);
      }
      return () => {
        power.disconnect();
        middle.disconnect();
      };
    },
    [reduced, all],
  );

  useEffect(() => {
    const board = boardElement.current;
    if (!board || layout === null || layout.stacked || powered !== all) return;
    report(board, 'powering on');
    // the last cell's inverted frame, then one more tick
    const wave = layout.lead + (diagonal(modules.length - 1, layout) + 2) * TICK;
    const timer = setTimeout(() => {
      report(board, LOADED);
      setWaveDone(true);
    }, wave);
    return () => clearTimeout(timer);
  }, [powered, all, layout, modules.length]);

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
    setStatus(LOADED);
  }

  const cells = [];
  for (let i = 0; i < modules.length; i++) {
    const on = powered === null || (powered & (1 << i)) !== 0;
    cells.push(
      <Cell
        key={modules[i].n}
        module={modules[i]}
        index={i}
        on={on}
        // the readout decodes after the cell's inverted frame
        boot={
          powered !== null && on && layout !== null
            ? layout.lead + (diagonal(i, layout) + 1) * TICK
            : undefined
        }
        active={i === shown}
        onEnter={() => enter(i)}
        onLeave={leave}
      />,
    );
  }

  const seams = [];
  for (let k = 0; k < modules.length; k++) {
    seams.push(
      <i
        key={`h${k}`}
        aria-hidden
        className="bt-seam-h"
        style={{ gridRowStart: k + 1, '--k': k } as CSSProperties}
      />,
    );
  }
  for (let k = 1; k < 4; k++) {
    seams.push(
      <i
        key={`v${k}`}
        aria-hidden
        className="bt-seam-v"
        style={{ gridColumnStart: k + 1, '--k': k } as CSSProperties}
      />,
    );
  }

  return (
    <div
      ref={rootRef}
      data-run={visible === null ? undefined : visible ? 'on' : 'off'}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-10 p-(--lp-gutter) pt-16 pb-12 lg:flex-row lg:items-end lg:justify-between">
        {header}
        <Install command={modules[shown ?? active].install} />
      </div>
      <div
        ref={boardRef}
        data-power={powered === null ? undefined : powered === 0 ? 'off' : 'on'}
        className="bt-board relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
    <Window title="install" className="w-full shrink-0 lg:w-[420px]">
      {/* the longest command fits a 320px screen without the prompt, a size down */}
      <div className="flex items-center gap-3 px-3 py-2.5 font-mono text-[13px] max-[344px]:text-[11.5px]">
        <span aria-hidden className="text-lp-ink-2 max-[364px]:hidden">
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

interface CellProps {
  module: Module;
  index: number;
  on: boolean;
  /** ms after power-on when the readout decodes, while the cell boots */
  boot?: number;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

function Cell({ module, index, on, boot, active, onEnter, onLeave }: CellProps) {
  const { setOpenSearch, hotKey } = useSearchContext();
  const props = {
    'data-i': index,
    'data-on': on ? '' : undefined,
    'data-active': active ? '' : undefined,
    style: { '--i': index } as CSSProperties,
    className:
      'bt-cell group relative flex flex-col p-(--lp-gutter) text-start text-lp-ink transition-none',
    onPointerEnter: onEnter,
    onPointerLeave: onLeave,
    onFocus: onEnter,
    onBlur: onLeave,
  };
  const content = (
    <>
      {/* as wide as the mechanism, so the hotkeys end on its right edge */}
      <span className="flex max-w-(--bt-stage) items-start justify-between gap-4">
        <span className="flex flex-col items-start gap-1.5">
          <span className="bt-num -ms-[3px] px-[3px] font-pixel text-[28px] leading-none text-lp-orange">
            {module.title}
          </span>
          <span className="font-mono text-xs text-lp-ink-2 group-hover:text-lp-paper/60 group-focus-visible:text-lp-paper/60">
            {boot === undefined ? module.pkg : <Scramble text={module.pkg} delay={boot} />}
          </span>
        </span>
        {!module.href && (
          <span className="flex gap-1 font-pixel text-xs max-md:hidden">
            {hotKey.map((key, i) => (
              <kbd key={i} className="border border-current px-1.5 leading-5">
                {key.display}
              </kbd>
            ))}
          </span>
        )}
      </span>
      <span className="mt-4 block">{module.mechanism}</span>
      <span className="mt-auto pt-4 text-sm leading-snug text-pretty text-lp-ink-2 group-hover:text-lp-paper/60 group-focus-visible:text-lp-paper/60">
        {module.line}
      </span>
    </>
  );

  if (module.href) {
    return (
      <Link href={module.href} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => setOpenSearch(true)} {...props}>
      {content}
    </button>
  );
}
