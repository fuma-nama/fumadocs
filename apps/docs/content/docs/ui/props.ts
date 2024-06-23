import type { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { Callout } from 'fumadocs-ui/components/callout';
import type {
  API,
  APIExample,
  APIInfo,
  Property,
  Root,
} from 'fumadocs-ui/components/api';
import type { File, Folder } from 'fumadocs-ui/components/files';
import type { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import type { RollButton } from 'fumadocs-ui/components/roll-button';
import type { TypeTable } from 'fumadocs-ui/components/type-table';
import type { Card } from 'fumadocs-ui/components/card';
import type { DocsLayoutProps } from 'fumadocs-ui/layout';
import type { AnchorHTMLAttributes, ComponentPropsWithoutRef } from 'react';
import type { DocsPageProps } from 'fumadocs-ui/page';
import type { AutoTypeTable } from 'fumadocs-typescript/ui';

export type AccordionsProps = Omit<
  ComponentPropsWithoutRef<typeof Accordions>,
  keyof ComponentPropsWithoutRef<'div'> | 'value' | 'onValueChange'
>;

export type AccordionProps = Omit<
  ComponentPropsWithoutRef<typeof Accordion>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type RootProps = Omit<
  ComponentPropsWithoutRef<typeof Root>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type ApiProps = Omit<
  ComponentPropsWithoutRef<typeof API>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type ApiExampleProps = Omit<
  ComponentPropsWithoutRef<typeof APIExample>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type APIInfoProps = Omit<
  ComponentPropsWithoutRef<typeof APIInfo>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type PropertyProps = Omit<
  ComponentPropsWithoutRef<typeof Property>,
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
export type TOCPopoverProps = NonNullable<
  DocsPageProps['tableOfContentPopover']
>;

export type FooterProps = NonNullable<DocsPageProps['footer']>;

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
