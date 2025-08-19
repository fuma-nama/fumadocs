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
import { basename, extname } from '@/source/path';
import type { I18nConfig } from '@/i18n';
import type { Language } from '@orama/orama';

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

interface Options<S extends LoaderOutput<LoaderConfig>>
  extends Omit<AdvancedOptions, 'indexes'> {
  localeMap?: {
    [K in S extends LoaderOutput<infer C>
      ? C['i18n'] extends I18nConfig<infer Languages>
        ? Languages
        : string
      : string]?: Partial<AdvancedOptions> | Language;
  };
  buildIndex?: (page: InferPageType<S>) => AdvancedIndex;
}

export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  options?: Options<S>,
): SearchAPI;

/**
 * @deprecated Use `createFromSource(source, options)` instead.
 */
export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  pageToIndexFn?: (page: InferPageType<S>) => AdvancedIndex,
  options?: Omit<Options<S>, 'buildIndex'>,
): SearchAPI;

export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  _buildIndexOrOptions:
    | ((page: InferPageType<S>) => AdvancedIndex)
    | Options<S> = pageToIndex,
  _options?: Omit<Options<S>, 'buildIndex'>,
): SearchAPI {
  const options: Options<S> = {
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
