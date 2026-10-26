'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { copy } from '../../content';
import { TICK } from '../../lib/motion';
import { Scramble } from '../../ui/text';
import { Window } from '../../ui/window';
import {
  type DemoId,
  LAYOUTS,
  type LayoutId,
  SOURCES,
  TABS,
  type TabId,
  THEME_NAMES,
  type ThemeId,
} from './data';
import { Plan } from './plan';
import type { InkTable } from './presets';
import { createStage, type Stage } from './stage';

interface MonitorProps {
  table: InkTable;
  tab: TabId;
  layout: LayoutId;
  theme: ThemeId;
  /** ink a theme without the print, while the dial turns */
  instant: boolean;
  /** a tab the reader is reaching for: its demo loads ahead */
  intent: TabId | null;
  /** the names of the demos' frames */
  titles: Record<DemoId, string>;
  /** the screen is the tabs' panel */
  panelId: string;
  labelledBy: string;
  onBusy: (busy: boolean) => void;
  className?: string;
}

const SPIN = '◒◐◓◑';

/** clack's spinner in the title bar while the next screen is on its way, still for reduced motion */
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

/** the live layout, or a hands-on demo, in the chosen theme */
export function Monitor({
  table,
  tab,
  layout,
  theme,
  instant,
  intent,
  titles,
  panelId,
  labelledBy,
  onBusy,
  className,
}: MonitorProps) {
  const stage = useRef<Stage | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(onBusy);
  useEffect(() => {
    busyRef.current = onBusy;
  });
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const instance = createStage(element, table, titles, (next) => {
        setBusy(next);
        busyRef.current(next);
      });
      stage.current = instance;
      return () => {
        instance.destroy();
        stage.current = null;
      };
    },
    [table, titles],
  );

  useEffect(() => {
    stage.current?.show(tab, layout, theme, instant);
  }, [tab, layout, theme, instant]);

  useEffect(() => {
    if (intent) stage.current?.preload(intent);
  }, [intent]);

  const name = LAYOUTS.find((item) => item.id === layout)!.name;
  const title = tab === 'layouts' ? `fumadocs-ui/layouts/${layout}` : SOURCES[tab];
  const docs = copy.style.tabs[tab];
  const screens = [];
  for (const id of TABS) {
    if (id === 'layouts') continue;
    screens.push(
      <div
        key={id}
        data-screen={id}
        className="lp-dots absolute inset-0 bg-lp-paper"
        style={{ visibility: 'hidden' }}
      />,
    );
  }

  return (
    <Window
      className={className}
      title={<Scramble text={title} speed={14} />}
      actions={
        busy ? (
          <Busy />
        ) : (
          // the box at the end of the bar opens the tab's docs, its hit area 24px around it
          <a
            href={docs.href}
            aria-label={`${docs.label} docs`}
            className="relative flex size-3.5 items-center justify-center bg-lp-paper text-lp-ink transition-none after:absolute after:-inset-[5px] hover:bg-lp-ink hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink"
          >
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        )
      }
    >
      <div
        ref={ref}
        role="tabpanel"
        id={panelId}
        aria-labelledby={labelledBy}
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <div
          data-screen="layouts"
          role="img"
          aria-label={`${name} layout with the ${THEME_NAMES[theme]} theme`}
          className="absolute inset-0"
        >
          <Plan layout={layout} />
          <div data-live className="pointer-events-none absolute inset-0 isolate" />
        </div>
        {screens}
      </div>
    </Window>
  );
}
