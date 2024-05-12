import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { layoutOptions } from '@/app/layout.config';
import { Body } from '../layout.client';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <Body>
      <DocsLayout {...layoutOptions}>{children}</DocsLayout>
    </Body>
  );
}
