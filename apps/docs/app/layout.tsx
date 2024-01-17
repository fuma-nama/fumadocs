import './style.css';
import { Star } from 'lucide-react';
import type { Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Link from 'next/link';
import { baseUrl, createMetadata } from '@/utils/metadata';
import { Provider } from './provider';

export const metadata = createMetadata({
  title: {
    template: '%s | Next Docs',
    default: 'Next Docs',
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
}): JSX.Element {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <Provider>
          {children}
          <Footer />
        </Provider>
      </body>
    </html>
  );
}

function Footer(): JSX.Element {
  return (
    <footer className="mt-auto border-t bg-card py-12 text-secondary-foreground">
      <div className="container flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold">NEXT DOCS</p>
          <p className="text-xs">
            Built with ❤️ by{' '}
            <a
              href="https://fuma-dev.vercel.app"
              rel="noreferrer noopener"
              target="_blank"
              className="font-medium"
            >
              Fuma
            </a>
          </p>
        </div>

        <div className="flex flex-row flex-wrap items-center gap-12">
          <a
            href="https://github.com/fuma-nama/next-docs"
            rel="noreferrer noopener"
            className="flex flex-row items-center text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
          >
            <Star className="mr-2 size-4" />
            Give us a star
          </a>
          <Link
            href="/showcase"
            className="flex flex-row items-center text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
          >
            Showcase
          </Link>
        </div>
      </div>
    </footer>
  );
}
