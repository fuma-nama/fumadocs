import { SiteHomeLayout } from '@/components/layouts/home';
import { i18n } from '@/lib/i18n';

export default function Layout({ children }: LayoutProps<'/[lang]'>) {
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
