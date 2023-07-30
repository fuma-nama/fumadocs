import FlexSearch from 'flexsearch'
import { NextResponse } from 'next/server'
import type { IndexPage } from './types'

type Result = {
  GET: (request: Request) => Response | Promise<Response>
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
