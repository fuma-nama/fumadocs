import { allDocs } from 'contentlayer/generated'
import { experimental_initSearchAPI } from 'next-docs-zeta/server'
import { type NextRequest } from 'next/server'

export const runtime = 'edge'

const search = experimental_initSearchAPI(
  allDocs.map(docs => ({
    id: docs._id,
    title: docs.title,
    content: docs.body.raw,
    url: '/docs/' + docs.slug,
    structuredData: docs.structuredData,
    tag: docs._raw.flattenedPath.startsWith('docs/ui') ? 'ui' : 'headless'
  })),
  true
)

export async function GET(request: NextRequest) {
  return (await search).GET(request)
}
