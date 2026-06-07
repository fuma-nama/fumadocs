import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { I18nProviderProps } from 'fumadocs-ui/contexts/i18n';
import { i18n } from '@/lib/i18n';
import { translations as zhTW } from '@fumadocs/language/zh-tw';

export function i18nProps(locale: string): I18nProviderProps {
  const locales = i18n.languages.map((code) => ({
    locale: code,
    name: code === 'cn' ? 'Chinese' : 'English',
  }));

  if (locale === 'cn') {
    return {
      locale,
      locales,
      translations: {
        ...zhTW,
        'Search(search dialog input placeholder)': 'Translated Content',
      },
    };
  }

  return { locale, locales };
}

export function baseOptions(locale: string): BaseLayoutProps {
  return {
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
