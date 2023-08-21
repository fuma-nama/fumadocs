'use client'

import { Breadcrumb } from '@/components/breadcrumb'
import type { FooterProps } from '@/components/mdx/footer'
import { Footer } from '@/components/mdx/footer'
import { TOC } from '@/components/toc'
import type { TableOfContents } from 'next-docs-zeta/server'
import { useContext, useEffect, useState, type ReactNode } from 'react'
import { I18nContext } from './contexts/i18n'
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

  lastUpdate?: Date | null

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
        {props.lastUpdate && <LastUpdate date={props.lastUpdate} />}
        {props.footer != null && props.footer !== false && (
          <Footer {...props.footer} />
        )}
      </article>
      {toc}
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
