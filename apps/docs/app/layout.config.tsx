import { type BaseLayoutProps, type DocsLayoutProps } from 'fumadocs-ui/layout';
import { BookIcon, LayoutTemplateIcon } from 'lucide-react';
import Image from 'next/image';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import { FumadocsIcon, NavChildren } from '@/app/layout.client';
import Logo from '@/public/logo.png';
import { utils } from '@/utils/source';
import { modes } from '@/utils/modes';

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
        <span className="[.uwu_&]:hidden max-md:[header_&]:hidden">
          Fumadocs
        </span>
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

export const docsOptions: DocsLayoutProps = {
  ...baseOptions,
  tree: utils.pageTree,
  sidebar: {
    defaultOpenLevel: 0,
    banner: (
      <RootToggle
        options={modes.map((mode) => ({
          url: `/docs/${mode.param}`,
          icon: (
            <mode.icon
              className="size-9 shrink-0 rounded-md bg-gradient-to-t from-background/80 p-1.5"
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
