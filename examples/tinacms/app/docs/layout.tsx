import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { getSource } from '@/lib/source';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const source = await getSource();

  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
