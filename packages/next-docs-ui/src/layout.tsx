'use client'

import { Nav } from '@/components/nav'
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

  tree: TreeNode[]

  /**
   * Replace navbar
   */
  nav?: ReactNode | false

  /**
   * Github url displayed on the navbar
   */
  githubUrl?: string

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

  return (
    <PagesContext.Provider value={{ tree: props.tree }}>
      {props.nav !== undefined ? (
        props.nav
      ) : (
        <Nav links={links}>
          <Link
            href="/"
            className="nd-font-semibold hover:nd-text-muted-foreground"
          >
            {props.navTitle}
          </Link>
        </Nav>
      )}
      <div className="nd-flex nd-flex-row nd-container nd-max-w-[1300px] lg:nd-gap-x-14">
        <Sidebar banner={props.sidebarBanner} items={props.tree}>
          {props.sidebarContent}
        </Sidebar>
        {props.children}
      </div>
    </PagesContext.Provider>
  )
}
