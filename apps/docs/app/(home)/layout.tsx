import { SiteHomeLayout } from '@/components/layouts/home';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <SiteHomeLayout className="dark:bg-neutral-950 dark:[--color-fd-background:var(--color-neutral-950)] [--color-fd-primary:var(--color-brand)]">
      {children}
    </SiteHomeLayout>
  );
}
