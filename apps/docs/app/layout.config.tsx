import { type BaseLayoutProps } from 'fumadocs-ui/layout';
import { BookIcon, LayoutTemplateIcon } from 'lucide-react';
import Image from 'next/image';
import { FumadocsIcon, NavChildren } from '@/app/layout.client';
import Logo from '@/public/logo.png';

export const baseOptions: BaseLayoutProps = {
  githubUrl: 'https://github.com/fuma-nama/fumadocs',
  nav: {
    transparentMode: 'top',
    title: (
      <>
        <Image
          alt="Fumadocs"
          src={Logo}
          sizes="100px"
          className="hidden w-20 md:w-24 [.uwu_&]:block"
          aria-label="Fumadocs"
        />

        <FumadocsIcon
          className="size-5 [.uwu_&]:hidden [aside_&]:size-4"
          fill="currentColor"
        />
        <span className="[.uwu_&]:hidden max-md:[nav_&]:hidden">Fumadocs</span>
      </>
    ),
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
