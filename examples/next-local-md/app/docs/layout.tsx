import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={(await source.get()).getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
