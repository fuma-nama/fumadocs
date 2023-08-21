'use client'

import { Breadcrumb } from '@/components/breadcrumb'
import type { FooterProps } from '@/components/mdx/footer'
import { Footer } from '@/components/mdx/footer'
import { TOC } from '@/components/toc'
import type { TableOfContents } from 'next-docs-zeta/server'
import type { ReactNode } from 'react'
import {
  replaceOrDefault,
  type ReplaceOrDisable
} from './utils/replace-or-default'

export type DocsPageProps = {
  toc?: TableOfContents

  /**
   * Replace or disable TOC (by passing false)
   */
  replaceToc?: ReplaceOrDisable

  /**
   * Replace or disable breadcrumb
   */
  breadcrumb?: ReplaceOrDisable

  lastUpdate?: Date | string | null

  /**
   * Custom content in TOC container
   */
  tocContent?: ReactNode
  children: ReactNode
  footer?: FooterProps | false
}

export function DocsPage(props: DocsPageProps) {
  const toc = replaceOrDefault(
    props.replaceToc,
    <div className="nd-relative nd-w-[250px] max-xl:nd-hidden">
      <div className="nd-sticky nd-flex nd-flex-col nd-top-16 nd-py-16 nd-max-h-[calc(100vh-4rem)]">
        {props.toc && props.toc.length > 0 && <TOC items={props.toc} />}
        {props.tocContent}
      </div>
    </div>
  )

  const breadcrumb = replaceOrDefault(props.breadcrumb, <Breadcrumb />)

  return (
    <>
      <article className="nd-flex nd-flex-col nd-gap-6 nd-w-0 nd-flex-1 nd-py-8 md:nd-py-16">
        {breadcrumb}
        {props.children}
        {props.lastUpdate && (
          <p className="nd-text-muted-foreground nd-text-xs nd-mt-8">
            Last Update: {dateToString(props.lastUpdate)}
          </p>
        )}
        {props.footer != null && props.footer !== false && (
          <Footer {...props.footer} />
        )}
      </article>
      {toc}
    </>
  )
}

function dateToString(date: string | Date): string {
  return typeof date === 'string'
    ? date
    : `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}
