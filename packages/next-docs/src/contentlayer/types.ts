import type { PageTreeBuilder } from '@/build-page-tree'
import type { RawDocumentData } from 'contentlayer/source-files'

export type MetaPageBase = {
  /** File path relative to `contentDirPath` */
  _id: string
  _raw: RawDocumentData
  type: 'Meta'
  /** The title of the folder */
  title?: string | undefined
  /** Pages of the folder */
  pages: string[]
  icon?: string
  slug: string
}

export type DocsPageBase = {
  /** File path relative to `contentDirPath` */
  _id: string
  _raw: RawDocumentData
  type: 'Docs'
  /** The title of the document */
  title: string
  /** The description of the document */
  description?: string | undefined
  locale?: string
  icon?: string
  slug: string
}

export type PagesContext<Docs extends DocsPageBase = DocsPageBase> = {
  builder: PageTreeBuilder

  /**
   * Language -> Page[]
   */
  i18nMap: Map<string, Docs[]>
  getUrl: (slugs: string[], locale?: string) => string
}
