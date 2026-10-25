'use client';
import { useCallback, useRef, useState } from 'react';
import { report } from '../../lib/status';
import { Window } from '../../ui/window';
import { Convert } from './convert';
import { type LayoutId, SHADCN_NOTE, type ThemeId } from './data';
import type { InkTable, Wiring } from './presets';
import { Desk } from './desk';
import { Dial } from './dial';
import { Monitor } from './monitor';

export interface StudioProps {
  table: InkTable;
  /** the variables of the convert window */
  names: string[];
  wirings: Record<ThemeId, { light: Wiring; dark: Wiring }>;
}

/**
 * One layout and one theme on the live preview. The desk picks the layout and the dial the theme:
 * held under the pointer, clicked, tapped or keyed, a choice stays until the next one.
 */
export function Studio({ table, names, wirings }: StudioProps) {
  const [layout, setLayout] = useState<LayoutId>('docs');
  const [theme, setTheme] = useState<ThemeId>('neutral');
  const [turning, setTurning] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const selectLayout = useCallback((id: LayoutId) => {
    setLayout(id);
    if (root.current) report(root.current, `layout: ${id}`);
  }, []);

  function changeTheme(id: ThemeId, dragging: boolean) {
    setTheme(id);
    setTurning(dragging);
    if (root.current) report(root.current, `theme: ${id}`);
  }

  return (
    <div
      ref={root}
      className="grid gap-8 px-(--lp-gutter) lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]"
    >
      <Desk selected={layout} onSelect={selectLayout} className="lg:col-start-1 lg:row-start-1" />
      <Monitor
        table={table}
        layout={layout}
        theme={theme}
        instant={turning}
        className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
      />
      <Window
        data-dial
        title={`fumadocs-ui/css/${theme}.css`}
        className="lg:col-start-1 lg:row-start-2"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-3">
          <Dial table={table} value={theme} onChange={changeTheme} />
          <p className="text-xs text-lp-ink-2">{SHADCN_NOTE}</p>
        </div>
      </Window>
      <Window title="--color-fd-*" className="[--row:14px] lg:col-span-2">
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
