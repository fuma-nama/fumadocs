import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/app/layout.config';

export default function Layout({
  params: { lang },
  children,
}: {
  params: { lang: string };
  children: ReactNode;
}) {
  return (
    <DocsLayout
      {...baseOptions}
      tree={source.pageTree[lang]}
      nav={{
        ...baseOptions.nav,
        title: lang === 'cn' ? '文檔' : 'My App',
        url: `/${lang}`,
      }}
    >
      {children}
    </DocsLayout>
  );
}
