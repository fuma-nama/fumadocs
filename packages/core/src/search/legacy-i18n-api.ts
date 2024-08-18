import {
  type AdvancedOptions,
  createSearchAPI,
  type SearchAPI,
  type SimpleOptions,
} from '@/search/server';
import { createEndpoint } from '@/search/create-endpoint';

type ToI18n<T extends { indexes: unknown }> = Omit<
  T,
  'indexes' | 'language'
> & {
  indexes: (
    | [language: string, indexes: T['indexes']]
    | {
        language: string;
        indexes: T['indexes'];
      }
  )[];
};

export function createI18nSearchAPI<T extends 'simple' | 'advanced'>(
  type: T,
  options: T extends 'simple' ? ToI18n<SimpleOptions> : ToI18n<AdvancedOptions>,
): SearchAPI {
  const map = new Map<string, SearchAPI>();

  for (const entry of options.indexes) {
    const v = Array.isArray(entry)
      ? { language: entry[0], indexes: entry[1] }
      : entry;

    map.set(
      v.language,
      // @ts-expect-error -- Index depends on generic types
      createSearchAPI(type, {
        ...options,
        language: v.language,
        indexes: v.indexes,
      }),
    );
  }

  return createEndpoint(async (query, searchOptions) => {
    if (searchOptions?.locale) {
      const handler = map.get(searchOptions.locale);

      if (handler) return handler.search(query, searchOptions);
    }

    return [];
  });
}
