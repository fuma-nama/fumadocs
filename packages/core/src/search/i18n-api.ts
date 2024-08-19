import {
  type AdvancedIndex,
  type AdvancedOptions,
  type Dynamic,
  type Index,
  initAdvancedSearch,
  initSimpleSearch,
  type SearchAPI,
  type SearchServer,
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

type WithLocale<T> = T & {
  locale: string;
};

export function createI18nSearchAPI<T extends 'simple' | 'advanced'>(
  type: T,
  options: T extends 'simple' ? I18nSimpleOptions : I18nAdvancedOptions,
): SearchAPI {
  const map = new Map<string, SearchServer>();

  async function init(): Promise<void> {
    if (options.i18n.languages.length === 0) {
      return;
    }

    const indexes =
      typeof options.indexes === 'function'
        ? await options.indexes()
        : options.indexes;

    for (const locale of options.i18n.languages) {
      const localeIndexes = indexes.filter((index) => index.locale === locale);

      if (type === 'simple') {
        map.set(
          locale,
          initSimpleSearch({
            ...options,
            language: locale,
            indexes: localeIndexes as SimpleOptions['indexes'],
          }),
        );
        continue;
      }

      map.set(
        locale,
        initAdvancedSearch({
          ...options,
          language: locale,
          indexes: localeIndexes as AdvancedOptions['indexes'],
        }),
      );
    }
  }

  return createEndpoint({
    search: async (query, searchOptions) => {
      if (map.size === 0) await init();

      const handler = map.get(
        searchOptions?.locale ?? options.i18n.defaultLanguage,
      );

      if (handler) return handler.search(query, searchOptions);
      return [];
    },
  });
}
