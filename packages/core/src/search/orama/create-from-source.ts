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

type Awaitable<T> = T | Promise<T>;

async function pageToIndex(page: Page): Promise<AdvancedIndex> {
  let structuredData: StructuredData | undefined;

  if ('structuredData' in page.data) {
    structuredData = page.data.structuredData as StructuredData;
  } else if ('load' in page.data && typeof page.data.load === 'function') {
    structuredData = (await page.data.load()).structuredData;
  }

  if (!structuredData)
    throw new Error(
      'Cannot find structured data from page, please define the page to index function.',
    );

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
  buildIndex?: (page: InferPageType<S>) => Awaitable<AdvancedIndex>;
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
  pageToIndexFn?: (page: InferPageType<S>) => Awaitable<AdvancedIndex>,
  options?: Omit<Options<S>, 'buildIndex'>,
): SearchAPI;

export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  _buildIndexOrOptions:
    | ((page: InferPageType<S>) => Awaitable<AdvancedIndex>)
    | Options<S> = pageToIndex,
  _options?: Omit<Options<S>, 'buildIndex'>,
): SearchAPI {
  const { buildIndex = pageToIndex, ...options }: Options<S> = {
    ...(typeof _buildIndexOrOptions === 'function'
      ? {
          buildIndex: _buildIndexOrOptions,
        }
      : _buildIndexOrOptions),
    ..._options,
  };
  const i18n = source._i18n;
  let server: Promise<SearchAPI>;

  if (i18n) {
    const indexes = source.getLanguages().flatMap((entry) => {
      return entry.pages.map(async (page) => ({
        ...(await buildIndex(page as InferPageType<S>)),
        locale: entry.language,
      }));
    });

    server = Promise.all(indexes).then((loaded) =>
      createI18nSearchAPI('advanced', {
        ...options,
        i18n,
        indexes: loaded,
      }),
    );
  } else {
    const indexes = source.getPages().map(async (page) => {
      return buildIndex(page as InferPageType<S>);
    });

    server = Promise.all(indexes).then((loaded) =>
      createSearchAPI('advanced', {
        ...options,
        indexes: loaded,
      }),
    );
  }

  return {
    async export(...args) {
      return (await server).export(...args);
    },
    async GET(...args) {
      return (await server).GET(...args);
    },
    async search(...args) {
      return (await server).search(...args);
    },
    async staticGET(...args) {
      return (await server).staticGET(...args);
    },
  };
}
