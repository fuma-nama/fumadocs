import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n } from '@/lib/i18n';
import { defineI18nUI } from 'fumadocs-ui/i18n';

export const i18nUI = defineI18nUI(i18n, {
  translations: {
    en: {
      displayName: 'English',
    },
    cn: {
      displayName: 'Chinese',
      toc: '目錄',
      search: '搜尋文檔',
      lastUpdate: '最後更新於',
      searchNoResult: '沒有結果',
      previousPage: '上一頁',
      nextPage: '下一頁',
      chooseLanguage: '選擇語言',
    },
  },
});

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    i18n: i18nUI,
    nav: {
      title: locale === 'cn' ? 'Chinese Docs' : 'English Docs',
      url: `/${locale}`,
    },
    githubUrl: 'https://github.com',
    links: [
      {
        type: 'main',
        text: locale === 'cn' ? '文檔' : 'Documentation',
        url: `/${locale}/docs`,
      },
    ],
  };
}
