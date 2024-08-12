import { type DocsLayoutProps } from 'fumadocs-ui/layout';
import { BookIcon, LayoutTemplateIcon } from 'lucide-react';
import Image from 'next/image';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import type { HomeLayoutProps } from 'fumadocs-ui/home-layout';
import { FumadocsIcon, NavChildren } from '@/app/layout.client';
import Logo from '@/public/logo.png';
import { utils } from '@/utils/source';
import { modes } from '@/utils/modes';

export const baseOptions: HomeLayoutProps = {
  githubUrl: 'https://github.com/fuma-nama/fumadocs',
  nav: {
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
          className="size-4 [.uwu_&]:hidden [header_&]:size-5"
          fill="currentColor"
        />
        <span className="font-medium [.uwu_&]:hidden max-md:[header_&]:hidden">
          Fumadocs
        </span>
      </>
    ),
    transparentMode: 'top',
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

export const docsOptions: DocsLayoutProps = {
  ...baseOptions,
  tree: utils.pageTree,
  nav: {
    ...baseOptions.nav,
    transparentMode: 'none',
    children: undefined,
  },
  sidebar: {
    banner: (
      <RootToggle
        options={modes.map((mode) => ({
          url: `/docs/${mode.param}`,
          icon: (
            <mode.icon
              className="size-9 shrink-0 rounded-md bg-gradient-to-t from-fd-background/80 p-1.5"
              style={{
                backgroundColor: `hsl(var(--${mode.param}-color)/.3)`,
                color: `hsl(var(--${mode.param}-color))`,
              }}
            />
          ),
          title: mode.name,
          description: mode.description,
        }))}
      />
    ),
  },
};
