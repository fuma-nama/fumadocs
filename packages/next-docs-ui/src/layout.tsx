'use client'

import { Nav, type NavItemProps } from '@/components/nav'
import { Sidebar } from '@/components/sidebar'
import { GithubIcon } from 'lucide-react'
import type { PageTree } from 'next-docs-zeta/server'
import Link from 'next/link'
import { type ReactNode } from 'react'
import { LayoutContext } from './contexts/tree'
import {
  replaceOrDefault,
  type ReplaceOrDisable
} from './utils/replace-or-default'

export type DocsLayoutProps = {
  /**
   * Navbar title
   */
  navTitle?: string | ReactNode
  navItems?: NavItemProps[]

  tree: PageTree

  /**
   * Replace or disable navbar
   */
  nav?: ReplaceOrDisable

  /**
   * Github url displayed on the navbar
   */
  githubUrl?: string

  /**
   * Replace or disable sidebar
   */
  sidebar?: ReplaceOrDisable

  /**
   * Open folders by default if their level is lower or equal to a specific level
   * (Starting from 1)
   *
   * @default 1
   */
  sidebarDefaultOpenLevel?: number

  sidebarCollapsible?: boolean

  sidebarBanner?: ReactNode

  sidebarFooter?: ReactNode

  children: ReactNode
}

export function DocsLayout(props: DocsLayoutProps) {
  const links = props.githubUrl
    ? [
        {
          href: props.githubUrl,
          icon: <GithubIcon aria-label="Github" className="nd-w-5 nd-h-5" />,
          external: true
        }
      ]
    : []
  const sidebar = replaceOrDefault(
    props.sidebar,
    <Sidebar banner={props.sidebarBanner} footer={props.sidebarFooter} />
  )

  const navbar = replaceOrDefault(
    props.nav,
    <Nav
      links={links}
      items={props.navItems}
      enableSidebar={sidebar != null}
      collapsibleSidebar={props.sidebarCollapsible}
    >
      <Link
        href="/"
        className="nd-font-semibold hover:nd-text-muted-foreground"
      >
        {props.navTitle}
      </Link>
    </Nav>
  )

  return (
    <LayoutContext.Provider
      value={{
        tree: props.tree,
        sidebarDefaultOpenLevel: props.sidebarDefaultOpenLevel
      }}
    >
      {navbar}
      <div className="nd-flex nd-flex-row nd-container nd-max-w-[1300px] nd-gap-10">
        {sidebar}
        {props.children}
      </div>
    </LayoutContext.Provider>
  )
}
