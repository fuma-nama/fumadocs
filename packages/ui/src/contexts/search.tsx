import type * as React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { SearchLink, SharedProps } from '@/components/dialog/search';

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
  setOpenSearch: (value: boolean) => void;
}

const SearchContext = createContext<SearchContextType>({
  enabled: false,
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
  links,
}: SearchProviderProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(preload ? false : undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        setIsOpen(true);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);

  const ctx = useMemo<SearchContextType>(
    () => ({ enabled: true, setOpenSearch: setIsOpen }),
    [],
  );

  return (
    <SearchContext.Provider value={ctx}>
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
