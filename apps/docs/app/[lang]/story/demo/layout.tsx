import type { Metadata } from 'next';
import { i18n } from '@/lib/i18n';
import { notFound } from 'next/navigation';

/** the hands-on screens of the landing's figure 04, a route each so a frame loads only its own */
export const metadata: Metadata = {
  robots: { index: false },
};

export default async function Layout({ params, children }: LayoutProps<'/[lang]/story/demo'>) {
  if ((await params).lang !== i18n.defaultLanguage) notFound();
  return children;
}

/** English only, unlike the docs */
export function generateStaticParams() {
  return [{ lang: i18n.defaultLanguage }];
}
