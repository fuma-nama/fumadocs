import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';

/** the hands-on screens of the landing's figure 04, a route each so a frame loads only its own */
export const metadata: Metadata = {
  robots: { index: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

/** English only, unlike the docs */
export function generateStaticParams() {
  return [{ lang: i18n.defaultLanguage }];
}
