'use client';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { createContext } from 'fumadocs-core/framework';

export interface PageStyles {
  tocNav?: string;
  toc?: string;
  page?: string;
  article?: string;
}

/**
 * applied styles to different layout components in `Page` from layouts
 */
const StylesContext = createContext<PageStyles>('StylesContext', {
  tocNav: 'xl:hidden',
  toc: 'max-xl:hidden',
});

export function usePageStyles() {
  return StylesContext.use();
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

const NavContext = createContext<NavContextType>('NavContext', {
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
    <NavContext.Provider
      value={useMemo(() => ({ isTransparent: transparent }), [transparent])}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextType {
  return NavContext.use();
}
