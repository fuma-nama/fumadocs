import type { ResolvedFiles } from './resolve-files'
import type { Page } from './types'

export type PageUtils = {
  getPages(locale?: string): Page[]
  getPage(slugs: string[] | undefined, locale?: string): Page | null
  getPageUrl(slugs: string[] | undefined, locale?: string): string
}

export function createPageUtils(
  { pages }: ResolvedFiles,
  baseUrl: string,
  languages: string[]
): PageUtils {
  const pageMap = new Map<string, Page>()

  for (const page of pages) {
    pageMap.set(page.file.flattenedPath, page)
  }

  const i18nMap = new Map<string, Page[]>()

  i18nMap.set('', [])

  for (const lang of languages) {
    i18nMap.set(lang, [])
  }

  for (const page of pages) {
    if (page.file.locale != null) continue

    i18nMap.get('')!.push(page)

    for (const lang of languages) {
      const result = pageMap.get(page.file.flattenedPath + '.' + lang) ?? page

      i18nMap.get(lang)!.push(result)
    }
  }

  return {
    getPages(locale = '') {
      return i18nMap.get(locale)!
    },
    getPageUrl(slugs = [], locale) {
      return slugsToUrl([baseUrl, locale, ...slugs])
    },
    getPage(slugs, locale) {
      return getPage(pages, slugs, locale)
    }
  }
}

function slugsToUrl(slugs: (string | undefined)[] = []): string {
  return slugs.filter(Boolean).join('/')
}

function getPage(
  pages: Page[],
  slugs: string[] | undefined = [],
  locale?: string
): Page | null {
  const path = slugs.join('/')
  let def: Page | null = null

  for (const page of pages) {
    if (page.slugs.join('/') === path) {
      if (page.file.locale == null) def = page
      if (page.file.locale === locale) return page
    }
  }

  return def
}
