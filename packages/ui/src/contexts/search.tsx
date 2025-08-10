'use client';
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createContext } from 'fumadocs-core/framework';
import type { HighlightMatches } from '@/components/dialog/search-highlight';

interface HotKey {
  display: ReactNode;

  /**
   * Key code or a function determining whether the key is pressed.
   */
  key: string | ((e: KeyboardEvent) => boolean);
}

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type SearchLink = [name: string, href: string];

export interface TagItem {
  name: string;
  value: string;
}

export interface SearchProviderProps {
  /**
   * Preload search dialog before opening it
   *
   * @defaultValue `true`
   */
  preload?: boolean;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchLink[];

  /**
   * Hotkeys for triggering search dialog
   *
   * @defaultValue Meta/Ctrl + K
   */
  hotKey?: HotKey[];

  /**
   * Replace default search dialog, allowing you to use other solutions such as Algolia Search
   *
   * It receives the `open` and `onOpenChange` prop, can be lazy loaded with `next/dynamic`
   */
  SearchDialog: ComponentType<SharedProps>;

  /**
   * Additional props to the dialog
   */
  options?: Partial<SharedProps & Record<string, unknown>>;

  /**
   * Global highlight configuration. Dialogs will use this unless overridden locally.
   */
  highlightMatches?: HighlightMatches;

  children?: ReactNode;
}

interface SearchContextType {
  enabled: boolean;
  hotKey: HotKey[];
  setOpenSearch: (value: boolean) => void;
  /**
   * Highlight matched query terms inside result text.
   * Configure globally via provider; dialogs read from context.
   */
  highlightMatches: HighlightMatches;
}

const SearchContext = createContext<SearchContextType>('SearchContext', {
  enabled: false,
  hotKey: [],
  setOpenSearch: () => undefined,
  highlightMatches: false,
});

export function useSearchContext(): SearchContextType {
  return SearchContext.use();
}

function MetaOrControl() {
  const [key, setKey] = useState('⌘');

  useEffect(() => {
    const isWindows = window.navigator.userAgent.includes('Windows');

    if (isWindows) setKey('Ctrl');
  }, []);

  return key;
}

export function SearchProvider({
  SearchDialog,
  children,
  preload = true,
  options,
  highlightMatches = false,
  hotKey = [
    {
      key: (e) => e.metaKey || e.ctrlKey,
      display: <MetaOrControl />,
    },
    {
      key: 'k',
      display: 'K',
    },
  ],
  links,
}: SearchProviderProps) {
  const [isOpen, setIsOpen] = useState(preload ? false : undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        hotKey.every((v) =>
          typeof v.key === 'string' ? e.key === v.key : v.key(e),
        )
      ) {
        setIsOpen(true);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [hotKey]);

  return (
    <SearchContext.Provider
      value={useMemo(
        () => ({ enabled: true, hotKey, setOpenSearch: setIsOpen, highlightMatches }),
        [hotKey, highlightMatches],
      )}
    >
      {isOpen !== undefined && (
        <SearchDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          // @ts-expect-error -- insert prop for official UIs
          links={links}
          {...options}
        />
      )}
      {children}
    </SearchContext.Provider>
  );
}

/**
 * Show children only when search is enabled via React Context
 */
export function SearchOnly({ children }: { children: ReactNode }) {
  const search = useSearchContext();

  if (search.enabled) return children;
}
