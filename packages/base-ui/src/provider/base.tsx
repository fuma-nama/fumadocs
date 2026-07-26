'use client';

import { type ReactNode, useEffect, useEffectEvent } from 'react';
import { flushSync } from 'react-dom';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { ThemeProvider, type ThemeProviderProps, useTheme } from 'next-themes';
import { I18nProvider, type I18nProviderProps } from '@/contexts/i18n';
import { SearchProvider, type SearchProviderProps } from '@/contexts/search';

/**
 * Whether the event should be ignored because the user is interacting with an editable element,
 * or an opened dialog (e.g. the search dialog).
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;

  return target.closest('[role="dialog"]') !== null;
}

interface SearchOptions extends Omit<SearchProviderProps, 'children'> {
  /**
   * Enable search functionality
   *
   * @defaultValue `true`
   */
  enabled?: boolean;
}

interface ThemeOptions extends ThemeProviderProps {
  /**
   * Enable `next-themes`
   *
   * @defaultValue true
   */
  enabled?: boolean;

  /**
   * Hotkey for toggling between light/dark mode, pass `false` to disable it.
   *
   * It is ignored while typing in an editable element (e.g. `<input />`), or when a dialog is opened.
   *
   * @defaultValue `d`
   */
  hotKey?: string | ((e: KeyboardEvent) => boolean) | false;
}

export interface RootProviderProps {
  /**
   * `dir` option for Base UI
   */
  dir?: 'rtl' | 'ltr';

  /**
   * @remarks `SearchProviderProps`
   */
  search?: Partial<SearchOptions>;

  /**
   * Customize options for `next-themes`
   */
  theme?: ThemeOptions;

  i18n?: Omit<I18nProviderProps, 'children'>;

  children?: ReactNode;
}

/**
 * Toggle between light/dark mode with a hotkey, must be placed under `next-themes` provider.
 */
function ThemeHotKey({ hotKey }: { hotKey: Exclude<ThemeOptions['hotKey'], false | undefined> }) {
  const { setTheme, resolvedTheme } = useTheme();

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing) return;
    if (isTypingTarget(e.target)) return;

    // a custom function is responsible for its own modifiers
    const matched =
      typeof hotKey === 'string'
        ? !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === hotKey.toLowerCase()
        : hotKey(e);
    if (!matched) return;

    e.preventDefault();
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    if (document?.startViewTransition) {
      document.startViewTransition(() => flushSync(() => setTheme(next)));
    } else {
      setTheme(next);
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}

export function RootProvider({
  children,
  dir = 'ltr',
  theme = {},
  search,
  i18n,
}: RootProviderProps) {
  let body = children;

  if (search?.enabled !== false) {
    body = <SearchProvider {...search}>{body}</SearchProvider>;
  }

  if (theme?.enabled !== false) {
    const { enabled: _, hotKey = 'd', ...themeProps } = theme;

    body = (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        {...themeProps}
      >
        {hotKey !== false && <ThemeHotKey hotKey={hotKey} />}
        {body}
      </ThemeProvider>
    );
  }

  if (i18n) {
    body = <I18nProvider {...i18n}>{body}</I18nProvider>;
  }

  return <DirectionProvider direction={dir}>{body}</DirectionProvider>;
}

export {
  /**
   * re-exported from `next-themes`
   */
  useTheme,
  type UseThemeProps,
} from 'next-themes';
