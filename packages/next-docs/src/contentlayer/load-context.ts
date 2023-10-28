import {
  createPageTreeBuilder,
  type AbstractFile
} from '@/server/page-tree-builder'
import type { RawDocumentData } from 'contentlayer/source-files'
import type { ReactElement } from 'react'
import type { DocsPageBase, MetaPageBase, PagesContext } from './types'
import { getPageUrl } from './utils'

export type ContextOptions = {
  languages: string[]

  baseUrl: string
  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string

  resolveIcon: (icon: string) => ReactElement | undefined
}

export function loadContext<Docs extends DocsPageBase>(
  metaPages: MetaPageBase[],
  docsPages: Docs[],
  {
    languages = [],
    baseUrl = '/docs',
    getUrl = (slugs, locale) => getPageUrl(slugs, baseUrl, locale),
    resolveIcon = () => undefined
  }: Partial<ContextOptions> = {}
): PagesContext<Docs> {
  const builder = createPageTreeBuilder({
    pages: docsPages.map(page => ({
      file: getFileData(page._raw, page.locale),
      title: page.title,
      url: getUrl(page.slug.split('/'), page.locale),
      icon: page.icon
    })),
    metas: metaPages.map(meta => ({
      file: getFileData(meta._raw),
      pages: meta.pages,
      icon: meta.icon,
      title: meta.title
    })),
    resolveIcon
  })

  return {
    builder,
    i18nMap: getI18nPages(docsPages, languages),
    getUrl
  }
}

function getFileData(raw: RawDocumentData, locale?: string): AbstractFile {
  const dotIndex = raw.sourceFileName.lastIndexOf('.')
  const flattenedPath =
    raw.sourceFileDir === raw.flattenedPath
      ? raw.flattenedPath + '/index'
      : raw.flattenedPath

  return {
    locale,
    dirname: raw.sourceFileDir,
    name: raw.sourceFileName.slice(0, dotIndex === -1 ? undefined : dotIndex),
    flattenedPath,
    path: raw.sourceFilePath
  }
}

function getI18nPages<Docs extends DocsPageBase>(
  pages: Docs[],
  languages: string[]
): Map<string, Docs[]> {
  const pageMap = new Map<string, Docs>()

  for (const page of pages) {
    pageMap.set(getFileData(page._raw, page.locale).flattenedPath, page)
  }

  const langMap = new Map<string, Docs[]>()

  langMap.set('', [])
  for (const lang of languages) {
    langMap.set(lang, [])
  }

  for (const [key, page] of pageMap) {
    if (page.locale != null) continue
    langMap.get('')!.push(page)

    for (const lang of languages) {
      const v = pageMap.get(`${key}.${lang}`) ?? page

      langMap.get(lang)!.push(v)
    }
  }

  return langMap
}
