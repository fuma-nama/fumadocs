import { type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { AlbumIcon, BookIcon, Heart, LayoutTemplateIcon } from 'lucide-react';
import Image from 'next/image';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { FumadocsIcon } from '@/app/layout.client';
import Logo from '@/public/logo.png';
import { utils } from '@/app/source';
import { modes } from '@/utils/modes';

export const baseOptions: BaseLayoutProps = {
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
        <span className="font-medium [.uwu_&]:hidden [header_&]:text-[15px]">
          Fumadocs
        </span>
      </>
    ),
    transparentMode: 'top',
  },
  links: [
    {
      icon: <BookIcon />,
      text: 'Documentation',
      url: '/docs/ui',
      active: 'none',
    },
    {
      icon: <AlbumIcon />,
      text: 'Blog',
      url: '/blog',
      active: 'nested-url',
    },
    {
      text: 'Showcase',
      url: '/showcase',
      icon: <LayoutTemplateIcon />,
    },
    {
      text: 'Sponsors',
      url: '/sponsors',
      icon: <Heart />,
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
