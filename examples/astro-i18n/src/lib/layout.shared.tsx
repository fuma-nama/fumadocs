import { uiTranslations } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { zhTW } from '@fumadocs/language/zh-tw';
import { i18n } from './i18n';

export const translations = i18n.translations().extend(uiTranslations()).preset('cn', zhTW());

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: {
      title: 'Fumadocs on Astro',
      url: locale === i18n.defaultLanguage ? '/' : `/${locale}`,
    },
  };
}
