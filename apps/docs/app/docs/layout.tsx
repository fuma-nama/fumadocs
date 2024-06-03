import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { utils } from '@/utils/source';
import { SidebarBanner } from '@/app/docs/layout.client';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <DocsLayout
      {...baseOptions}
      tree={utils.pageTree}
      sidebar={{
        banner: <SidebarBanner />,
      }}
    >
      {children}
    </DocsLayout>
  );
}
