'use client'

import { SearchProvider, type SearchProviderProps } from './contexts/search'
import { SidebarCollapseProvider } from '@/contexts/sidebar'
import { SidebarProvider } from 'next-docs-zeta/sidebar'
import { ThemeProvider } from 'next-themes'
import { type ReactNode } from 'react'

export type RootProviderProps = {
  search?: Omit<SearchProviderProps, 'children'>

  /**
   * Wrap the body in `ThemeProvider` (next-themes), enabled by default
   */
  enableThemeProvider?: boolean
  children: ReactNode
}

export function RootProvider({
  children,
  enableThemeProvider = true,
  search
}: RootProviderProps): JSX.Element {
  const body = (
    <SidebarProvider>
      <SidebarCollapseProvider>
        <SearchProvider {...search}>{children}</SearchProvider>
      </SidebarCollapseProvider>
    </SidebarProvider>
  )

  return enableThemeProvider ? (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {body}
    </ThemeProvider>
  ) : (
    body
  )
}
