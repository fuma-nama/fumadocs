import 'katex/dist/katex.min.css';
import './global.css';
import type { Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { baseUrl, createMetadata } from '@/lib/metadata';
import { Body } from '@/app/layout.client';
import { Provider } from './provider';

export const metadata = createMetadata({
  title: {
    template: '%s | Fumadocs',
    default: 'Fumadocs',
  },
  description: 'The Next.js framework for building documentation sites',
  metadataBase: baseUrl,
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#fff' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <Body>
        <Provider>{children}</Provider>
      </Body>
    </html>
  );
}
