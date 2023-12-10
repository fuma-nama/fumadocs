import type { DocsPageBase, PagesContext } from './types';

export interface ContentlayerUtils<Docs extends DocsPageBase> {
  /**
   * Get list of pages from language
   *
   * @param language - If empty, the default language will be used
   */
  getPages: (language?: string) => Docs[] | undefined;

  /**
   * @param language - If empty, the default language will be used
   */
  getPage: (slugs: string[] | undefined, language?: string) => Docs | undefined;
}

export function createUtils<Docs extends DocsPageBase>(
  context: PagesContext<Docs>,
): ContentlayerUtils<Docs> {
  return {
    getPages(language = '') {
      return context.i18nMap.get(language);
    },
    getPage(slugs = [], language = '') {
      const path = slugs.join('/');

      return context.i18nMap.get(language)?.find((page) => page.slug === path);
    },
  };
}
