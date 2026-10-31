'use client';
import { useCallback, useRef, useState } from 'react';
import { report } from '../../lib/status';
import { Window } from '../../ui/window';
import { FIRST, type LayoutId, type TabId, type ThemeId } from './data';
import { Desk } from './desk';
import { Dial } from './dial';
import type { Hardware } from './hardware';
import { Monitor } from './monitor';
import type { InkTable } from './presets';
import type { Hung } from './scene';

interface StageProps {
  table: InkTable;
  hung: Hung;
  hardware: Hardware;
}

export function Stage({ table, hung, hardware }: StageProps) {
  const [tab, setTab] = useState<TabId>('layouts');
  const [layout, setLayout] = useState<LayoutId>(FIRST);
  const [theme, setTheme] = useState<ThemeId>('neutral');
  const [instant, setInstant] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const changeTheme = useCallback((id: ThemeId, now: boolean) => {
    setTheme(id);
    setInstant(now);
    if (root.current) report(root.current, `theme: ${id}`);
  }, []);

  // From 1280px the browser takes two thirds of the row at a 4:3 screen, tall enough that the
  // pickers beside it, a third and its height, hold the dial at its own height and the layouts at
  // theirs. Under it they stand side by side, each its own height; on a phone everything stacks.
  // Their titles never widen them.
  return (
    <div
      ref={root}
      className="grid gap-(--lp-gutter) px-(--lp-gutter) xl:grid-cols-[minmax(0,2fr)_minmax(auto,1fr)] xl:gap-3"
    >
      <Monitor
        table={table}
        tab={tab}
        layout={layout}
        theme={theme}
        instant={instant}
        busy={busy}
        onTab={selectTab}
        onBusy={setBusy}
        className="min-w-0 xl:self-start"
      />
      <div className="grid min-w-0 gap-(--lp-gutter) sm:grid-cols-[minmax(0,3fr)_minmax(auto,1fr)] sm:items-start xl:grid-cols-1 xl:grid-rows-[minmax(0,1fr)_auto] xl:items-stretch xl:gap-3">
        <Desk
          selected={layout}
          live={tab === 'layouts'}
          busy={busy}
          hung={hung}
          onSelect={selectLayout}
          hardware={hardware}
          className="[contain:inline-size] xl:min-h-0"
        />
        <Window
          title={`fumadocs-ui/css/${theme}.css`}
          className="[&>:first-child]:[contain:inline-size]"
        >
          <div className="py-3">
            <Dial table={table} value={theme} onChange={changeTheme} />
          </div>
        </Window>
      </div>
    </div>
  );
}
