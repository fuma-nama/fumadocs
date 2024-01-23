import type { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { Callout } from 'fumadocs-ui/components/callout';
import type { File } from 'fumadocs-ui/components/files';
import type { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import type { RollButton } from 'fumadocs-ui/components/roll-button';
import type { TypeTable } from 'fumadocs-ui/components/type-table';
import type { Card } from 'fumadocs-ui/mdx/card';
import type { DocsLayoutProps } from 'fumadocs-ui/layout';
import type { AnchorHTMLAttributes, ComponentPropsWithoutRef } from 'react';
import type { DocsPageProps } from 'fumadocs-ui/page';
import type { RootProviderProps } from 'fumadocs-ui/provider';

export type AccordionsProps = Omit<
  ComponentPropsWithoutRef<typeof Accordions>,
  keyof ComponentPropsWithoutRef<'div'> | 'value' | 'onValueChange'
>;

export type AccordionProps = Omit<
  ComponentPropsWithoutRef<typeof Accordion>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type CalloutProps = Omit<
  ComponentPropsWithoutRef<typeof Callout>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type FileProps = ComponentPropsWithoutRef<typeof File>;

export type InlineTOCProps = Omit<
  ComponentPropsWithoutRef<typeof InlineTOC>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type CardProps = Omit<
  ComponentPropsWithoutRef<typeof Card>,
  keyof Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>
>;

export type RollButtonProps = ComponentPropsWithoutRef<typeof RollButton>;

export type TypeTableProps = ComponentPropsWithoutRef<typeof TypeTable>;

export type ObjectTypeProps = ComponentPropsWithoutRef<
  typeof TypeTable
>['type'][string];

export type LayoutProps = DocsLayoutProps;

export type NavbarProps = NonNullable<DocsLayoutProps['nav']>;

export type SidebarProps = NonNullable<DocsLayoutProps['sidebar']>;

export type PageProps = DocsPageProps;

export type BreadcrumbProps = NonNullable<DocsPageProps['breadcrumb']>;

export type TOCProps = NonNullable<DocsPageProps['tableOfContent']>;

export type FooterProps = NonNullable<DocsPageProps['footer']>;

export type ProviderProps = RootProviderProps;
