import type { DocsPageBase, PagesContext } from './types'

export function getPageUrl(slug: string[], baseUrl: string, locale?: string) {
  const url = [baseUrl, locale, ...slug]
    .filter(segment => segment != null && segment.length > 0)
    .join('/')

  if (url.startsWith('//')) {
    return url.slice(1)
  }

  return url
}

export type ContentlayerUtils<Docs extends DocsPageBase> = {
  /**
   * Get list of pages from language
   *
   * @param language If empty, the default language will be used
   */
  getPages: (language?: string) => Docs[] | undefined

  /**
   * @param language If empty, the default language will be used
   */
  getPage: (slugs: string[] | undefined, language?: string) => Docs | undefined

  getPageUrl: (
    slugs: string | string[] | undefined,
    language?: string
  ) => string
}

export function createUtils<Docs extends DocsPageBase>(
  context: PagesContext<Docs>
): ContentlayerUtils<Docs> {
  return {
    getPages(language = '') {
      return context.i18nMap.get(language)
    },
    getPage(slugs = [], language = '') {
      const path = slugs.join('/')

      return context.i18nMap.get(language)?.find(page => page.slug === path)
    },
    getPageUrl(slug = [], language) {
      const slugs = typeof slug === 'string' ? slug.split('/') : slug

      return context.getUrl(slugs, language)
    }
  }
}
