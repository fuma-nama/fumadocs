import { createMetadata } from '@/utils/metadata'
import { getPage, getPageUrl, getTree } from '@/utils/source'
import { allDocs } from 'contentlayer/generated'
import { ExternalLinkIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { MDXContent } from 'next-docs-ui/mdx'
import { DocsPage } from 'next-docs-ui/page'
import {
  findNeighbour,
  getGitLastEditTime,
  getTableOfContents
} from 'next-docs-zeta/server'
import { notFound } from 'next/navigation'
import { Content } from './content'

type Param = {
  mode: string
  slug?: string[]
}

export default async function Page({ params }: { params: Param }) {
  const tree = getTree(params.mode)
  const page = getPage([params.mode, ...(params.slug ?? [])])

  if (page == null) {
    notFound()
  }

  const toc = await getTableOfContents(page.body.raw)
  const url = getPageUrl(page.slug)
  const neighbours = findNeighbour(tree, url)
  const time = await getGitLastEditTime(
    'SonMooSans/next-docs',
    'apps/docs/content/' + page._raw.sourceFilePath
  )

  return (
    <DocsPage
      toc={toc}
      footer={neighbours}
      lastUpdate={time}
      tocContent={
        <a
          href={`https://github.com/SonMooSans/next-docs/blob/main/apps/docs/content/${page._raw.sourceFilePath}`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs inline-flex text-muted-foreground items-center hover:text-foreground"
        >
          Edit on Github <ExternalLinkIcon className="ml-1 w-3 h-3" />
        </a>
      }
    >
      <MDXContent>
        <div className="nd-not-prose mb-12">
          <h1 className="text-foreground mb-4 text-3xl font-semibold sm:text-4xl">
            {page.title}
          </h1>
          <p className="text-muted-foreground sm:text-lg">{page.description}</p>
        </div>
        <Content code={page.body.code} />
      </MDXContent>
    </DocsPage>
  )
}

export function generateMetadata({ params }: { params: Param }): Metadata {
  const slugs = [params.mode, ...(params.slug ?? [])]
  const page = getPage(slugs)

  if (page == null) return {}

  const description =
    page.description ??
    'The headless ui library for building documentation websites'

  const image = {
    alt: 'Banner',
    url: `/api/og/${slugs.join('/')}`,
    width: 1200,
    height: 630
  }

  return createMetadata({
    title: page.title,
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
  return allDocs.map(docs => {
    const [mode, ...slugs] = docs.slug.split('/')

    return {
      slug: slugs,
      mode
    }
  })
}
