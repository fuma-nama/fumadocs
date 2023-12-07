'use client'

import { Nav, type NavItemProps, type NavLinkProps } from '@/components/nav'
import { Sidebar, type SidebarProps } from '@/components/sidebar'
import { GithubIcon } from 'lucide-react'
import type { PageTree } from 'next-docs-zeta/server'
import { type ReactNode } from 'react'
import { LayoutContext } from './contexts/tree'
import { replaceOrDefault } from './utils/replace-or-default'

export type DocsLayoutProps = {
  tree: PageTree

  /**
   * Replace or disable navbar
   */
  nav?: Partial<{
    enabled: boolean
    component: ReactNode
    title: ReactNode
    /**
     * Redirect url of title
     * @default '/''
     */
    url: string
    items: NavItemProps[]
    /**
     * Github url displayed on the navbar
     */
    githubUrl: string
  }>

  sidebar?: Partial<
    SidebarProps & {
      enabled: boolean
      component: ReactNode
      collapsible: boolean

      /**
       * Open folders by default if their level is lower or equal to a specific level
       * (Starting from 1)
       *
       * @default 1
       */
      defaultOpenLevel: number
    }
  >

  children: ReactNode
}

export function DocsLayout({
  nav = {},
  sidebar = {},
  tree,
  children
}: DocsLayoutProps) {
  const links: NavLinkProps[] = []
  if (nav.githubUrl)
    links.push({
      href: nav.githubUrl,
      label: 'Github',
      icon: <GithubIcon />,
      external: true
    })

  return (
    <LayoutContext.Provider
      value={{
        tree,
        sidebarDefaultOpenLevel: sidebar.defaultOpenLevel ?? 1
      }}
    >
      {replaceOrDefault(
        nav,
        <Nav
          title={nav.title}
          url={nav.url}
          links={links}
          items={nav.items}
          enableSidebar={sidebar.enabled ?? true}
          collapsibleSidebar={sidebar.collapsible ?? true}
        />
      )}
      <div className="flex flex-row container gap-6 xl:gap-12">
        {replaceOrDefault(
          sidebar,
          <Sidebar banner={sidebar.banner} footer={sidebar.footer} />
        )}

        {children}
      </div>
    </LayoutContext.Provider>
  )
}
