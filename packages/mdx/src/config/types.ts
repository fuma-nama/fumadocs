import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TableOfContents } from 'fumadocs-core/server';
import { type DefaultMDXOptions } from '@/utils/mdx-options';
import type { FC } from 'react';

export interface GlobalConfig {
  /**
   * Configure global MDX options
   */
  mdxOptions?:
    | DefaultMDXOptions
    | (() => DefaultMDXOptions | Promise<DefaultMDXOptions>);

  /**
   * Fetch last modified time with specified version control
   * @defaultValue 'none'
   */
  lastModifiedTime?: 'git' | 'none';
}

export interface FileInfo {
  path: string;
  absolutePath: string;
}

export interface MarkdownProps {
  body: FC<MDXProps>;
  structuredData: StructuredData;
  toc: TableOfContents;
  _exports: Record<string, unknown>;

  /**
   * Only available when `lastModifiedTime` is enabled on MDX loader
   */
  lastModified?: Date;
}

export interface BaseCollectionEntry {
  _file: FileInfo;
}
