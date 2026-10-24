'use client';
import { useCallback, useState } from 'react';
import { setStatus } from '../../lib/status';
import { Window } from '../../ui/window';
import { Convert } from './convert';
import type { LayoutId, ThemeId } from './data';
import { Dial } from './dial';
import { Desk } from './layouts';
import { Monitor } from './monitor';
import type { InkTable, Wiring } from './presets';

export interface StudioProps {
  table: InkTable;
  /** the variables of the convert window */
  names: string[];
  wirings: Record<ThemeId, { light: Wiring; dark: Wiring }>;
}

/**
 * The layouts and the themes on one live preview: hover or focus previews one, a click (or Enter)
 * pins it, leaving shows the pinned ones again.
 */
export function Studio({ table, names, wirings }: StudioProps) {
  const [layout, setLayout] = useState<LayoutId>('docs');
  const [hoverLayout, setHoverLayout] = useState<LayoutId | null>(null);
  const [theme, setTheme] = useState<ThemeId>('neutral');
  const [hoverTheme, setHoverTheme] = useState<ThemeId | null>(null);
  const shownLayout = hoverLayout ?? layout;
  const shownTheme = hoverTheme ?? theme;

  // the desk keeps still while a theme changes: its handlers stay the same
  const previewLayout = useCallback(
    (id: LayoutId | null) => {
      setHoverLayout(id);
      setStatus(`layout: ${id ?? layout}`);
    },
    [layout],
  );

  const pinLayout = useCallback((id: LayoutId) => {
    setLayout(id);
    setStatus(`layout: ${id}`);
  }, []);

  function previewTheme(id: ThemeId | null) {
    setHoverTheme(id);
    setStatus(`theme: ${id ?? theme}`);
  }

  function pinTheme(id: ThemeId) {
    setTheme(id);
    setStatus(`theme: ${id}`);
  }

  return (
    <div className="grid gap-8 px-(--lp-gutter) lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
      <Desk pinned={layout} onPreview={previewLayout} onPin={pinLayout} />
      <Monitor
        table={table}
        layout={shownLayout}
        theme={shownTheme}
        pinnedTheme={theme}
        onPreviewTheme={previewTheme}
        onPinTheme={pinTheme}
      />
      <Dial table={table} shown={shownTheme} onPreview={previewTheme} onPin={pinTheme} />
      <Window title="--color-fd-*" className="self-start [--row:14px]">
        <Convert
          names={names}
          light={wirings[shownTheme].light}
          dark={wirings[shownTheme].dark}
          preset={shownTheme}
        />
      </Window>
    </div>
  );
}
