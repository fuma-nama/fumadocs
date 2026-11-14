import { SiteHomeLayout } from '@/components/layouts/home';
import { i18n } from '@/lib/i18n';
import { notFound } from 'next/navigation';

export default async function Layout({ params, children }: LayoutProps<'/[lang]'>) {
  if ((await params).lang !== i18n.defaultLanguage) notFound();
  return (
    <SiteHomeLayout className="dark:bg-neutral-950 dark:[--color-fd-background:var(--color-neutral-950)] [--color-fd-primary:var(--color-brand)]">
      {children}
    </SiteHomeLayout>
  );
}

/** English only, unlike the docs */
export function generateStaticParams() {
  return [{ lang: i18n.defaultLanguage }];
}
