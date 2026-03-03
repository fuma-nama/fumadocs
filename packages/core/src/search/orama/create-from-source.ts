import {
  type AdvancedIndex,
  type AdvancedOptions,
  createI18nSearchAPI,
  createSearchAPI,
  type SearchAPI,
} from '@/search/server';
import type { LoaderConfig, LoaderOutput, Page } from '@/source';
import { type StructuredData } from '@/mdx-plugins';
import { basename, extname } from '@/source/path';
import type { I18nConfig } from '@/i18n';
import type { Language } from '@orama/orama';
import { findPath } from '@/page-tree/utils';
import type { Awaitable } from '@/types';

async function buildIndexDefault(page: Page): Promise<AdvancedIndex> {
  let structuredData: StructuredData | undefined;

  if ('structuredData' in page.data) {
    structuredData =
      typeof page.data.structuredData === 'function'
        ? ((await page.data.structuredData()) as StructuredData)
        : (page.data.structuredData as StructuredData);
  } else if ('load' in page.data && typeof page.data.load === 'function') {
    structuredData = (await page.data.load()).structuredData;
  }

  if (!structuredData)
    throw new Error(
      'Cannot find structured data from page, please define the page to index function.',
    );

  return {
    title: page.data.title ?? basename(page.path, extname(page.path)),
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData,
  };
}

function isBreadcrumbItem(item: unknown): item is string {
  return typeof item === 'string' && item.length > 0;
}

export function buildBreadcrumbsDefault<C extends LoaderConfig>(
  source: LoaderOutput<C>,
  page: Page,
): string[] | undefined {
  const pageTree = source.getPageTree(page.locale);
  const path = findPath(pageTree.children, (node) => node.type === 'page' && node.url === page.url);

  if (path) {
    const breadcrumbs: string[] = [];
    path.pop();

    if (isBreadcrumbItem(pageTree.name)) {
      breadcrumbs.push(pageTree.name);
    }

    for (const segment of path) {
      if (!isBreadcrumbItem(segment.name)) continue;
      breadcrumbs.push(segment.name);
    }

    return breadcrumbs;
  }
}

interface Options<C extends LoaderConfig> extends Omit<AdvancedOptions, 'indexes'> {
  localeMap?: {
    [K in C['i18n'] extends I18nConfig<infer Languages> ? Languages : string]?:
      | Partial<AdvancedOptions>
      | Language;
  };
  buildIndex?: (page: Page<C['source']['pageData']>) => Awaitable<AdvancedIndex>;
}

export function createFromSource<C extends LoaderConfig>(
  source: LoaderOutput<C>,
  options?: Options<C>,
): SearchAPI;

export function createFromSource<C extends LoaderConfig>(
  source: LoaderOutput<C>,
  options: Options<C> = {},
): SearchAPI {
  const { buildIndex = buildIndexDefault } = options;

  if (source._i18n) {
    return createI18nSearchAPI('advanced', {
      ...options,
      i18n: source._i18n,
      async indexes() {
        const indexes = source.getLanguages().flatMap((entry) => {
          return entry.pages.map(async (page) => {
            const index = await buildIndex(page);
            index.breadcrumbs ??= buildBreadcrumbsDefault(source, page);

            return {
              ...index,
              locale: entry.language,
            };
          });
        });

        return Promise.all(indexes);
      },
    });
  }

  return createSearchAPI('advanced', {
    ...options,
    async indexes() {
      const indexes = source.getPages().map(async (page) => {
        const index = await buildIndex(page);
        index.breadcrumbs ??= buildBreadcrumbsDefault(source, page);

        return index;
      });

      return Promise.all(indexes);
    },
  });
}
