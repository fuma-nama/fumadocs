'use client';
import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { Scramble } from '../../ui/text';
import { Window } from '../../ui/window';
import { LAYOUTS, type LayoutId, paint, THEMES, type ThemeId } from './data';
import { Plan } from './plan';
import type { InkTable } from './presets';
import { createScreen, type Screen } from './screen';

export interface MonitorProps {
  table: InkTable;
  /** what the screen shows: the hovered layout and theme, or the pinned ones */
  layout: LayoutId;
  theme: ThemeId;
  pinnedTheme: ThemeId;
  onPreviewTheme: (theme: ThemeId | null) => void;
  onPinTheme: (theme: ThemeId) => void;
}

/** the live layout, and the 12 themes beside it: hover or focus previews one, a click pins it */
export function Monitor({
  table,
  layout,
  theme,
  pinnedTheme,
  onPreviewTheme,
  onPinTheme,
}: MonitorProps) {
  const screen = useRef<Screen | null>(null);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const instance = createScreen(element, table);
      screen.current = instance;
      return () => {
        instance.destroy();
        screen.current = null;
      };
    },
    [table],
  );

  useEffect(() => {
    screen.current?.show(layout, theme);
  }, [layout, theme]);

  const name = LAYOUTS.find((item) => item.id === layout)!.name;
  return (
    <Window title={<Scramble text={`fumadocs-ui/layouts/${layout}`} trigger="mount" speed={14} />}>
      <div className="flex max-lg:flex-col">
        <div
          ref={ref}
          role="img"
          aria-label={`${name} layout with the ${theme} theme`}
          className="relative aspect-[16/10] min-w-0 flex-1 overflow-hidden"
        >
          <Plan layout={layout} />
          <div data-live className="pointer-events-none absolute inset-0 isolate" />
        </div>
        <Themes
          table={table}
          shown={theme}
          pinned={pinnedTheme}
          onPreview={onPreviewTheme}
          onPin={onPinTheme}
        />
      </div>
    </Window>
  );
}

function Chip({ table, theme }: { table: InkTable; theme: ThemeId }) {
  const ink = table.inks[theme];
  const bg = table.tokens.indexOf('background');
  const primary = table.tokens.indexOf('primary');
  const face = (mode: 'light' | 'dark', className: string) => (
    <span
      className={cn('absolute inset-0 items-center justify-center', className)}
      style={{ background: paint(ink[mode][bg]) }}
    >
      <span className="size-1.5" style={{ background: paint(ink[mode][primary]) }} />
    </span>
  );
  return (
    <span aria-hidden className="relative size-3.5 shrink-0 border border-current">
      {face('light', 'flex dark:hidden')}
      {face('dark', 'hidden dark:flex')}
    </span>
  );
}

interface ThemesProps {
  table: InkTable;
  shown: ThemeId;
  pinned: ThemeId;
  onPreview: (theme: ThemeId | null) => void;
  onPin: (theme: ThemeId) => void;
}

/** the presets as a list: moving down it previews each, at once */
function Themes({ table, shown, pinned, onPreview, onPin }: ThemesProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = THEMES.indexOf((event.target as HTMLElement).dataset.theme as ThemeId);
    if (index < 0) return;
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = THEMES[(index + step + THEMES.length) % THEMES.length];
    event.currentTarget.querySelector<HTMLElement>(`[data-theme="${next}"]`)?.focus();
  }

  return (
    <div
      role="group"
      aria-label="Themes"
      onKeyDown={onKeyDown}
      onPointerLeave={() => onPreview(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
      }}
      className="flex shrink-0 flex-col justify-center py-2 max-lg:grid max-lg:grid-cols-2 max-lg:border-t max-lg:border-lp-line-strong lg:w-[150px] lg:border-s lg:border-lp-line-strong xl:w-[170px]"
    >
      {THEMES.map((theme) => (
        <button
          key={theme}
          type="button"
          data-theme={theme}
          aria-pressed={theme === pinned}
          tabIndex={theme === pinned ? 0 : -1}
          onPointerEnter={() => onPreview(theme)}
          onFocus={() => onPreview(theme)}
          onClick={() => onPin(theme)}
          className={cn(
            'flex h-6 items-center gap-2.5 px-3 text-start font-mono text-xs transition-none focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-current lg:h-[22px] xl:h-6',
            theme === pinned
              ? 'bg-lp-yellow text-[#121210]'
              : theme === shown
                ? 'bg-lp-ink text-lp-paper'
                : 'hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper',
          )}
        >
          <Chip table={table} theme={theme} />
          {theme}
        </button>
      ))}
    </div>
  );
}
