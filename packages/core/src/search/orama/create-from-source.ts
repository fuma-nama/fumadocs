import {
  type AdvancedIndex,
  type AdvancedOptions,
  createI18nSearchAPI,
  createSearchAPI,
  type SearchAPI,
} from '@/search/server';
import {
  type InferPageType,
  type LoaderConfig,
  type LoaderOutput,
  type Page,
} from '@/source';
import { type StructuredData } from '@/mdx-plugins';
import { type LocaleMap } from '@/search/orama/create-i18n';
import { basename, extname } from '@/source/path';

function pageToIndex(page: Page): AdvancedIndex {
  if (!('structuredData' in page.data)) {
    throw new Error(
      'Cannot find structured data from page, please define the page to index function.',
    );
  }

  const structuredData = page.data.structuredData as StructuredData;

  return {
    title: page.data.title ?? basename(page.path, extname(page.path)),
    description:
      'description' in page.data
        ? (page.data.description as string)
        : undefined,
    url: page.url,
    id: page.url,
    structuredData,
  };
}

interface Options<Page = unknown> extends Omit<AdvancedOptions, 'indexes'> {
  localeMap?: LocaleMap<Partial<AdvancedOptions>>;
  buildIndex?: (page: Page) => AdvancedIndex;
}

export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  options?: Options<InferPageType<S>>,
): SearchAPI;

/**
 * @deprecated Use `createFromSource(source, options)` instead.
 */
export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  pageToIndexFn?: (page: InferPageType<S>) => AdvancedIndex,
  options?: Omit<Options, 'buildIndex'>,
): SearchAPI;

export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  _buildIndexOrOptions:
    | ((page: InferPageType<S>) => AdvancedIndex)
    | Options<InferPageType<S>> = pageToIndex,
  _options?: Omit<Options, 'buildIndex'>,
): SearchAPI {
  const options: Options<InferPageType<S>> = {
    ...(typeof _buildIndexOrOptions === 'function'
      ? {
          buildIndex: _buildIndexOrOptions,
        }
      : _buildIndexOrOptions),
    ..._options,
  };

  if (source._i18n) {
    return createI18nSearchAPI('advanced', {
      ...options,
      i18n: source._i18n,
      indexes: source.getLanguages().flatMap((entry) => {
        return entry.pages.map((page) => {
          return {
            ...(options.buildIndex ?? pageToIndex)(page as InferPageType<S>),
            locale: entry.language,
          };
        });
      }),
    });
  }

  return createSearchAPI('advanced', {
    ...options,
    indexes: source.getPages().map((page) => {
      return (options.buildIndex ?? pageToIndex)(page as InferPageType<S>);
    }),
  });
}
