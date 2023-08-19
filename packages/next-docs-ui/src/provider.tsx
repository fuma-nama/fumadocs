'use client'

import { DesktopSidebarProvider } from '@/contexts/sidebar'
import { SidebarProvider } from 'next-docs-zeta/sidebar'
import { ThemeProvider } from 'next-themes'
import { type ReactNode } from 'react'
import { SearchProvider, type SearchProviderProps } from './contexts/search'

export type RootProviderProps = {
  search?: Omit<SearchProviderProps, 'children'>
  children: ReactNode
}

export function RootProvider(props: RootProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <DesktopSidebarProvider>
          <SearchProvider {...props.search}>{props.children}</SearchProvider>
        </DesktopSidebarProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}
