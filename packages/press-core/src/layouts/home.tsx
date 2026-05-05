import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { AppContext, baseOptions } from '@/lib/shared';

export default function Layout({ config, children }: AppContext & { children: ReactNode }) {
  return <HomeLayout {...baseOptions(config)}>{children}</HomeLayout>;
}
