import { resolve } from 'url'
import Preview from '@/components/preview'
import { createMetadata } from '@/utils/metadata'
import { getPage, getPageUrl, getTree, pages } from '@/utils/source'
import { ExternalLinkIcon } from 'lucide-react'
import type { Metadata } from 'next'
import type { Page } from 'next-docs-mdx/types'
import { Card, Cards, MDXContent } from 'next-docs-ui/mdx'
import { DocsPage } from 'next-docs-ui/page'
import { findNeighbour, getGitLastEditTime } from 'next-docs-zeta/server'
import { notFound } from 'next/navigation'

type Param = {
  mode: string
  slug?: string[]
}

export default async function Page({ params }: { params: Param }) {
  const tree = getTree(params.mode)
  const page = getPage([params.mode, ...(params.slug ?? [])]) as Page

  if (page == null) {
    notFound()
  }

  const url = getPageUrl(page.slugs)
  const neighbours = findNeighbour(tree, url)

  const headers = new Headers()
  if (process.env.GIT_TOKEN)
    headers.append('authorization', `Bearer ${process.env.GIT_TOKEN}`)

  const time = await getGitLastEditTime(
    'SonMooSans/next-docs',
    resolve('apps/docs/', page.file.path),
    undefined,
    {
      headers
    }
  )

  const preview = page.matter.preview?.trim()
  const MDX = page.data.default

  return (
    <DocsPage
      toc={page.data.toc}
      footer={neighbours}
      lastUpdate={time}
      tableOfContent={{
        footer: (
          <a
            href={resolve(
              `https://github.com/fuma-nama/next-docs/blob/main/apps/docs/content`,
              page.file.path
            )}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs inline-flex text-muted-foreground items-center hover:text-foreground"
          >
            Edit on Github <ExternalLinkIcon className="ml-1 w-3 h-3" />
          </a>
        )
      }}
    >
      <MDXContent>
        <div className="nd-not-prose mb-12">
          <h1 className="text-foreground mb-4 text-3xl font-semibold sm:text-4xl">
            {page.matter.title}
          </h1>
          <p className="text-muted-foreground sm:text-lg">
            {page.matter.description}
          </p>
        </div>
        {preview != null && preview in Preview && Preview[preview]}
        {page.matter.index ? <Category page={page} /> : <MDX />}
      </MDXContent>
    </DocsPage>
  )
}

function Category({ page }: { page: Page }) {
  const filtered = pages.filter(
    docs =>
      docs.file.dirname === page.file.dirname && docs.file.name !== 'index'
  )

  return (
    <Cards>
      {filtered.map(page => (
        <Card
          key={page.file.id}
          title={page.matter.title}
          description={page.matter.description ?? 'No Description'}
          href={getPageUrl(page.slugs)}
        />
      ))}
    </Cards>
  )
}

export function generateMetadata({ params }: { params: Param }): Metadata {
  const slugs = [params.mode, ...(params.slug ?? [])]
  const page = getPage(slugs)

  if (page == null) return {}

  const description =
    page.matter.description ?? 'The library for building documentation sites'

  const imageParams = new URLSearchParams()
  imageParams.set('title', page.matter.title)
  imageParams.set('description', description)

  const image = {
    alt: 'Banner',
    url: `/api/og/${params.mode}?${imageParams.toString()}`,
    width: 1200,
    height: 630
  }

  return createMetadata({
    title: page.matter.title,
    description,
    openGraph: {
      url: `https://next-docs-zeta.vercel.app/docs/${slugs.join('/')}`,
      images: image
    },
    twitter: {
      images: image
    }
  })
}

export function generateStaticParams() {
  return pages.map(docs => {
    const [mode, ...slugs] = docs.slugs

    return {
      slug: slugs,
      mode
    }
  })
}
