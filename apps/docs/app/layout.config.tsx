import type { DocsLayoutProps } from 'fumadocs-ui/layout';
import { utils } from '@/utils/source';
import { FumaDocsSVG } from '@/app/(home)/icons';
import { NavChildren, SidebarBanner } from '@/app/layout.client';
import { create } from '@/components/ui/icon';
import { LayoutTemplateIcon } from 'lucide-react';

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
