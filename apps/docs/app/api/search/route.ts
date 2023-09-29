import { initIndex, type BaseIndex } from 'next-docs-zeta/algolia'
import type { SortedResult } from 'next-docs-zeta/server'
import { NextResponse, type NextRequest } from 'next/server'

const index = initIndex(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_API_KEY!
)

export const GET = async (req: NextRequest) => {
  const query = req.nextUrl.searchParams.get('query') ?? '',
    tag = req.nextUrl.searchParams.get('tag') ?? 'ui'

  const result = await index.search<BaseIndex>(query, {
    filters: `tag:${tag}`,
    distinct: 3,
    hitsPerPage: 8
  })

  const grouped: SortedResult[] = []

  let last_url: string | null = null

  for (const hit of result.hits) {
    if (last_url !== hit.url) {
      last_url = hit.url

      grouped.push({
        id: hit.url,
        type: 'page',
        url: hit.url,
        content: hit.title
      })
    }

    grouped.push({
      id: hit.objectID,
      type: hit.content === hit.section ? 'heading' : 'text',
      url: hit.url + '#' + hit.section_id,
      content: hit.content
    })
  }

  return NextResponse.json(grouped)
}
