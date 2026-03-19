import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: {
      title: 'Waku',
      url: `/${locale}`,
    },
  };
}
