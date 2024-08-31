import { type z } from 'zod';
import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TableOfContents } from 'fumadocs-core/server';
import { type Collections } from '@/config/define';
import { type DefaultMDXOptions } from '@/utils/mdx-options';

export interface GlobalConfig {
  /**
   * Configure global MDX options
   */
  mdxOptions?: DefaultMDXOptions;

  /**
   * Fetch last modified time with specified version control
   * @defaultValue 'none'
   */
  lastModifiedTime?: 'git' | 'none';

  /**
   * Generate manifest file on build mode
   *
   * @defaultValue false
   */
  generateManifest?: boolean;
}

export type InferSchema<C> =
  C extends Collections<infer Schema, any, any> ? Schema : never;

export type InferSchemaType<C> = z.output<InferSchema<C>>;

export type InferCollectionsProps<C> = SupportedTypes[C extends Collections<
  any,
  infer Type,
  any
>
  ? Type
  : never];

export interface FileInfo {
  path: string;
  absolutePath: string;
}

interface MarkdownProps {
  body: (props: MDXProps) => React.ReactElement;
  structuredData: StructuredData;
  toc: TableOfContents;
  _exports: Record<string, unknown>;

  /**
   * Only available when `lastModifiedTime` is enabled on MDX loader
   */
  lastModified?: Date;
}

export interface SupportedTypes {
  // eslint-disable-next-line @typescript-eslint/ban-types -- empty object
  meta: {};
  doc: MarkdownProps;
}

export type SupportedType = keyof SupportedTypes;

export type CollectionEntry<Type extends SupportedType, Output> = Omit<
  SupportedTypes[Type],
  keyof Output
> &
  Output &
  BaseCollectionEntry;

export interface BaseCollectionEntry {
  _file: FileInfo;
}

export type EntryFromCollection<C> =
  C extends Collections<any, any, infer Output> ? Output : never;

/**
 * Get output type of collections
 */
export type GetOutput<C> = EntryFromCollection<C>[];
