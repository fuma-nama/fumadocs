'use client';
import { createContext, type ReactNode, useContext } from 'react';

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
  return useContext(StylesContext);
}

export function StylesProvider({
  children,
  ...value
}: PageStyles & { children: ReactNode }) {
  return (
    <StylesContext.Provider value={value}>{children}</StylesContext.Provider>
  );
}
