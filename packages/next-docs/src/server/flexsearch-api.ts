import { structure, type StructuredData } from '@/mdx-plugins/search-structure'
import FlexSearch from 'flexsearch'
import { NextResponse, type NextRequest } from 'next/server'

type SearchAPI = {
  GET: (
    request: NextRequest
  ) => NextResponse<SortedResult[]> | Promise<NextResponse<SortedResult[]>>
}

type IndexPage = {
  title: string
  content: string
  url: string
  keywords?: string
}

export function initI18nSearchAPI(
  entries: [language: string, indexes: IndexPage[]][]
): SearchAPI {
  const map = new Map<string, SearchAPI>()

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

export function initSearchAPI(
  indexes: IndexPage[],
  language?: string
): SearchAPI {
  const store = ['title', 'url']
  const index = new FlexSearch.Document<IndexPage, typeof store>({
    language,
    optimize: true,
    cache: 100,
    document: {
      id: 'url',
      store,
      index: [
        {
          field: 'title',
          tokenize: 'forward',
          resolution: 9
        },
        {
          field: 'content',
          tokenize: 'strict',
          context: {
            depth: 1,
            resolution: 9
          }
        },
        {
          field: 'keywords',
          tokenize: 'strict',
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
      const { searchParams } = request.nextUrl
      const query = searchParams.get('query')

      if (query == null) return NextResponse.json([])

      const results = index.search(query, 5, {
        enrich: true,
        suggest: true
      })

      const pages = results[0]?.result?.map<SortedResult>(page => ({
        type: 'page',
        content: page.doc.title,
        id: page.doc.url,
        url: page.doc.url
      }))

      return NextResponse.json(pages ?? [])
    }
  }
}

type AdvancedIndexPage = {
  id: string
  title: string
  content: string
  /**
   * Required if `tag` is enabled
   */
  tag?: string
  /**
   * preprocess mdx content with `structure`
   */
  structuredData?: StructuredData
  url: string
}

type InternalIndex = {
  id: string
  url: string
  page_id: string
  type: 'page' | 'heading' | 'text'
  tag?: string
  content: string
}

export type SortedResult = {
  id: string
  url: string
  type: 'page' | 'heading' | 'text'
  content: string
}

export async function experimental_initSearchAPI(
  indexes: AdvancedIndexPage[],
  /**
   * Enabled custom tag
   */
  tag: boolean = false
): Promise<SearchAPI> {
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
      tag: tag ? 'tag' : undefined,
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
      tag: page.tag,
      url: page.url
    })

    for (const heading of data.headings) {
      index.add({
        id: page.id + id++,
        page_id: page.id,
        type: 'heading',
        tag: page.tag,
        url: page.url + '#' + heading.id,
        content: heading.content
      })
    }

    for (const content of data.contents) {
      index.add({
        id: page.id + id++,
        page_id: page.id,
        tag: page.tag,
        type: 'text',
        url: content.heading ? page.url + '#' + content.heading : page.url,
        content: content.content
      })
    }
  }

  return {
    GET(request) {
      const query = request.nextUrl.searchParams.get('query')
      const tag = request.nextUrl.searchParams.get('tag')

      if (query == null) return NextResponse.json([])

      const results = index.search(query, 5, {
        enrich: true,
        tag: tag ?? undefined,
        limit: 6
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
          content: smartSlice(item.doc.content, 70),
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

const chars = ['\n', ',', '.']

function smartSlice(content: string, limit: number): string {
  if (content.length > limit) {
    content = content.slice(0, limit)
  }

  let right = content.length - 1

  while (right >= 0) {
    const char = content.charAt(right)
    right--

    if (chars.includes(char)) break
  }

  if (right > 0) {
    content = content.slice(0, right + 1)
  }

  return content
}
