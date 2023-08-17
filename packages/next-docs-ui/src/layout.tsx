'use client'

import { Nav, type NavItemProps } from '@/components/nav'
import { Sidebar } from '@/components/sidebar'
import { GithubIcon } from 'lucide-react'
import type { TreeNode } from 'next-docs-zeta/server'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PagesContext } from './contexts/tree'

export type DocsLayoutProps = {
  /**
   * Navbar title
   */
  navTitle?: string | ReactNode
  navItems?: NavItemProps[]

  tree: TreeNode[]

  /**
   * Replace navbar
   */
  nav?: ReactNode | false

  /**
   * Github url displayed on the navbar
   */
  githubUrl?: string

  /**
   * Replace or disable sidebar
   */
  sidebar?: ReactNode | false

  sidebarBanner?: ReactNode

  sidebarContent?: ReactNode

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
  const sidebar = props.sidebar ?? (
    <Sidebar banner={props.sidebarBanner} items={props.tree}>
      {props.sidebarContent}
    </Sidebar>
  )

  const navbar = props.nav ?? (
    <Nav links={links} items={props.navItems} enableSidebar={sidebar !== false}>
      <Link
        href="/"
        className="nd-font-semibold hover:nd-text-muted-foreground"
      >
        {props.navTitle}
      </Link>
    </Nav>
  )

  return (
    <PagesContext.Provider value={{ tree: props.tree }}>
      {navbar}
      <div className="nd-flex nd-flex-row nd-container nd-max-w-[1300px] nd-gap-10">
        {sidebar}
        {props.children}
      </div>
    </PagesContext.Provider>
  )
}
