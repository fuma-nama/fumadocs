import { source } from '@/app/source';
import { i18n } from '@/i18n';
import { createI18nSearchAPI } from 'fumadocs-core/search/server';

export const { GET } = createI18nSearchAPI('advanced', {
  i18n,
  indexes: source.getLanguages().flatMap((entry) => {
    return entry.pages.map((page) => ({
      id: page.url,
      url: page.url,
      title: page.data.title,
      structuredData: page.data.structuredData,
      locale: entry.language,
    }));
  }),
});
