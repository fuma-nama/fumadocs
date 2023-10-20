import type { DocsPageBase, MetaPageBase, PagesContext } from './types'
import { getKey, getPageUrl } from './utils'

export type ContextOptions = {
  languages: string[]
  /**
   * @default '/docs'
   */
  baseUrl: string
  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string

  resolveIcon: PagesContext['resolveIcon']
}

export function loadContext<
  Meta extends MetaPageBase,
  Docs extends DocsPageBase
>(
  metaPages: Meta[],
  docsPages: Docs[],
  {
    languages = [],
    baseUrl = '/docs',
    getUrl,
    resolveIcon
  }: Partial<ContextOptions> = {}
): PagesContext<Meta, Docs> {
  const docsMap = new Map<string, Docs>()
  const metaMap = new Map<string, Meta>()

  for (const page of docsPages) {
    docsMap.set(getKey(page), page)
  }

  for (const meta of metaPages) {
    metaMap.set(meta._raw.flattenedPath, meta)
  }

  return {
    resolveIcon,
    languages,
    pages: getI18nPages(docsMap, languages),
    docsMap,
    metaMap,
    getUrl(slugs, locale) {
      return getUrl ? getUrl(slugs, locale) : getPageUrl(slugs, baseUrl, locale)
    }
  }
}

function getI18nPages<Docs extends DocsPageBase>(
  docsMap: Map<string, Docs>,
  languages: string[]
): Map<string, Docs[]> {
  const pages = new Map<string, Docs[]>()

  pages.set('', [])
  for (const lang of languages) {
    pages.set(lang, [])
  }

  for (const [key, value] of docsMap) {
    if (value.locale) continue

    for (const lang of languages) {
      pages.get(lang)?.push(docsMap.get(`${key}.${lang}`) ?? value)
    }

    pages.get('')?.push(value)
  }

  return pages
}
