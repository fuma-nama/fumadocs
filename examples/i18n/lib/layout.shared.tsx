import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n } from '@/lib/i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { zhTW } from '@fumadocs/language/zh-tw';

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add(zhTW('cn'))
  .add('ui', {
    cn: {
      displayName: 'Chinese',
    },
  });

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
