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
import { findPath } from '@/page-tree/utils';

type Awaitable<T> = T | Promise<T>;

function defaultBuildIndex(source: LoaderOutput<LoaderConfig>) {
  function isBreadcrumbItem(item: unknown): item is string {
    return typeof item === 'string' && item.length > 0;
  }

  return async (page: Page): Promise<AdvancedIndex> => {
    let breadcrumbs: string[] | undefined;
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

    const pageTree = source.getPageTree(page.locale);
    const path = findPath(
      pageTree.children,
      (node) => node.type === 'page' && node.url === page.url,
    );
    if (path) {
      breadcrumbs = [];
      path.pop();

      if (isBreadcrumbItem(pageTree.name)) {
        breadcrumbs.push(pageTree.name);
      }

      for (const segment of path) {
        if (!isBreadcrumbItem(segment.name)) continue;

        breadcrumbs.push(segment.name);
      }
    }

    return {
      title: page.data.title ?? basename(page.path, extname(page.path)),
      breadcrumbs,
      description: page.data.description,
      url: page.url,
      id: page.url,
      structuredData,
    };
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

export function createFromSource<S extends LoaderOutput<LoaderConfig>>(
  source: S,
  options: Options<S> = {},
): SearchAPI {
  const { buildIndex = defaultBuildIndex(source) } = options;

  if (source._i18n) {
    return createI18nSearchAPI('advanced', {
      ...options,
      i18n: source._i18n,
      indexes: async () => {
        const indexes = source.getLanguages().flatMap((entry) => {
          return entry.pages.map(async (page) => ({
            ...(await buildIndex(page as InferPageType<S>)),
            locale: entry.language,
          }));
        });

        return Promise.all(indexes);
      },
    });
  }

  return createSearchAPI('advanced', {
    ...options,
    indexes: async () => {
      const indexes = source
        .getPages()
        .map((page) => buildIndex(page as InferPageType<S>));

      return Promise.all(indexes);
    },
  });
}
