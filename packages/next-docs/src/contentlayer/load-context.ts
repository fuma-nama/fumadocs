import type { AbstractMeta, AbstractPage, File } from '@/build-page-tree'
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

type MappedPage<Docs extends DocsPageBase> = { page: AbstractPage; ref: Docs }

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
  const basePages: AbstractPage[] = []
  const pageMap = new Map<string, MappedPage<Docs>>()
  const metaMap = new Map<string, AbstractMeta>()

  for (const page of docsPages) {
    const file = getFileData(page._raw)

    const mapped: MappedPage<Docs> = {
      ref: page,
      page: {
        file,
        title: page.title,
        icon: page.icon,
        url: getUrl(page.slug.split('/'), page.locale)
      }
    }

    if (!page.locale) basePages.push(mapped.page)
    pageMap.set(file.flattenedPath, mapped)
  }

  for (const meta of metaPages) {
    const file = getFileData(meta._raw)

    metaMap.set(file.flattenedPath, {
      file,
      pages: meta.pages,
      icon: meta.icon,
      title: meta.title
    })
  }

  return {
    i18nMap: getI18nPages(pageMap, languages),
    getMetaByPath(flattenPath) {
      return metaMap.get(flattenPath) ?? null
    },
    getPageByPath(flattenPath) {
      return pageMap.get(flattenPath)?.page ?? null
    },
    basePages,
    resolveIcon,
    getUrl
  }
}

function getFileData(raw: RawDocumentData): File {
  const dotIndex = raw.sourceFileName.lastIndexOf('.')
  const flattenedPath =
    raw.sourceFileDir === raw.flattenedPath
      ? raw.flattenedPath + '/index'
      : raw.flattenedPath

  return {
    dirname: raw.sourceFileDir,
    name: raw.sourceFileName.slice(0, dotIndex === -1 ? undefined : dotIndex),
    flattenedPath,
    path: raw.sourceFilePath
  }
}

function getI18nPages<Docs extends DocsPageBase>(
  docsMap: Map<string, MappedPage<Docs>>,
  languages: string[]
): Map<string, Docs[]> {
  const pages = new Map<string, Docs[]>()

  pages.set('', [])
  for (const lang of languages) {
    pages.set(lang, [])
  }

  for (const [key, value] of docsMap) {
    if (value.ref.locale) continue

    for (const lang of languages) {
      const v = docsMap.get(`${key}.${lang}`) ?? value

      pages.get(lang)?.push(v.ref)
    }

    pages.get('')?.push(value.ref)
  }

  return pages
}
