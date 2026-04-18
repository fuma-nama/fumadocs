import { getSource } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={(await getSource()).getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
