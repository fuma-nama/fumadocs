import { Layout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';

export default function HomeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <Layout {...baseOptions}>{children}</Layout>;
}
