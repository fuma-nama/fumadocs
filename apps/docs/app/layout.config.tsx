import type { DocsLayoutProps } from 'fumadocs-ui/layout';
import { BookIcon, LayoutTemplateIcon } from 'lucide-react';
import { utils } from '@/utils/source';
import { NavChildren, SidebarBanner, Title } from '@/app/layout.client';

export const layoutOptions: Omit<DocsLayoutProps, 'children'> = {
  tree: utils.pageTree,
  nav: {
    transparentMode: 'top',
    title: <Title />,
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
      icon: <LayoutTemplateIcon />,
    },
    {
      type: 'menu',
      text: 'Guide',
      icon: <BookIcon />,
      items: [
        {
          text: 'Getting Started',
          url: '/docs/ui',
        },
        {
          text: 'Learn More',
          url: '/docs',
        },
      ],
    },
  ],
};
