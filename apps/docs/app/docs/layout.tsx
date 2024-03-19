import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { LayoutTemplateIcon } from 'lucide-react';
import { utils } from '@/utils/source';
import { create } from '@/components/ui/icon';
import { FumaDocsSVG } from '../(home)/icons';
import { Body, NavChildren, SidebarBanner } from './layout.client';

export const layoutOptions: Omit<DocsLayoutProps, 'children'> = {
  tree: utils.pageTree,
  nav: {
    transparentMode: 'top',
    title: (
      <>
        <FumaDocsSVG className="size-5" fill="currentColor" />
        <span className="max-md:hidden">Fumadocs</span>
      </>
    ),
    children: <NavChildren />,
    githubUrl: 'https://github.com/fuma-nama/fumadocs',
  },
  sidebar: {
    defaultOpenLevel: 0,
    banner: <SidebarBanner />,
  },
  links: [
    {
      text: 'Showcase',
      url: '/showcase',
      icon: create({ icon: LayoutTemplateIcon }),
    },
  ],
};

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
