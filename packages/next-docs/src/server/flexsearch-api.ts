import { structure } from '@/mdx-plugins/search-structure'
import FlexSearch from 'flexsearch'
import { NextResponse, type NextRequest } from 'next/server'
import type { IndexPage } from './types'

type Result = {
  GET: (request: NextRequest) => Response | Promise<Response>
}

export function initI18nSearchAPI(
  entries: [language: string, indexes: IndexPage[]][]
): Result {
  const map = new Map<string, Result>()

  for (const [k, v] of entries) {
    map.set(k, initSearchAPI(v, k))
  }

  return {
    GET(request) {
      const { searchParams } = new URL(request.url)
      const locale = searchParams.get('locale')

      if (locale && map.has(locale)) {
        return map.get(locale)!.GET(request)
      }

      return NextResponse.json([])
    }
  }
}

export function initSearchAPI(indexes: IndexPage[], language?: string): Result {
  const index = new FlexSearch.Document<IndexPage, ['title', 'url']>({
    tokenize: 'forward',
    optimize: true,
    resolution: 9,
    language,
    cache: 100,
    document: {
      id: 'url',
      store: ['title', 'url'],
      index: [
        {
          field: 'title',
          tokenize: 'forward',
          optimize: true,
          resolution: 9
        },
        {
          field: 'content',
          tokenize: 'strict',
          optimize: true,
          resolution: 9,
          context: {
            depth: 1,
            resolution: 3
          }
        },
        {
          field: 'keywords',
          tokenize: 'strict',
          optimize: true,
          resolution: 9
        }
      ]
    }
  })

  for (const page of indexes) {
    index.add({
      title: page.title,
      url: page.url,
      content: page.content,
      keywords: page.keywords
    })
  }

  return {
    GET(request) {
      const { searchParams } = new URL(request.url)
      const query = searchParams.get('query')

      if (query == null) return NextResponse.json([])

      const results = index.search(query, 5, {
        enrich: true,
        suggest: true
      })

      return NextResponse.json(results[0]?.result ?? [])
    }
  }
}

type AdvancedIndexPage = {
  id: string
  title: string
  content: string
  url: string
}

type InternalIndex = {
  id: string
  url: string
  page_id: string
  type: 'page' | 'heading' | 'text'
  content: string
}

export type SortedResult = {
  id: string
  url: string
  type: 'page' | 'heading' | 'text'
  content: string
}

export async function experimental_initSearchAPI(
  indexes: AdvancedIndexPage[]
): Promise<Result> {
  const store = ['id', 'url', 'content', 'page_id', 'type']
  const index = new FlexSearch.Document<InternalIndex, typeof store>({
    cache: 100,
    tokenize: 'forward',
    optimize: true,
    context: {
      depth: 2,
      bidirectional: true,
      resolution: 9
    },
    document: {
      id: 'id',
      store,
      index: ['content']
    }
  })

  for (const page of indexes) {
    const data = await structure(page.content)
    let id = 0

    index.add({
      id: page.id,
      page_id: page.id,
      type: 'page',
      content: page.title,
      url: page.url
    })

    for (const heading of data.headings) {
      index.add({
        id: page.id + id++,
        page_id: page.id,
        type: 'heading',
        url: page.url + '#' + heading.id,
        content: heading.content
      })
    }

    for (const content of data.contents) {
      index.add({
        id: page.id + id++,
        page_id: page.id,
        type: 'text',
        url: content.heading ? page.url + '#' + content.heading : page.url,
        content: content.content
      })
    }
  }

  return {
    GET(request) {
      const query = request.nextUrl.searchParams.get('query')

      if (query == null) return NextResponse.json([])

      const results = index.search(query, 5, {
        enrich: true,
        limit: 5
      })[0]

      if (results == null) return NextResponse.json([])

      const map = new Map<string, SortedResult[]>()
      const sortedResult: SortedResult[] = []

      for (const item of results.result) {
        if (item.doc.type === 'page') {
          if (!map.has(item.doc.page_id)) {
            map.set(item.doc.page_id, [])
          }

          continue
        }

        const i: SortedResult = {
          id: item.doc.id,
          content: item.doc.content.slice(0, 70),
          type: item.doc.type,
          url: item.doc.url
        }

        if (map.has(item.doc.page_id)) {
          map.get(item.doc.page_id)?.push(i)
        } else {
          map.set(item.doc.page_id, [i])
        }
      }

      for (const [id, items] of map.entries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const page: InternalIndex = (index as any).get(id)

        if (!page) continue

        sortedResult.push({
          id: page.id,
          content: page.content,
          type: 'page',
          url: page.url
        })
        sortedResult.push(...items)
      }

      return NextResponse.json(sortedResult)
    }
  }
}
