'use client';
import { type CSSProperties, memo, type ReactNode, useCallback } from 'react';
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { FigureHeader } from '../../ui/figure';
import { cn } from '@/lib/cn';
import { copy } from '../../content';
import { report } from '../../lib/status';
import { parts, STATUS } from './data';
import { DRAWERS, PAGE } from './camera';
import { Front, PageFace } from './drawers';
import { Plan } from './labels';
import {
  CodeWindow,
  Keys,
  optionsOf,
  type Snippets,
  type Swap,
  type SwapActions,
  type SwapLayer,
} from './swap';
import {
  CalloutBlock,
  CodeSection,
  NavRow,
  SidebarFooter,
  TitleBlock,
  TocBlock,
  TreeItems,
} from './preview';

export interface ColumnProps {
  swap: Swap;
  actions: SwapActions;
  /** the page's code block tabs, and the page they are in */
  code: ReactNode;
  page: ReactNode;
  snippets: Snippets;
}

/**
 * The figure without the pin, for small screens, reduced motion and no JS: the parts with their
 * APIs, the page over the fronts of its drawers like a drawing's plan over its elevation, then the
 * keys and the code. A pick lands at once.
 */
export function Column({ swap, actions, code, page, snippets }: ColumnProps) {
  const { beats } = copy.parts;

  // the status of the beat across the middle of the viewport
  const ref = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            report(element, STATUS[Number((entry.target as HTMLElement).dataset.beat)]);
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    for (const beat of element.querySelectorAll('[data-beat]')) observer.observe(beat);
    return () => observer.disconnect();
  }, []);

  const pick = useCallback(
    (layer: SwapLayer, option: number, from: Element) => {
      actions.pick(layer, option);
      actions.land(layer, option);
      report(from, `${layer}: ${optionsOf(layer)[option].title}`);
    },
    [actions],
  );

  const fronts: ReactNode[] = [];
  for (const layer of DRAWERS) {
    const option = layer === 'core' ? 0 : swap.shown[layer as SwapLayer];
    fronts.push(
      <div
        key={layer}
        className={cn('min-h-14', layer === 'framework' ? 'bg-lp-paper-2' : 'bg-lp-paper')}
      >
        <Front layer={layer} option={option} flat />
      </div>,
    );
  }

  return (
    <div ref={ref} className="flex flex-col gap-14 px-(--lp-gutter) pt-10 pb-16">
      <FigureHeader
        data-beat={0}
        lead={copy.parts.lead}
        title={beats[0].title}
        description={beats[0].description}
      />
      {/* the plan where its labels stay 12px or more, the parts one by one below that */}
      <div className="max-xl:hidden">
        <Plan page={page} />
      </div>
      <Tiles code={code} />
      <Beat index={1}>
        <div className="flex flex-col divide-y divide-lp-ink border border-lp-ink">
          <div
            className="relative overflow-hidden @container"
            style={{ aspectRatio: `${PAGE.width} / ${PAGE.height}` }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left scale-(--k)"
              style={
                {
                  width: PAGE.width,
                  height: PAGE.height,
                  '--k': `tan(atan2(100cqw, ${PAGE.width}px))`,
                } as CSSProperties
              }
            >
              <PageFace option={swap.shown.ui} page={page} animate={swap.swaps > 0} />
            </div>
          </div>
          {fronts}
        </div>
      </Beat>
      <Beat index={2}>
        <Keys picks={swap.picks} onPick={pick} />
        <CodeWindow
          layer={swap.last}
          option={swap.shown[swap.last]}
          snippets={snippets}
          animate={swap.swaps > 0}
          // long lines wrap on a phone instead of running out of the window
          className="[&_pre]:w-full [&_pre]:wrap-anywhere [&_pre]:whitespace-pre-wrap"
        />
      </Beat>
    </div>
  );
}

/** each part as the page renders it, with its name and API; real UI that never re-renders */
const Tiles = memo(function Tiles({ code }: { code: ReactNode }) {
  const pieces: ReactNode[] = [
    <div key="navbar" className="flex bg-fd-card p-2">
      <NavRow />
    </div>,
    <div key="search" className="flex flex-col bg-fd-card p-2">
      <FullSearchTrigger />
    </div>,
    <div key="sidebar" className="bg-fd-card pt-2 text-sm">
      <SidebarFooter />
    </div>,
    <div key="page tree" className="bg-fd-card text-sm">
      <TreeItems />
    </div>,
    <div key="title" className="flex flex-col gap-4 p-4">
      <TitleBlock />
    </div>,
    <div key="callout" className="p-3 *:my-0">
      <CalloutBlock />
    </div>,
    <div key="code block" className="prose p-4 *:first:mt-0">
      <CodeSection code={code} />
    </div>,
    <div key="table of contents" className="flex flex-col p-4">
      <TocBlock />
    </div>,
  ];
  const tiles: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    tiles.push(
      <li key={parts[i].name} className="flex flex-col gap-3">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm">{parts[i].name}</span>
          <code className="font-mono text-xs text-lp-ink-2">{parts[i].api}</code>
        </p>
        <div className="border border-lp-line-strong bg-fd-background text-fd-foreground">
          {pieces[i]}
        </div>
      </li>,
    );
  }

  return (
    <ol aria-label="Parts of the page" className="grid items-start gap-8 sm:grid-cols-2 xl:hidden">
      {tiles}
    </ol>
  );
});

function Beat({ index, children }: { index: number; children: ReactNode }) {
  const beat = copy.parts.beats[index];
  return (
    <section data-beat={index} className="flex max-w-[971px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-3xl leading-[1.05] font-medium tracking-[-0.035em] text-balance">
          {beat.title}
        </h3>
        <p className="max-w-[46ch] text-base leading-relaxed text-pretty text-lp-ink-2">
          {beat.description}
        </p>
      </div>
      {children}
    </section>
  );
}
