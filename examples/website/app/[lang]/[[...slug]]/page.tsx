import { languages } from '@/app/i18n'
import type { Metadata } from 'next'
import { getMDXComponent } from 'next-contentlayer/hooks'
import {
  Card,
  Cards,
  Heading,
  Image,
  Link,
  MDXContent,
  Pre,
  Table
} from 'next-docs-ui/mdx'
import { DocsPage } from 'next-docs-ui/page'
import { getTableOfContents } from 'next-docs-zeta/server'
import { notFound } from 'next/navigation'
import { getPage, getPages } from '../../tree'

export default async function Page({
  params
}: {
  params: { lang: string; slug?: string[] }
}) {
  if (!languages.includes(params.lang)) {
    notFound()
  }
  const page = getPage(params.lang, params.slug)

  if (page == null) {
    notFound()
  }

  const toc = await getTableOfContents(page.body.raw)
  const MDX = getMDXComponent(page.body.code)

  return (
    <DocsPage toc={toc}>
      <MDXContent>
        <h1>{page.title}</h1>
        <MDX
          components={{
            table: props => <Table {...props} />,
            pre: props => <Pre {...props} />,
            a: props => <Link {...props} />,
            h1: props => <Heading as="h1" {...props} />,
            h2: props => <Heading as="h2" {...props} />,
            h3: props => <Heading as="h3" {...props} />,
            h4: props => <Heading as="h4" {...props} />,
            h5: props => <Heading as="h5" {...props} />,
            h6: props => <Heading as="h6" {...props} />,
            img: props => <Image {...props} />,
            Card: props => <Card {...props} />,
            Cards: props => <Cards {...props} />
          }}
        />
      </MDXContent>
    </DocsPage>
  )
}

export async function generateStaticParams(): Promise<
  { lang: string; slug: string[] }[]
> {
  return languages.flatMap(lang =>
    getPages(lang)!.map(docs => ({
      slug: docs.slug.split('/'),
      lang
    }))
  )
}

export function generateMetadata({
  params
}: {
  params: { lang: string; slug?: string[] }
}) {
  const page = getPage(params.lang, params.slug)

  if (page == null) return

  return {
    title: page.title,
    description: page.description
  } satisfies Metadata
}
