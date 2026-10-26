'use client';
import { useCallback, useRef, useState } from 'react';
import { copy } from '../../content';
import { report } from '../../lib/status';
import { Window } from '../../ui/window';
import type { Hung } from './board';
import { Convert } from './convert';
import { type DemoId, type LayoutId, TABS, type TabId, type ThemeId } from './data';
import { Desk } from './desk';
import { Dial } from './dial';
import type { Hardware } from './hardware';
import { Monitor } from './monitor';
import type { InkTable, Wiring } from './presets';
import { type SwitchItem, Switches } from './switches';

interface StudioProps {
  table: InkTable;
  /** the variables of the convert window */
  names: string[];
  wirings: Record<ThemeId, { light: Wiring; dark: Wiring }>;
  /** the desk's cables in its first pose, settled on the server */
  hung: Hung;
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
export function Studio({ table, names, wirings, hung, hardware }: StudioProps) {
  const [tab, setTab] = useState<TabId>('layouts');
  const [layout, setLayout] = useState<LayoutId>('docs');
  const [theme, setTheme] = useState<ThemeId>('neutral');
  const [turning, setTurning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<TabId | null>(null);
  const root = useRef<HTMLDivElement>(null);

  function selectTab(next: TabId) {
    setTab(next);
    if (root.current) report(root.current, `tab: ${next}`);
  }

  const selectLayout = useCallback((next: LayoutId) => {
    setLayout(next);
    setTab('layouts');
    if (root.current) report(root.current, `layout: ${next}`);
  }, []);

  function changeTheme(id: ThemeId, dragging: boolean) {
    setTheme(id);
    setTurning(dragging);
    if (root.current) report(root.current, `theme: ${id}`);
  }

  // One grid places every block. From 1024 the desk and the monitor sit side by side over the dial
  // and the variables, read row by row as the markup runs; below it the real UI comes first, then
  // what changes it. The rows are 12px apart, 32 between groups.
  // The desk's column is as wide as leaves the monitor a 3:2 screen as tall as that column (the
  // switches, the gap and the desk's padding, 188px, over a board 0.78 of the column tall):
  // `(100% - 271px) / 2.163` solves it.
  return (
    <div
      ref={root}
      className="grid gap-x-8 gap-y-3 px-(--lp-gutter) lg:grid-cols-[minmax(0,calc((100%_-_271px)/2.163))_minmax(0,1fr)]"
    >
      <Switches
        items={SWITCHES}
        value={tab}
        onChange={(id) => selectTab(id as TabId)}
        onIntent={(id) => setIntent(id as TabId)}
        idPrefix={ID}
        className="max-lg:order-2 lg:col-start-1 lg:row-start-1"
      />
      {/* a desktop's screen beside the desk, a tablet's 4:3, a phone's at a phone's height */}
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
        className="h-[620px] min-w-0 max-lg:order-1 sm:aspect-[4/3] sm:h-auto lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:aspect-auto"
      />
      <Desk
        selected={layout}
        live={tab === 'layouts'}
        busy={busy}
        hung={hung}
        onSelect={selectLayout}
        hardware={hardware}
        className="min-w-0 max-lg:order-5 max-lg:mt-5 lg:col-start-1 lg:row-start-2"
      />
      <Window
        data-dial
        title={`fumadocs-ui/css/${theme}.css`}
        className="mt-5 max-lg:order-3 lg:col-start-1 lg:row-start-3"
      >
        <div className="flex flex-1 flex-col items-center justify-center px-0.5 py-3">
          {/* the dial is drawn 320px wide, a narrower phone gets it a little smaller */}
          <div className="max-[359px]:[zoom:0.88]">
            <Dial table={table} value={theme} onChange={changeTheme} />
          </div>
        </div>
      </Window>
      <Window
        title="--color-fd-*"
        className="mt-5 [--row:14px] max-lg:order-4 lg:col-start-2 lg:row-start-3"
      >
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
