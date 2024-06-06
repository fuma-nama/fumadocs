import type { ReactElement } from 'react';

export interface Root {
  name: string;
  children: Node[];
}

export type Node = Item | Separator | Folder;

export interface Item {
  type: 'page';
  name: string;
  url: string;
  external?: boolean;
  icon?: ReactElement;
}

export interface Separator {
  type: 'separator';
  name: string;
}

export interface Folder {
  type: 'folder';
  id: string;
  name: string;
  root?: boolean;
  defaultOpen?: boolean;
  index?: Item;
  icon?: ReactElement;
  children: Node[];
}
