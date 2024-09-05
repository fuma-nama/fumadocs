import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/home-layout';
import { baseOptions } from '../layout.config';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
}
