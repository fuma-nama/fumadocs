import type * as Breadcrumb from 'fumadocs-core/breadcrumb';
import type * as TOC from 'fumadocs-core/toc';
import type * as Server from 'fumadocs-core/server';
import type * as Sidebar from 'fumadocs-core/sidebar';
import type { SortedResult as OriginalSortedResult } from 'fumadocs-core/search/shared';
import type { ElementType } from 'react';
import type * as MDX from 'fumadocs-core/mdx-plugins';

export type SortedResult = OriginalSortedResult;

export type StructureOptions = MDX.StructureOptions;

export type BreadcrumbItem = Breadcrumb.BreadcrumbItem;

export type SidebarProviderProps = Sidebar.SidebarProviderProps;
export type SidebarTriggerProps = Sidebar.SidebarTriggerProps<ElementType>;

export type ScrollProviderProps = TOC.ScrollProviderProps;
export type AnchorProviderProps = TOC.AnchorProviderProps;

export type TOCItemType = Server.TOCItemType;

export type PageTreeItem = Server.PageTree.Item;
export type PageTreeFolder = Server.PageTree.Folder;
export type PageTreeRoot = Server.PageTree.Root;
export type PageTreeSeparator = Server.PageTree.Separator;

export type RemarkImageOptions = MDX.RemarkImageOptions;
