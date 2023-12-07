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
      <article className="flex flex-col gap-6 w-0 flex-1 py-10">
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
    <div className="sticky divide-y flex flex-col top-16 gap-4 py-10 w-[220px] h-body max-lg:hidden xl:w-[260px]">
      {props.header}
      {props.items.length > 0 && <TOCItems items={props.items} />}
      {props.footer && <div className="pt-4 first:pt-0">{props.footer}</div>}
    </div>
  )
}

type FooterProps = {
  previous?: { name: string; url: string }
  next?: { name: string; url: string }
}

const footerItem = cva(
  'flex flex-row gap-2 items-center text-muted-foreground transition-colors hover:text-foreground'
)

function Footer({ next, previous }: FooterProps) {
  return (
    <div className="flex flex-row gap-4 mt-4 flex-wrap border-t py-12">
      {previous && (
        <Link href={previous.url} className={footerItem()}>
          <ChevronLeftIcon className="w-5 h-5 shrink-0" />
          <p className="font-medium text-foreground">{previous.name}</p>
        </Link>
      )}
      {next && (
        <Link href={next.url} className={footerItem({ className: 'ml-auto' })}>
          <p className="text-end font-medium text-foreground">{next.name}</p>
          <ChevronRightIcon className="w-5 h-5 shrink-0" />
        </Link>
      )}
    </div>
  )
}
