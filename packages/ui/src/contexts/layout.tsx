'use client';
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  createContext,
  use,
} from 'react';

export interface PageStyles {
  tocNav?: string;
  toc?: string;
  page?: string;
  article?: string;
}

/**
 * applied styles to different layout components in `Page` from layouts
 */
const StylesContext = createContext<PageStyles>({
  tocNav: 'xl:hidden',
  toc: 'max-xl:hidden',
});

export function usePageStyles() {
  return use(StylesContext);
}

export function StylesProvider({
  children,
  ...value
}: PageStyles & { children: ReactNode }) {
  return (
    <StylesContext.Provider value={value}>{children}</StylesContext.Provider>
  );
}

export interface NavProviderProps {
  /**
   * Use transparent background
   *
   * @defaultValue none
   */
  transparentMode?: 'always' | 'top' | 'none';
}

interface NavContextType {
  isTransparent: boolean;
}

const NavContext = createContext<NavContextType>({
  isTransparent: false,
});

export function NavProvider({
  transparentMode = 'none',
  children,
}: NavProviderProps & { children: ReactNode }) {
  const [transparent, setTransparent] = useState(transparentMode !== 'none');

  useEffect(() => {
    if (transparentMode !== 'top') return;

    const listener = () => {
      setTransparent(window.scrollY < 10);
    };

    listener();
    window.addEventListener('scroll', listener);
    return () => {
      window.removeEventListener('scroll', listener);
    };
  }, [transparentMode]);

  return (
    <NavContext
      value={useMemo(() => ({ isTransparent: transparent }), [transparent])}
    >
      {children}
    </NavContext>
  );
}

export function useNav(): NavContextType {
  return use(NavContext);
}
