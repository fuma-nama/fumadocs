import type { ReactElement } from 'react';

export interface PageTree {
  name: string;
  url?: string;
  children: TreeNode[];
}

export type TreeNode = FileNode | Separator | FolderNode;

export interface FileNode {
  type: 'page';
  name: string;
  url: string;
  icon?: ReactElement;
}

export interface Separator {
  type: 'separator';
  name: string;
}

export interface FolderNode {
  type: 'folder';
  name: string;
  index?: FileNode;
  icon?: ReactElement;
  children: TreeNode[];
}

export interface TOCItemType {
  title: string;
  url: string;
  depth: number;
}

export type TableOfContents = TOCItemType[];
