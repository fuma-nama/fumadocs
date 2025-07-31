import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '../../source';

type RootLayoutProps = { children: ReactNode; path: string };

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Waku',
      }}
    >
      {children}
    </DocsLayout>
  );
}

export const getConfig = async () => {
  return {
    render: 'static',
  };
};
