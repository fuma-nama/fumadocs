import { type BaseLayoutProps } from 'fumadocs-ui/layout';
import { BookIcon, LayoutTemplateIcon } from 'lucide-react';
import { NavChildren, Title } from '@/app/layout.client';

export const baseOptions: Omit<BaseLayoutProps, 'children'> = {
  githubUrl: 'https://github.com/fuma-nama/fumadocs',
  nav: {
    transparentMode: 'top',
    title: <Title />,
    children: <NavChildren />,
  },
  links: [
    {
      icon: <BookIcon />,
      text: 'Blog',
      url: '/blog',
      active: 'nested-url',
    },
    {
      text: 'Showcase',
      url: '/showcase',
      icon: <LayoutTemplateIcon />,
    },
  ],
};
