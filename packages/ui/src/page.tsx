import { getPageTree } from './global'
import { replaceOrDefault } from './utils/replace-or-default'
import { cva } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import {
  findNeighbour,
  type TableOfContents,
  type TOCItemType
} from 'next-docs-zeta/server'
import Link from 'next/link'
import type { ReactNode } from 'react'

// We can keep the "use client" directives with dynamic imports
// Next.js bundler should handle this automatically
const { TOCItems, Breadcrumb, LastUpdate } = await import('./page.client')

export type DocsPageProps = {
  /**
   * The URL of the current page
   */
  url: string

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

  /**
   * Footer navigation, you can disable it by passing `false`
   */
  footer?: FooterProps | false
  lastUpdate?: Date | null

  children: ReactNode
}

export function DocsPage({
  tableOfContent = {},
  breadcrumb = {},
  url,
  ...props
}: DocsPageProps) {
  const tree = getPageTree()
  if (tree == null)
    throw new Error('You must wrap <DocsPage /> under <DocsLayout />')
  const footer = props.footer ?? findNeighbour(tree, url)

  return (
    <>
      <article className="flex w-0 flex-1 flex-col gap-6 py-10">
        {replaceOrDefault(breadcrumb, <Breadcrumb />)}
        {props.children}
        {props.lastUpdate && <LastUpdate date={props.lastUpdate} />}
        {props.footer !== false && <Footer {...footer} />}
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
    <div className="h-body sticky top-16 flex w-[220px] flex-col gap-4 divide-y py-10 max-lg:hidden xl:w-[260px]">
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
    <div className="mt-4 flex flex-row flex-wrap gap-4 border-t py-12">
      {previous && (
        <Link href={previous.url} className={footerItem()}>
          <ChevronLeftIcon className="h-5 w-5 shrink-0" />
          <p className="text-foreground font-medium">{previous.name}</p>
        </Link>
      )}
      {next && (
        <Link href={next.url} className={footerItem({ className: 'ml-auto' })}>
          <p className="text-foreground text-end font-medium">{next.name}</p>
          <ChevronRightIcon className="h-5 w-5 shrink-0" />
        </Link>
      )}
    </div>
  )
}
