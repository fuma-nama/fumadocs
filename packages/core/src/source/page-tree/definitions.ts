import type { ReactNode } from 'react';

export interface Root {
  $id?: string;

  name: ReactNode;
  children: Node[];
  /**
   * Another page tree that won't be displayed unless being opened.
   */
  fallback?: Root;
}

export type Node = Item | Separator | Folder;

export interface Item {
  $id?: string;
  /**
   * @internal
   */
  $ref?: {
    file: string;
  };

  type: 'page';
  name: ReactNode;
  url: string;
  external?: boolean;

  description?: ReactNode;
  icon?: ReactNode;
}

export interface Separator {
  $id?: string;

  type: 'separator';
  name?: ReactNode;
  icon?: ReactNode;
}

export interface Folder {
  $id?: string;
  /**
   * @internal
   */
  $ref?: {
    metaFile?: string;
  };

  type: 'folder';
  name: ReactNode;
  description?: ReactNode;
  root?: boolean;
  defaultOpen?: boolean;
  index?: Item;
  icon?: ReactNode;
  children: Node[];
}
