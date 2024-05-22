import { RootProvider } from 'fumadocs-ui/provider';
import 'fumadocs-ui/style.css';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { I18nProvider, LanguageSelect } from 'fumadocs-ui/i18n';
import { pageTree } from '@/app/source';
import { DocsLayout } from 'fumadocs-ui/layout';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({
  params,
  children,
}: {
  params: { lang: string };
  children: ReactNode;
}) {
  return (
    <html lang={params.lang} className={inter.className}>
      <body>
        <I18nProvider
          locale={params.lang}
          translations={{
            en: {
              name: 'English',
            },
            cn: {
              name: 'Chinese',
              toc: '目錄',
              search: '搜尋文檔',
              lastUpdate: '最後更新於',
              searchNoResult: '沒有結果',
            },
          }}
        >
          <RootProvider>
            <DocsLayout
              tree={pageTree[params.lang]}
              nav={{ title: 'My App' }}
              sidebar={{ footer: <LanguageSelect /> }}
            >
              {children}
            </DocsLayout>
          </RootProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
