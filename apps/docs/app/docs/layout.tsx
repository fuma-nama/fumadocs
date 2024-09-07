import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { docsOptions } from '@/app/layout.config';
import 'fumadocs-ui/twoslash.css';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <DocsLayout {...docsOptions}>{children}</DocsLayout>;
}
