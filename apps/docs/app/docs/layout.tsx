import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { Body } from '../layout.client';
import { layoutOptions } from '@/app/layout.config';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <Body>
      <DocsLayout {...layoutOptions}>{children}</DocsLayout>
    </Body>
  );
}
