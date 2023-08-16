import type { RawDocumentData } from 'contentlayer/source-files'
import type { ReactElement } from 'react'

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

export type PagesContext<
  Meta extends MetaPageBase = MetaPageBase,
  Docs extends DocsPageBase = DocsPageBase
> = {
  /**
   * Language -> Page[]
   */
  pages: Map<string, Docs[]>
  languages: string[]
  docsMap: Map<string, Docs>
  metaMap: Map<string, Meta>
  resolveIcon?: (icon: string) => ReactElement | undefined
  getUrl: (slugs: string[], locale?: string) => string
}
