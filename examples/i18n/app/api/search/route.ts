import { getPages } from '@/app/source';
import { createI18nSearchAPI } from 'fumadocs-core/search/server';
import { i18n } from '@/i18n';

export const { GET } = createI18nSearchAPI('advanced', {
  indexes: i18n.languages.map((lang) => {
    return {
      language: lang,
      indexes: getPages(lang)!.map((page) => ({
        id: page.url,
        url: page.url,
        title: page.data.title,
        structuredData: page.data.exports.structuredData,
      })),
    };
  }),
});
