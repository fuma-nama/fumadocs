import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n } from '@/lib/i18n';

export function baseOptions(locale = i18n.defaultLanguage): BaseLayoutProps {
  return {
    LanguageSwitch: true,
    nav: {
      title: `React Router ${locale}`,
    },
  };
}
