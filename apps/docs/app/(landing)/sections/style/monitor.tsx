'use client';
import { type RefObject, useCallback, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { copy } from '../../content';
import { TICK } from '../../lib/motion';
import { Scramble } from '../../ui/text';
import { Window } from '../../ui/window';
import { DEMOS, LAYOUTS, type LayoutId, type TabId, THEME_NAMES, type ThemeId } from './data';
import { createFrames, type Frames } from './frames';
import { Plan } from './plan';
import type { InkTable } from './presets';

interface MonitorProps {
  table: InkTable;
  tab: TabId;
  layout: LayoutId;
  theme: ThemeId;
  /** ink a theme without the print, while the dial turns */
  instant: boolean;
  busy: boolean;
  framesRef: RefObject<Frames | null>;
  onBusy: (busy: boolean) => void;
  className: string;
}

const SPIN = '◒◐◓◑';

/** clack's spinner while the next screen is on its way, still for reduced motion */
function spin(span: HTMLSpanElement | null) {
  if (!span || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frame = 0;
  const timer = window.setInterval(() => {
    span.textContent = SPIN[++frame % SPIN.length];
  }, TICK);
  return () => clearInterval(timer);
}

export function Monitor({
  table,
  tab,
  layout,
  theme,
  instant,
  busy,
  framesRef,
  onBusy,
  className,
}: MonitorProps) {
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const instance = createFrames(element, table, onBusy);
      framesRef.current = instance;
      return () => {
        instance.destroy();
        framesRef.current = null;
      };
    },
    [table, onBusy, framesRef],
  );

  useEffect(() => {
    framesRef.current?.show(tab, layout, theme, instant);
  }, [framesRef, tab, layout, theme, instant]);

  const name = LAYOUTS.find((item) => item.id === layout)!.name;
  const docs = copy.style.tabs[tab];
  const screens = [];
  for (const id in DEMOS) {
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
      title={
        <Scramble
          text={tab === 'layouts' ? `fumadocs-ui/layouts/${layout}` : DEMOS[tab].source}
          speed={14}
        />
      }
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
        id="style-panel"
        aria-labelledby={`style-tab-${tab}`}
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
