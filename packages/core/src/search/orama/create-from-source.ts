import {
  type AdvancedIndex,
  type AdvancedOptions,
  createI18nSearchAPI,
  initAdvancedSearch,
} from './create-server';
import type { LoaderConfig, LoaderOutput, Page } from '@/source';
import type { I18nConfig } from '@/i18n';
import type { Language } from '@orama/orama';
import type { Awaitable } from '@/types';
import { createEndpoint } from '../server/endpoint';
import type { SearchAPI } from '../server/types';
import { buildIndexDefault, buildBreadcrumbsDefault } from '../server/build-index';

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

  return createEndpoint(
    initAdvancedSearch({
      ...options,
      async indexes() {
        const indexes = source.getPages().map(async (page) => {
          const index = await buildIndex(page);
          index.breadcrumbs ??= buildBreadcrumbsDefault(source, page);

          return index;
        });

        return Promise.all(indexes);
      },
    }),
  );
}

export { buildBreadcrumbsDefault };
