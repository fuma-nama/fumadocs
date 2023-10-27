import { cva } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { TableOfContents } from 'next-docs-zeta/server'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { replaceOrDefault } from './utils/replace-or-default'

// We can keep the "use client" directives with dynamic imports
// Next.js bundler should handle this automatically
const { TOC, Breadcrumb, LastUpdate } = await import('./page.client')

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

type FooterProps = {
  previous?: { name: string; url: string }
  next?: { name: string; url: string }
}

const footerItem = cva(
  'nd-flex nd-flex-row nd-gap-2 nd-items-center nd-text-muted-foreground nd-transition-colors hover:nd-text-foreground'
)

function Footer({ next, previous }: FooterProps) {
  return (
    <div className="nd-flex nd-flex-row nd-gap-4 nd-mt-4 nd-flex-wrap nd-border-t nd-py-12">
      {previous && (
        <Link href={previous.url} className={footerItem()}>
          <ChevronLeftIcon className="nd-w-5 nd-h-5 nd-shrink-0" />
          <p className="nd-font-medium nd-text-foreground">{previous.name}</p>
        </Link>
      )}
      {next && (
        <Link
          href={next.url}
          className={footerItem({ className: 'nd-ml-auto' })}
        >
          <p className="nd-text-end nd-font-medium nd-text-foreground">
            {next.name}
          </p>
          <ChevronRightIcon className="nd-w-5 nd-h-5 nd-shrink-0" />
        </Link>
      )}
    </div>
  )
}
