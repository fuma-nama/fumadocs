import { randomUUID } from 'crypto'
import type { DocsPageBase } from '@/contentlayer/types'
import type { StructuredData } from '@/mdx-plugins/remark-structure'
import type { SearchClient, SearchIndex } from 'algoliasearch'
import type { BaseIndex } from './shared'

type DocumentRecord = DocsPageBase & {
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

export async function sync(
  client: SearchClient,
  {
    document = 'document',
    documents
  }: { document?: string; documents: DocumentRecord[] }
) {
  const index = client.initIndex(document)
  await setIndexSettings(index)
  await updateDocuments(index, documents)
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

type Section = {
  section?: string
  section_id?: string
  content: string
}

function getSections(page: DocumentRecord): Section[] {
  const scanned_headings = new Set<string>()

  return page.structured.contents.flatMap(p => {
    const heading =
      p.heading != null
        ? page.structured.headings.find(h => p.heading === h.id)
        : null

    const section = {
      section: heading?.content,
      section_id: heading?.id,
      content: p.content
    }

    if (heading && !scanned_headings.has(heading.id)) {
      scanned_headings.add(heading.id)

      return [
        {
          section: heading.content,
          section_id: heading.id,
          content: heading.content
        },
        section
      ]
    }

    return section
  })
}

export async function updateDocuments(
  index: SearchIndex,
  documents: DocumentRecord[]
) {
  const objects = documents.flatMap(page => {
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
