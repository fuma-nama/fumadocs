import {
  type AdvancedIndex,
  type AdvancedOptions,
  createI18nSearchAPI,
  createSearchAPI,
  type SearchAPI,
} from '@/search/server';
import {
  type LoaderConfig,
  type LoaderOutput,
  type InferPageType,
  type Page,
} from '@/source';
import { type StructuredData } from '@/mdx-plugins';
import { type LocaleMap } from '@/search/i18n-api';

function defaultToIndex(page: Page): AdvancedIndex {
  if (!('structuredData' in page.data)) {
    throw new Error(
      'Cannot find structured data from page, please define the page to index function.',
    );
  }

  return {
    title: page.data.title,
    description:
      'description' in page.data
        ? (page.data.description as string)
        : undefined,
    url: page.url,
    id: page.url,
    structuredData: page.data.structuredData as StructuredData,
  };
}

type Options = Omit<AdvancedOptions, 'language' | 'indexes'> & {
  localeMap?: LocaleMap<Partial<AdvancedOptions>>;
};

export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  pageToIndex: (page: InferPageType<S>) => AdvancedIndex = defaultToIndex,
  options: Options = {},
): SearchAPI {
  if (source._i18n) {
    return createI18nSearchAPI('advanced', {
      ...options,
      i18n: source._i18n,
      indexes: source.getLanguages().flatMap((entry) => {
        return entry.pages.map((page) => {
          return {
            ...pageToIndex(page as InferPageType<S>),
            locale: entry.language,
          };
        });
      }),
    });
  }

  return createSearchAPI('advanced', {
    ...options,
    indexes: source.getPages().map((page) => {
      return pageToIndex(page as InferPageType<S>);
    }),
  });
}
