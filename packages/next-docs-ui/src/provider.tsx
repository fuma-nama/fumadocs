'use client'

import { ThemeProvider } from 'next-themes'
import { type ReactNode } from 'react'
import { SidebarProvider } from './components/sidebar'
import { SearchProvider, type SearchProviderProps } from './contexts/search'

export type RootProviderProps = {
  search?: Omit<SearchProviderProps, 'children'>
  children: ReactNode
}

export function RootProvider(props: RootProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <SearchProvider {...props.search}>{props.children}</SearchProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}
