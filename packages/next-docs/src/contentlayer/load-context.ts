import type { DocsPageBase, MetaPageBase, PagesContext } from './types'
import { getKey } from './utils'

export function loadContext<
  Meta extends MetaPageBase,
  Docs extends DocsPageBase
>(
  metaPages: Meta[],
  docsPages: Docs[],
  languages: string[] = []
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
    pages: getI18nPages(docsMap, languages),
    docsMap,
    metaMap
  }
}

function getI18nPages<Docs extends DocsPageBase>(
  docsMap: Map<string, Docs>,
  languages: string[]
) {
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
