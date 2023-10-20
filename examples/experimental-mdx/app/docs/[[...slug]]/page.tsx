import { getPage, getPageUrl, tree } from '@/app/source'
import { allDocs } from 'contentlayer/generated'
import type { Metadata } from 'next'
import { MDXContent } from 'next-docs-ui/mdx'
import { DocsPage } from 'next-docs-ui/page'
import { findNeighbour } from 'next-docs-zeta/server'
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

  const MDX = page.data.default
  const neighbour = findNeighbour(tree, getPageUrl(params.slug))

  return (
    <DocsPage toc={page.data.toc} footer={neighbour}>
      <MDXContent>
        <h1>{page.matter.title}</h1>
        <MDX />
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

  if (page == null) return

  return {
    title: page.matter.title,
    description: page.matter.description
  } satisfies Metadata
}
