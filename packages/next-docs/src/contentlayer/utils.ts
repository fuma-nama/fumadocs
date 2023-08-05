import type { DocsPageBase, MetaPageBase, PagesContext } from './types'

export function pathToName(path: string): string {
  return path.slice(0, 1).toUpperCase() + path.slice(1)
}

export function getKey(page: DocsPageBase): string {
  return page._raw.sourceFileDir === page._raw.flattenedPath
    ? page._raw.flattenedPath + '/index'
    : page._raw.flattenedPath
}

export function getPageUrl(slug: string[], baseUrl: string, locale?: string) {
  const url = [baseUrl, locale, ...slug]
    .filter(segment => segment != null && segment.length > 0)
    .join('/')

  if (url.startsWith('//')) {
    return url.slice(1)
  }

  return url
}

export function createUtils<Docs extends DocsPageBase>(
  context: PagesContext<MetaPageBase, Docs>
): {
  /**
   * Get list of pages from language
   *
   * @param language If empty, the default language will be used
   */
  getPages: (language?: string) => Docs[] | undefined

  getPage: (language: string, slugs?: string[]) => Docs | undefined
} {
  return {
    getPages: (language = '') => context.pages.get(language),
    getPage(language, slugs) {
      const path = (slugs ?? []).join('/')

      return context.pages.get(language)?.find(page => page.slug === path)
    }
  }
}
