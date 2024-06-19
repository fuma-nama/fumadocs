import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { SearchLink, SharedProps } from '@/components/dialog/search';

interface HotKey {
  display: React.ReactNode;

  /**
   * Key code or a function determining whether the key is pressed.
   */
  key: string | ((e: KeyboardEvent) => boolean);
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
   * @defaultValue K + Meta/Ctrl
   */
  hotKey?: HotKey[];

  /**
   * Replace default search dialog, allowing you to use other solutions such as Algolia Search
   *
   * It receives the `open` and `onOpenChange` prop, can be lazy loaded with `next/dynamic`
   */
  SearchDialog: React.ComponentType<SharedProps>;

  /**
   * Additional props to the dialog
   */
  options?: Partial<SharedProps>;

  children?: React.ReactNode;
}

interface SearchContextType {
  enabled: boolean;
  hotKey: HotKey[];
  setOpenSearch: (value: boolean) => void;
}

const SearchContext = createContext<SearchContextType>({
  enabled: false,
  hotKey: [],
  setOpenSearch: () => undefined,
});

export function useSearchContext(): SearchContextType {
  return useContext(SearchContext);
}

export function SearchProvider({
  SearchDialog,
  children,
  preload = true,
  options,
  hotKey = [
    {
      key: (e) => e.metaKey || e.ctrlKey,
      display: '⌘',
    },
    {
      key: 'k',
      display: 'K',
    },
  ],
  links,
}: SearchProviderProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(preload ? false : undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
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
        () => ({ enabled: true, hotKey, setOpenSearch: setIsOpen }),
        [hotKey],
      )}
    >
      {isOpen !== undefined && (
        <SearchDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          links={links}
          {...options}
        />
      )}
      {children}
    </SearchContext.Provider>
  );
}
