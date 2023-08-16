import { getPage, getPageUrl, getTree } from '@/utils/source'
import { allDocs } from 'contentlayer/generated'
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
      tocContent={
        <div className="mt-4 border-t pt-4 space-y-2">
          {time && (
            <p className="text-muted-foreground text-xs font-medium">
              Last Update: {time.toLocaleDateString()}
            </p>
          )}
          <a
            href={`https://github.com/SonMooSans/next-docs/blob/main/apps/docs/content/${page._raw.sourceFilePath}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted-foreground hover:text-foreground text-xs font-medium"
          >
            Edit this Page -&gt;
          </a>
        </div>
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
  const page = getPage([params.mode, ...(params.slug ?? [])])

  if (page == null) return {}

  const description =
    page.description ??
    'The headless ui library for building documentation websites'

  return {
    title: page.title,
    description,
    openGraph: {
      url: 'https://next-docs-zeta.vercel.app',
      title: page.title,
      description,
      images: '/banner.png',
      siteName: 'Next Docs'
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@money_is_shark',
      title: page.title,
      description,
      images: '/banner.png'
    }
  }
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
