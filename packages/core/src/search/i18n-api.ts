import {
  type AdvancedIndex,
  type AdvancedOptions,
  createSearchAPI,
  type Dynamic,
  type Index,
  type SearchAPI,
  type SimpleOptions,
} from '@/search/server';
import { createEndpoint } from '@/search/create-endpoint';
import { type I18nConfig } from '@/i18n';

interface I18nSimpleOptions
  extends Omit<SimpleOptions, 'language' | 'indexes'> {
  i18n: I18nConfig;
  indexes: WithLocale<Index>[] | Dynamic<WithLocale<Index>>;
}

interface I18nAdvancedOptions
  extends Omit<AdvancedOptions, 'language' | 'indexes'> {
  i18n: I18nConfig;
  indexes: WithLocale<AdvancedIndex>[] | Dynamic<WithLocale<AdvancedIndex>>;
}

type WithLocale<T extends object> = T & {
  locale: string;
};

export function createI18nSearchAPI<T extends 'simple' | 'advanced'>(
  type: T,
  options: T extends 'simple' ? I18nSimpleOptions : I18nAdvancedOptions,
): SearchAPI {
  const map = new Map<string, SearchAPI>();

  return createEndpoint(async (query, searchOptions) => {
    if (map.size === 0) {
      const indexes =
        typeof options.indexes === 'function'
          ? await options.indexes()
          : options.indexes;

      for (const locale of options.i18n.languages) {
        const api = createSearchAPI(type, {
          ...options,
          language: locale,
          indexes: indexes.filter((index) => index.locale === locale),
        });
        map.set(locale, api);
      }
    }

    const handler = map.get(
      searchOptions?.locale ?? options.i18n.defaultLanguage,
    );

    if (handler) return handler.search(query, searchOptions);
    return [];
  });
}
