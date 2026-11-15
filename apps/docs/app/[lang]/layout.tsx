import '../global.css';
import type { Viewport } from 'next';
import { baseUrl, createMetadata } from '@/lib/metadata';
import { Body } from '@/app/layout.client';
import { Framework, Provider } from '@/app/provider';
import { Geist, JetBrains_Mono } from 'next/font/google';
import { TreeContextProvider } from 'fumadocs-ui/contexts/tree';
import { source } from '@/lib/source';
import { i18n } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import { i18nProvider, uiTranslations } from 'fumadocs-ui/i18n';
import { openapiTranslations } from 'fumadocs-openapi/i18n';
import { asyncapiTranslations } from '@fumadocs/asyncapi/i18n';
import { graphqlTranslations } from '@fumadocs/graphql/i18n';
import { storyTranslations } from '@fumadocs/story/i18n';
import { aiChatTranslations } from '@fumadocs/ai-chat/i18n';
import { zhTW } from '@fumadocs/language/zh-tw';
import { ja } from '@fumadocs/language/ja';

export const metadata = createMetadata({
  title: {
    template: '%s | Fumadocs',
    default: 'Fumadocs',
  },
  description: 'The React.js documentation framework.',
  metadataBase: baseUrl,
});

const translations = i18n
  .translations()
  .extend(uiTranslations())
  .extend(openapiTranslations())
  .extend(asyncapiTranslations())
  .extend(graphqlTranslations())
  .extend(storyTranslations())
  .extend(aiChatTranslations())
  .preset('zh-TW', zhTW())
  .preset('ja', ja());

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#fff' },
  ],
};

export default async function RootLayout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!i18n.languages.some((item) => item === lang)) notFound();

  return (
    <html lang={lang} className={`${geist.variable} ${mono.variable}`} suppressHydrationWarning>
      <Body>
        <Framework>
          <TreeContextProvider tree={source.getPageTree(lang)}>
            <Provider i18n={i18nProvider(translations, lang)}>{children}</Provider>
          </TreeContextProvider>
        </Framework>
      </Body>
    </html>
  );
}
