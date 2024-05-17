import type * as Breadcrumb from '@maximai/fumadocs-core/breadcrumb';
import type * as TOC from '@maximai/fumadocs-core/toc';
import type * as Server from '@maximai/fumadocs-core/server';
import type * as Sidebar from '@maximai/fumadocs-core/sidebar';
import type { SortedResult as OriginalSortedResult } from '@maximai/fumadocs-core/search/shared';
import type { ComponentPropsWithoutRef, ElementType } from 'react';

export type SortedResult = OriginalSortedResult;

export type BreadcrumbItem = Breadcrumb.BreadcrumbItem;

export type SidebarProviderProps = Sidebar.SidebarProviderProps;
export type SidebarTriggerProps = Sidebar.SidebarTriggerProps<ElementType>;

export type TOCProviderProps = Omit<
  ComponentPropsWithoutRef<typeof TOC.TOCProvider>,
  keyof ComponentPropsWithoutRef<'div'>
>;

export type TOCItemType = Server.TOCItemType;

export type PageTreeItem = Server.PageTree.Item;
export type PageTreeFolder = Server.PageTree.Folder;
export type PageTreeRoot = Server.PageTree.Root;
export type PageTreeSeparator = Server.PageTree.Separator;
