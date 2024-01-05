import { DocsLayout } from 'next-docs-ui/layout';
import type { ReactNode } from 'react';
import { LayoutTemplateIcon, StarsIcon } from 'lucide-react';
import { utils } from '@/utils/source';
import { Body, NavChildren, SidebarBanner } from './layout.client';

export const layoutOptions = {
  nav: {
    title: (
      <>
        <StarsIcon className="h-5 w-5" fill="currentColor" />
        <span className="ml-1.5 font-semibold max-md:hidden">Next Docs</span>
      </>
    ),
    children: <NavChildren />,
    githubUrl: 'https://github.com/fuma-nama/next-docs',
  },
  sidebar: {
    defaultOpenLevel: 0,
    banner: <SidebarBanner />,
  },
  links: [
    {
      text: 'Showcase',
      url: '/showcase',
      icon: <LayoutTemplateIcon fill="currentColor" />,
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
      <DocsLayout tree={utils.pageTree} {...layoutOptions}>
        {children}
      </DocsLayout>
    </Body>
  );
}
