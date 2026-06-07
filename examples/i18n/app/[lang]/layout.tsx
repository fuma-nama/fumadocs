import 'fumadocs-ui/style.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Inter } from 'next/font/google';
import { i18nProps } from '@/lib/layout.shared';
import { i18nProvider } from 'fumadocs-ui/i18n';

const inter = Inter({
  subsets: ['latin'],
});

export default async function Layout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  return (
    <html lang={lang} className={inter.className} suppressHydrationWarning>
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <RootProvider i18n={i18nProvider(i18nProps(lang))}>{children}</RootProvider>
      </body>
    </html>
  );
}
