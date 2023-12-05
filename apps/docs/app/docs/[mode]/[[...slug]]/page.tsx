import { resolve } from 'url'
import Preview from '@/components/preview'
import { createMetadata } from '@/utils/metadata'
import { getUtils, tabs } from '@/utils/source'
import { ExternalLinkIcon } from 'lucide-react'
import type { Metadata } from 'next'
import type { Utils } from 'next-docs-mdx/map'
import type { Page } from 'next-docs-mdx/types'
import { Card, Cards, MDXContent } from 'next-docs-ui/mdx'
import { DocsPage } from 'next-docs-ui/page'
import { findNeighbour, getGithubLastEdit } from 'next-docs-zeta/server'
import { notFound } from 'next/navigation'

type Param = {
  mode: string
  slug?: string[]
}

export default async function Page({ params }: { params: Param }) {
  const tab = getUtils(params.mode)
  const page = tab.getPage(params.slug)

  if (page == null) {
    notFound()
  }

  const neighbours = findNeighbour(tab.tree, tab.getPageUrl(page.slugs))

  const path = resolve('apps/docs/content/docs/', page.file.path)
  const time = await getGithubLastEdit({
    owner: 'fuma-nama',
    repo: 'next-docs',
    path,
    token: process.env.GIT_TOKEN ? `Bearer ${process.env.GIT_TOKEN}` : undefined
  })

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
              `https://github.com/fuma-nama/next-docs/blob/main`,
              path
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
        {page.matter.index ? <Category page={page} tab={tab} /> : <MDX />}
      </MDXContent>
    </DocsPage>
  )
}

function Category({ page, tab }: { page: Page; tab: Utils }) {
  const filtered = tab.pages.filter(
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
          href={tab.getPageUrl(page.slugs)}
        />
      ))}
    </Cards>
  )
}

export function generateMetadata({ params }: { params: Param }): Metadata {
  const utils = getUtils(params.mode)
  const page = utils.getPage(params.slug)

  if (page == null) notFound()

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
      url: `https://next-docs-zeta.vercel.app/docs/${page.slugs.join('/')}`,
      images: image
    },
    twitter: {
      images: image
    }
  })
}

export function generateStaticParams(): Param[] {
  return Object.entries(tabs).flatMap(([mode, tab]) => {
    return tab.pages.map<Param>(page => ({
      mode,
      slug: page.slugs
    }))
  })
}
