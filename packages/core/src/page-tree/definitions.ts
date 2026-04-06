import type { ReactNode } from 'react';

interface ID {
  /**
   * ID for the node, unique in all page trees (even across different locales)
   */
  $id?: string;
}

export interface Root extends ID {
  /**
   * @internal meta file path
   */
  $ref?: string;

  type?: 'root';
  name: ReactNode;
  description?: ReactNode;
  children: Node[];
  /**
   * Another page tree that won't be displayed unless being opened.
   */
  fallback?: Root;
}

export type Node = Item | Separator | Folder;

export interface Item extends ID {
  /**
   * @internal page file path
   */
  $ref?: string;

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

export interface Separator extends ID {
  type: 'separator';
  name?: ReactNode;
  icon?: ReactNode;
}

export interface Folder extends ID {
  /**
   * @internal meta file path
   */
  $ref?: string;

  type: 'folder';
  name: ReactNode;
  description?: ReactNode;
  root?: boolean;
  defaultOpen?: boolean;
  collapsible?: boolean;
  index?: Item;
  icon?: ReactNode;
  children: Node[];
}
