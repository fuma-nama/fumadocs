import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '../../source';

export default function Layout({
  children,
}: {
  children: ReactNode;
  path: string;
}) {
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
