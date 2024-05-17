import type {
  Accordion,
  Accordions,
} from '@maximai/fumadocs-ui/components/accordion';
import type { Callout } from '@maximai/fumadocs-ui/components/callout';
import type { File, Folder } from '@maximai/fumadocs-ui/components/files';
import type { InlineTOC } from '@maximai/fumadocs-ui/components/inline-toc';
import type { RollButton } from '@maximai/fumadocs-ui/components/roll-button';
import type { TypeTable } from '@maximai/fumadocs-ui/components/type-table';
import type { Card } from '@maximai/fumadocs-ui/components/card';
import type { DocsLayoutProps } from '@maximai/fumadocs-ui/layout';
import type { AnchorHTMLAttributes, ComponentPropsWithoutRef } from 'react';
import type { DocsPageProps } from '@maximai/fumadocs-ui/page';
import type { RootProviderProps } from '@maximai/fumadocs-ui/provider';
import type { AutoTypeTable } from 'fumadocs-typescript/ui';

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

export type FileProps = Omit<
  ComponentPropsWithoutRef<typeof File>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type FolderProps = Omit<
  ComponentPropsWithoutRef<typeof Folder>,
  keyof ComponentPropsWithoutRef<'div'>
>;

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

export type AutoTypeTableProps = ComponentPropsWithoutRef<typeof AutoTypeTable>;

export interface AutoTypeTableExample {
  /**
   * Markdown syntax like links, `code` are supported.
   *
   * See https://fumadocs.vercel.app/docs/ui/components/type-table
   */
  name: string;

  options: Partial<{ a: unknown }>;
}
