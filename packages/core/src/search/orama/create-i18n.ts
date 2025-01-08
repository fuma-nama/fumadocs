import { type Language, type Tokenizer } from '@orama/orama';
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
import { createEndpoint } from '@/search/orama/create-endpoint';
import { type I18nConfig } from '@/i18n';
import { STEMMERS } from '@/search/orama/_stemmers';

export type LocaleMap<O> = Record<string, Language | O>;

type Options<O extends SimpleOptions | AdvancedOptions, Idx> = Omit<
  O,
  'language' | 'indexes'
> & {
  i18n: I18nConfig;

  /**
   * Map locale name from i18n config to Orama compatible `language` or options
   */
  localeMap?: LocaleMap<Partial<O>>;

  indexes: WithLocale<Idx>[] | Dynamic<WithLocale<Idx>>;
};

type I18nSimpleOptions = Options<SimpleOptions, Index>;
type I18nAdvancedOptions = Options<AdvancedOptions, AdvancedIndex>;

type WithLocale<T> = T & {
  locale: string;
};

async function getTokenizer(
  locale: string,
): Promise<{ language: string } | { tokenizer: Tokenizer }> {
  return {
    language:
      Object.keys(STEMMERS).find((lang) => STEMMERS[lang] === locale) ?? locale,
  };
}

async function initSimple(
  options: I18nSimpleOptions,
): Promise<Map<string, SearchServer>> {
  const map = new Map<string, SearchServer>();
  if (options.i18n.languages.length === 0) {
    return map;
  }

  const indexes =
    typeof options.indexes === 'function'
      ? await options.indexes()
      : options.indexes;

  for (const locale of options.i18n.languages) {
    const localeIndexes = indexes.filter((index) => index.locale === locale);
    const searchLocale =
      options.localeMap?.[locale] ?? (await getTokenizer(locale));

    map.set(
      locale,
      typeof searchLocale === 'object'
        ? initSimpleSearch({
            ...options,
            ...searchLocale,
            indexes: localeIndexes,
          })
        : initSimpleSearch({
            ...options,
            language: searchLocale,
            indexes: localeIndexes,
          }),
    );
  }

  return map;
}

async function initAdvanced(
  options: I18nAdvancedOptions,
): Promise<Map<string, SearchServer>> {
  const map = new Map<string, SearchServer>();
  if (options.i18n.languages.length === 0) {
    return map;
  }

  const indexes =
    typeof options.indexes === 'function'
      ? await options.indexes()
      : options.indexes;

  for (const locale of options.i18n.languages) {
    const localeIndexes = indexes.filter((index) => index.locale === locale);
    const searchLocale =
      options.localeMap?.[locale] ?? (await getTokenizer(locale));

    map.set(
      locale,
      typeof searchLocale === 'object'
        ? initAdvancedSearch({
            ...options,
            indexes: localeIndexes,
            ...searchLocale,
          })
        : initAdvancedSearch({
            ...options,
            language: searchLocale,
            indexes: localeIndexes,
          }),
    );
  }

  return map;
}

export function createI18nSearchAPI<T extends 'simple' | 'advanced'>(
  type: T,
  options: T extends 'simple' ? I18nSimpleOptions : I18nAdvancedOptions,
): SearchAPI {
  const get =
    type === 'simple'
      ? initSimple(options as I18nSimpleOptions)
      : initAdvanced(options as I18nAdvancedOptions);
  return createEndpoint({
    async export() {
      const map = await get;
      const entries = Object.entries(map).map(async ([k, v]) => [
        k,
        await (v as SearchServer).export(),
      ]);

      return {
        type: 'i18n',
        data: Object.fromEntries(await Promise.all(entries)) as object,
      };
    },
    async search(query, searchOptions) {
      const map = await get;

      const locale = searchOptions?.locale ?? options.i18n.defaultLanguage;
      const handler = map.get(locale);

      if (handler) return handler.search(query, searchOptions);
      return [];
    },
  });
}
