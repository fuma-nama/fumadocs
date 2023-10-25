'use client'

import { Breadcrumb } from '@/components/breadcrumb'
import type { FooterProps } from '@/components/mdx/footer'
import { Footer } from '@/components/mdx/footer'
import { TOC } from '@/components/toc'
import type { TableOfContents } from 'next-docs-zeta/server'
import { useContext, useEffect, useState, type ReactNode } from 'react'
import { I18nContext } from './contexts/i18n'
import { replaceOrDefault } from './utils/replace-or-default'

export type DocsPageProps = {
  toc?: TableOfContents

  tableOfContent?: Partial<{
    enabled: boolean
    component: ReactNode
    /**
     * Custom content in TOC container, before the main TOC
     */
    header: ReactNode
    /**
     * Custom content in TOC container, after the main TOC
     */
    footer: ReactNode
  }>

  /**
   * Replace or disable breadcrumb
   */
  breadcrumb?: Partial<{
    enabled: boolean
    component: ReactNode
  }>

  footer?: FooterProps | false
  lastUpdate?: Date | null

  children: ReactNode
}

export function DocsPage({
  tableOfContent = {},
  breadcrumb = {},
  ...props
}: DocsPageProps) {
  return (
    <>
      <article className="nd-flex nd-flex-col nd-gap-6 nd-w-0 nd-flex-1 nd-py-10">
        {replaceOrDefault(breadcrumb, <Breadcrumb />)}
        {props.children}
        {props.lastUpdate && <LastUpdate date={props.lastUpdate} />}
        {props.footer != null && props.footer !== false && (
          <Footer {...props.footer} />
        )}
      </article>
      {replaceOrDefault(
        tableOfContent,
        <TOC
          items={props.toc ?? []}
          header={tableOfContent.header}
          footer={tableOfContent.footer}
        />
      )}
    </>
  )
}

function LastUpdate(props: { date: Date }) {
  const lastUpdate =
    useContext(I18nContext).text?.lastUpdate ?? 'Last updated on'
  const [date, setDate] = useState('')

  useEffect(() => {
    // to the timezone of client
    setDate(props.date.toLocaleDateString())
  }, [props.date])

  return (
    <p className="nd-text-muted-foreground nd-text-xs nd-mt-8">
      {lastUpdate} {date}
    </p>
  )
}
