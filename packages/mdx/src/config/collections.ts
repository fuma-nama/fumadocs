import { type AnyZodObject, type z } from 'zod';
import type { TableOfContents } from 'fumadocs-core/server';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { MDXProps } from 'mdx/types';

export interface MarkdownProps {
  body: (props: MDXProps) => React.ReactElement;
  structuredData: StructuredData;
  toc: TableOfContents;
}

export interface SupportedTypes {
  // eslint-disable-next-line @typescript-eslint/ban-types -- empty object
  meta: {};
  doc: MarkdownProps;
}

export type SupportedType = keyof SupportedTypes;

export type CollectionData<
  Schema extends AnyZodObject,
  Type extends SupportedType,
> = Omit<SupportedTypes[Type], keyof z.output<Schema>> & z.output<Schema>;

export interface Collections<
  Schema extends AnyZodObject = AnyZodObject,
  Type extends SupportedType = SupportedType,
  Output = CollectionData<Schema, Type>,
> {
  /**
   * Directories to scan
   */
  dir: string | string[];

  /**
   * what files to include/exclude (glob patterns)
   *
   * Include all files if not specified
   */
  files?: string[];

  schema: Schema;

  /**
   * content type
   */
  type: Type;

  transform?: (entry: CollectionData<Schema, Type>) => Output;
}

export function defineCollections<
  Schema extends AnyZodObject,
  Type extends SupportedType,
  Output = CollectionData<Schema, Type>,
>(
  options: Collections<Schema, Type, Output>,
): {
  _doc: 'collections';
} & Collections<Schema, Type, Output> {
  return {
    _doc: 'collections',
    ...options,
  };
}
