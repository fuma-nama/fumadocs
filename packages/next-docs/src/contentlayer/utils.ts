import type { DocsPageBase, MetaPageBase, PagesContext } from './types'

export function pathToName(path: string[]): string {
  const name = path[path.length - 1] ?? 'docs'
  return name.slice(0, 1).toUpperCase() + name.slice(1)
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

  /**
   * @param language If empty, the default language will be used
   */
  getPage: (slugs?: string[], language?: string) => Docs | undefined

  getPageUrl: (
    slugs: string | string[] | undefined,
    language?: string
  ) => string
} {
  return {
    getPages: (language = '') => context.pages.get(language),
    getPage(slugs, language = '') {
      const path = (slugs ?? []).join('/')

      return context.pages.get(language)?.find(page => page.slug === path)
    },
    getPageUrl(slug, language) {
      const slugs = typeof slug === 'string' ? slug.split('/') : slug ?? []

      return context.getUrl(slugs, language)
    }
  }
}
