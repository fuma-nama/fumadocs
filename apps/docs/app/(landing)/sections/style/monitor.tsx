'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { TICK } from '../../lib/motion';
import { Scramble } from '../../ui/text';
import { Window } from '../../ui/window';
import { LAYOUTS, type LayoutId, THEME_NAMES, type ThemeId } from './data';
import { Plan } from './plan';
import type { InkTable } from './presets';
import { createScreen, type Screen } from './screen';

interface MonitorProps {
  table: InkTable;
  layout: LayoutId;
  theme: ThemeId;
  /** ink a theme without the print, while the dial turns */
  instant: boolean;
  className?: string;
}

const SPIN = '◒◐◓◑';

/** clack's spinner in the title bar while the next layout is on its way, still for reduced motion */
function Busy() {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setFrame((n) => n + 1), TICK);
    return () => clearInterval(timer);
  }, [reduced]);
  return (
    <span
      aria-hidden
      className="relative flex size-3.5 items-center justify-center bg-lp-paper font-mono text-xs leading-none"
    >
      {SPIN[frame % SPIN.length]}
    </span>
  );
}

/** the live layout in the chosen theme */
export function Monitor({ table, layout, theme, instant, className }: MonitorProps) {
  const screen = useRef<Screen | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const instance = createScreen(element, table, (next) => setLoading(next !== null));
      screen.current = instance;
      return () => {
        instance.destroy();
        screen.current = null;
      };
    },
    [table],
  );

  useEffect(() => {
    screen.current?.show(layout, theme, instant);
  }, [layout, theme, instant]);

  const name = LAYOUTS.find((item) => item.id === layout)!.name;
  return (
    <Window
      className={className}
      title={<Scramble text={`fumadocs-ui/layouts/${layout}`} speed={14} />}
      actions={loading ? <Busy /> : undefined}
    >
      <div
        ref={ref}
        role="img"
        aria-label={`${name} layout with the ${THEME_NAMES[theme]} theme`}
        className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:flex-1"
      >
        <Plan layout={layout} />
        <div data-live className="pointer-events-none absolute inset-0 isolate" />
      </div>
    </Window>
  );
}
