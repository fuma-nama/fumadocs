import { Content } from './content'
import { getPage, tree } from '@/app/source'
import { allDocs } from 'contentlayer/generated'
import type { Metadata } from 'next'
import { MDXContent } from 'next-docs-ui/mdx'
import { DocsPage } from 'next-docs-ui/page'
import { findNeighbour, getTableOfContents } from 'next-docs-zeta/server'
import { notFound } from 'next/navigation'

export default async function Page({
  params
}: {
  params: { slug?: string[] }
}) {
  const page = getPage(params.slug)

  if (page == null) {
    notFound()
  }

  const toc = await getTableOfContents(page.body.raw)
  const neighbour = findNeighbour(tree, page.url)

  return (
    <DocsPage url={page.url} toc={toc} footer={neighbour}>
      <MDXContent>
        <h1>{page.title}</h1>
        <Content code={page.body.code} />
      </MDXContent>
    </DocsPage>
  )
}

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  return allDocs.map(page => ({
    slug: page.slug.split('/')
  }))
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = getPage(params.slug)

  if (page == null) notFound()

  return {
    title: page.title,
    description: page.description
  } satisfies Metadata
}
