import { cva } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { TableOfContents, TOCItemType } from 'next-docs-zeta/server'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { replaceOrDefault } from './utils/replace-or-default'

// We can keep the "use client" directives with dynamic imports
// Next.js bundler should handle this automatically
const { TOCItems, Breadcrumb, LastUpdate } = await import('./page.client')

export type DocsPageProps = {
  toc?: TableOfContents

  tableOfContent?: Partial<
    Omit<TOCProps, 'item'> & {
      enabled: boolean
      component: ReactNode
    }
  >

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

type TOCProps = {
  items: TOCItemType[]

  /**
   * Custom content in TOC container, before the main TOC
   */
  header: ReactNode
  /**
   * Custom content in TOC container, after the main TOC
   */
  footer: ReactNode
}

function TOC(props: TOCProps) {
  return (
    <div className="nd-sticky nd-divide-y nd-flex nd-flex-col nd-top-16 nd-gap-4 nd-py-10 nd-w-[220px] nd-h-body max-lg:nd-hidden xl:nd-w-[260px]">
      {props.header}
      {props.items.length > 0 && <TOCItems items={props.items} />}
      {props.footer && (
        <div className="nd-pt-4 first:nd-pt-0">{props.footer}</div>
      )}
    </div>
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
