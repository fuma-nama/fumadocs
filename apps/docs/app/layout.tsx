import './global.css';
import type { Viewport } from 'next';
import { baseUrl, createMetadata } from '@/lib/metadata';
import { Body } from '@/app/layout.client';
import { Provider } from './provider';
import { AISearchTrigger } from '@/components/ai';
import { MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';

export const metadata = createMetadata({
  title: {
    template: '%s | Fumadocs',
    default: 'Fumadocs',
  },
  description: 'The Next.js framework for building documentation sites',
  metadataBase: baseUrl,
});

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const mono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#fff' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <Body>
        <Provider>
          {children}
          <AISearchTrigger>
            <MessageCircle className="size-4" />
            Ask AI
          </AISearchTrigger>
        </Provider>
      </Body>
    </html>
  );
}
