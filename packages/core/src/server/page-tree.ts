import type { ReactElement, ReactNode } from 'react';

export interface Root {
  $id?: string;

  name: ReactNode;
  children: Node[];
}

export type Node = Item | Separator | Folder;

export interface Item {
  $id?: string;
  $ref?: {
    file: string;
  };

  type: 'page';
  name: ReactNode;
  url: string;
  external?: boolean;

  description?: ReactNode;
  icon?: ReactElement;
}

export interface Separator {
  $id?: string;

  type: 'separator';
  name: ReactNode;
  icon?: ReactElement;
}

export interface Folder {
  $id?: string;
  $ref?: {
    metaFile?: string;
  };

  type: 'folder';
  name: ReactNode;
  description?: ReactNode;
  root?: boolean;
  defaultOpen?: boolean;
  index?: Item;
  icon?: ReactElement;
  children: Node[];
}
