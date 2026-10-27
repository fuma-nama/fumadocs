'use client';
import { useCallback, useRef, useState } from 'react';
import { report } from '../../lib/status';
import { Window } from '../../ui/window';
import { Convert } from './convert';
import { FIRST, type LayoutId, type TabId, type ThemeId } from './data';
import { Desk } from './desk';
import { Dial } from './dial';
import type { Frames } from './frames';
import type { Hardware } from './hardware';
import { Monitor } from './monitor';
import type { InkTable, Wiring } from './presets';
import type { Hung } from './scene';
import { Switches } from './switches';

interface StageProps {
  table: InkTable;
  names: string[];
  wirings: Record<ThemeId, { light: Wiring; dark: Wiring }>;
  hung: Hung;
  hardware: Hardware;
}

export function Stage({ table, names, wirings, hung, hardware }: StageProps) {
  const [tab, setTab] = useState<TabId>('layouts');
  const [layout, setLayout] = useState<LayoutId>(FIRST);
  const [theme, setTheme] = useState<ThemeId>('neutral');
  const [turning, setTurning] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const frames = useRef<Frames | null>(null);

  function selectTab(next: TabId) {
    setTab(next);
    if (root.current) report(root.current, `tab: ${next}`);
  }

  const preload = useCallback((id: TabId) => frames.current?.preload(id), []);

  const selectLayout = useCallback((next: LayoutId) => {
    setLayout(next);
    setTab('layouts');
    if (root.current) report(root.current, `layout: ${next}`);
  }, []);

  const changeTheme = useCallback((id: ThemeId, dragging: boolean) => {
    setTheme(id);
    setTurning(dragging);
    if (root.current) report(root.current, `theme: ${id}`);
  }, []);

  // From 1024 the desk and the monitor sit side by side over the dial and the variables; below it
  // the real UI comes first. The desk's column leaves the monitor a 3:2 screen as tall as it: the
  // switches, the gap and the desk's padding (188px) over a board 0.78 of the column tall.
  return (
    <div
      ref={root}
      className="grid gap-x-8 gap-y-3 px-(--lp-gutter) lg:grid-cols-[minmax(0,calc((100%_-_271px)/2.163))_minmax(0,1fr)]"
    >
      <Switches
        value={tab}
        onChange={selectTab}
        onIntent={preload}
        className="max-lg:order-2 lg:col-start-1 lg:row-start-1"
      />
      {/* a desktop's screen beside the desk, a tablet's 4:3, a phone's at a phone's height */}
      <Monitor
        table={table}
        tab={tab}
        layout={layout}
        theme={theme}
        instant={turning}
        busy={busy}
        framesRef={frames}
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
        <Convert names={names} wiring={wirings[theme]} preset={theme} />
      </Window>
    </div>
  );
}
