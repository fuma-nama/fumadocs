import { randomUUID } from 'crypto'
import type { DocsPageBase } from '@/contentlayer/types'
import type { StructuredData } from '@/mdx-plugins/search-structure'
import algo, { type SearchIndex } from 'algoliasearch'

export function initIndex(appId: string, apiKey: string): SearchIndex {
  const client = algo(appId, apiKey)

  return client.initIndex('document')
}

export async function setIndexSettings(index: SearchIndex): Promise<void> {
  await index.setSettings({
    attributeForDistinct: 'page_id',
    attributesToRetrieve: ['title', 'section', 'content', 'url', 'section_id'],
    searchableAttributes: ['title', 'section', 'content'],
    attributesToSnippet: [],
    attributesForFaceting: ['tag']
  })
}

type DocsPageIndex = DocsPageBase & {
  /**
   * URL to the page
   */
  url: string
  structured: StructuredData

  /**
   * Data to be added to each section index
   */
  extra_data?: object
}

export type BaseIndex = {
  objectID: string
  title: string
  url: string
  section: string

  /**
   * The anchor id
   */
  section_id: string

  /**
   * The id of page, used for distinct
   */
  page_id: string

  content: string
}

type Section = {
  section: string
  section_id: string
  content: string
}

function getSections(page: DocsPageIndex): Section[] {
  return page.structured.headings.flatMap(heading => {
    const contents = page.structured.contents.filter(
      c => c.heading === heading.id
    )

    const paragraphs = contents.map(p => ({
      section: heading.content,
      section_id: heading.id,
      content: p.content
    }))

    paragraphs.unshift({
      section: heading.content,
      section_id: heading.id,
      content: heading.content
    })

    return paragraphs
  })
}

export async function updateDocuments(
  index: SearchIndex,
  pages: DocsPageIndex[]
) {
  const objects = pages.flatMap(page => {
    return getSections(page).map(
      section =>
        ({
          objectID: page._id + '-' + randomUUID(),
          title: page.title,
          url: page.url,
          page_id: page._id,
          ...section,
          ...page.extra_data
        }) satisfies BaseIndex
    )
  })

  await index.replaceAllObjects(objects)
}
