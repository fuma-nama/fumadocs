import { Layout } from 'next-docs-ui/layout';
import type { ReactNode } from 'react';
import { layoutOptions } from '../docs/layout';

export default function HomeLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return <Layout {...layoutOptions}>{children}</Layout>;
}
