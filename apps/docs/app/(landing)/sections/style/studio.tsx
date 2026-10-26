'use client';
import { useCallback, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { copy } from '../../content';
import { report } from '../../lib/status';
import { Window } from '../../ui/window';
import type { Hung } from './board';
import { Convert } from './convert';
import { type DemoId, type LayoutId, SHADCN_NOTE, TABS, type TabId, type ThemeId } from './data';
import { Desk } from './desk';
import { Dial } from './dial';
import type { Hardware } from './hardware';
import { Monitor } from './monitor';
import type { InkTable, Wiring } from './presets';
import { needleTransform, Strip } from './strip';
import { type SwitchItem, Switches } from './switches';

interface StudioProps {
  table: InkTable;
  /** the variables of the convert window */
  names: string[];
  wirings: Record<ThemeId, { light: Wiring; dark: Wiring }>;
  /** the desk's cables in its first pose, settled on the server */
  hung: Hung;
  /** how taut the first chosen cable hangs, the gauge's first reading */
  tension: number;
  /** the desk's fixed hardware, drawn on the server */
  hardware: Hardware;
}

const SWITCHES: SwitchItem[] = [];
for (const id of TABS) SWITCHES.push({ id, label: copy.style.tabs[id].label });

/** the accessible names of the demos' frames */
const TITLES: Record<DemoId, string> = {
  story: 'Story of a Callout, with its controls',
  openapi: 'OpenAPI page of an operation, with its playground',
  graphql: 'GraphQL page of a query, with its playground',
  asyncapi: 'AsyncAPI page of a channel, with its playground',
};

/** the id prefix of the tabs and their panel */
const ID = 'style';

/**
 * The desk and its monitor over the theme's dial and variables. The switches choose what the
 * monitor shows: the layout the desk patches in, or a hands-on demo. The dial inks every one.
 */
export function Studio({ table, names, wirings, hung, tension: initial, hardware }: StudioProps) {
  const [tab, setTab] = useState<TabId>('layouts');
  const [layout, setLayout] = useState<LayoutId>('docs');
  const [theme, setTheme] = useState<ThemeId>('neutral');
  const [turning, setTurning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [swaps, setSwaps] = useState(0);
  const [intent, setIntent] = useState<TabId | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const needle = useRef<SVGGElement>(null);
  /** the layout patched in, for the swap counter */
  const patched = useRef(layout);

  function selectTab(next: TabId) {
    setTab(next);
    if (root.current) report(root.current, `tab: ${next}`);
  }

  const selectLayout = useCallback((next: LayoutId) => {
    if (patched.current !== next) {
      patched.current = next;
      setSwaps((n) => n + 1);
    }
    setLayout(next);
    setTab('layouts');
    if (root.current) report(root.current, `layout: ${next}`);
  }, []);

  const tension = useCallback((value: number) => {
    needle.current?.setAttribute('transform', needleTransform(value));
  }, []);

  function changeTheme(id: ThemeId, dragging: boolean) {
    setTheme(id);
    setTurning(dragging);
    if (root.current) report(root.current, `theme: ${id}`);
  }

  // every tab's line in one cell, the open one shown: the cell keeps the tallest, nothing below moves
  const lines = [];
  for (const id of TABS) {
    const item = copy.style.tabs[id];
    lines.push(
      <p
        key={id}
        aria-hidden={id !== tab}
        className={cn('col-start-1 row-start-1 text-sm text-lp-ink-2', id !== tab && 'invisible')}
      >
        {item.line}
        <a
          href={item.href}
          aria-label={`${item.label} docs`}
          tabIndex={id === tab ? undefined : -1}
          className="ms-1.5 inline-flex size-5 translate-y-[5px] items-center justify-center text-lp-ink transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink"
        >
          <ArrowUpRight className="size-3.5" />
        </a>
      </p>,
    );
  }

  // one grid for both rows, so the dial and the variables share the desk's and the monitor's columns
  return (
    <div
      ref={root}
      className="grid gap-8 px-(--lp-gutter) lg:grid-cols-[minmax(0,41fr)_minmax(0,59fr)]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Switches
          items={SWITCHES}
          value={tab}
          onChange={(id) => selectTab(id as TabId)}
          onIntent={(id) => setIntent(id as TabId)}
          idPrefix={ID}
        />
        <div className="-mt-1.5 grid leading-[30px]">{lines}</div>
        <Desk
          selected={layout}
          live={tab === 'layouts'}
          busy={busy}
          hung={hung}
          onSelect={selectLayout}
          onTension={tension}
          swaps={swaps}
          hardware={hardware}
        />
      </div>
      {/* the monitor over its strip: a desktop's screen beside the desk, a tablet's under it, a phone's on a phone */}
      <div className="flex min-w-0 flex-col gap-3">
        <Monitor
          table={table}
          tab={tab}
          layout={layout}
          theme={theme}
          instant={turning}
          intent={intent}
          titles={TITLES}
          panelId={`${ID}-panel`}
          labelledBy={`${ID}-tab-${tab}`}
          onBusy={setBusy}
          className="h-[620px] sm:aspect-[4/3] sm:h-auto lg:aspect-auto lg:flex-1"
        />
        <Strip needle={needle} tension={initial} swaps={swaps} stripboard={hardware.stripboard} />
      </div>
      <Window data-dial title={`fumadocs-ui/css/${theme}.css`}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-0.5 py-3 sm:px-2">
          {/* the dial is drawn 320px wide, a narrower phone gets it a little smaller */}
          <div className="max-[359px]:[zoom:0.88]">
            <Dial table={table} value={theme} onChange={changeTheme} />
          </div>
          <p className="text-xs text-lp-ink-2">{SHADCN_NOTE}</p>
        </div>
      </Window>
      <Window title="--color-fd-*" className="[--row:14px]">
        <Convert
          names={names}
          light={wirings[theme].light}
          dark={wirings[theme].dark}
          preset={theme}
        />
      </Window>
    </div>
  );
}
