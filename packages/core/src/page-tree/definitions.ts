import type { ReactNode } from 'react';

interface INode {
  /**
   * ID for the node, unique in all page trees (even across different locales)
   */
  $id?: string;
}

export interface Root extends INode {
  name: ReactNode;
  children: Node[];
  /**
   * Another page tree that won't be displayed unless being opened.
   */
  fallback?: Root;
}

export type Node = Item | Separator | Folder;

export interface Item extends INode {
  /**
   * @internal
   */
  $ref?: {
    file: string;
  };

  type: 'page';
  name: ReactNode;
  url: string;
  /**
   * Whether the link should be treated as external (e.g. use HTML <a> tag).
   *
   * When unspecified, it depends on the value of `url`.
   */
  external?: boolean;

  description?: ReactNode;
  icon?: ReactNode;
}

export interface Separator extends INode {
  type: 'separator';
  name?: ReactNode;
  icon?: ReactNode;
}

export interface Folder extends INode {
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
