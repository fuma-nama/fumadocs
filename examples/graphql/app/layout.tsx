import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Geist, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

const geist = Geist({
  subsets: ['latin'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.className} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
