import { type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { AlbumIcon, BookIcon, Heart, LayoutTemplateIcon } from 'lucide-react';
import Image from 'next/image';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Slot } from '@radix-ui/react-slot';
import { FumadocsIcon } from '@/app/layout.client';
import Logo from '@/public/logo.png';
import { source } from '@/app/source';

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
  tree: source.pageTree,
  nav: {
    ...baseOptions.nav,
    transparentMode: 'none',
  },
  links: baseOptions.links?.slice(1),
  sidebar: {
    tabs: {
      transform(option, node) {
        const meta = source.getNodeMeta(node);
        if (!meta) return option;

        return {
          ...option,
          icon: (
            <Slot
              className="mb-auto bg-gradient-to-t from-fd-background/80 p-1 [&_svg]:size-5"
              style={{
                color: `hsl(var(--${meta.file.dirname}-color))`,
                backgroundColor: `hsl(var(--${meta.file.dirname}-color)/.3)`,
              }}
            >
              {node.icon}
            </Slot>
          ),
        };
      },
    },
  },
};
