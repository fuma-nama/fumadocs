'use client';
import { type RefObject, useCallback, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { copy } from '../../content';
import { TICK } from '../../lib/motion';
import { Scramble } from '../../ui/text';
import { Window } from '../../ui/window';
import { DEMOS, LAYOUTS, type LayoutId, TABS, type TabId, THEME_NAMES, type ThemeId } from './data';
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
  /** the next screen is on its way */
  busy: boolean;
  stageRef: RefObject<Stage | null>;
  /** the screen is the tabs' panel */
  panelId: string;
  labelledBy: string;
  onBusy: (busy: boolean) => void;
  className?: string;
}

const SPIN = '◒◐◓◑';

/** clack's spinner in the title bar while the next screen is on its way, still for reduced motion */
function spin(span: HTMLSpanElement | null) {
  if (!span || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frame = 0;
  const timer = window.setInterval(() => {
    span.textContent = SPIN[++frame % SPIN.length];
  }, TICK);
  return () => clearInterval(timer);
}

/** the live layout, or a hands-on demo, in the chosen theme */
export function Monitor({
  table,
  tab,
  layout,
  theme,
  instant,
  busy,
  stageRef,
  panelId,
  labelledBy,
  onBusy,
  className,
}: MonitorProps) {
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const instance = createStage(element, table, onBusy);
      stageRef.current = instance;
      return () => {
        instance.destroy();
        stageRef.current = null;
      };
    },
    [table, onBusy, stageRef],
  );

  useEffect(() => {
    stageRef.current?.show(tab, layout, theme, instant);
  }, [stageRef, tab, layout, theme, instant]);

  const name = LAYOUTS.find((item) => item.id === layout)!.name;
  const title = tab === 'layouts' ? `fumadocs-ui/layouts/${layout}` : DEMOS[tab].source;
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
          <span
            ref={spin}
            aria-hidden
            className="relative flex size-3.5 items-center justify-center bg-lp-paper font-mono text-xs leading-none"
          >
            {SPIN[0]}
          </span>
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
