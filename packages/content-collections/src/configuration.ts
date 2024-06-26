/**
 * Default configuration
 *
 * You may copy and modify the code
 */
import type { Context, Meta } from '@content-collections/core';
import {
  compileMDX,
  type Options as MDXOptions,
} from '@content-collections/mdx';
import {
  rehypeCode,
  remarkGfm,
  remarkHeading,
  remarkStructure,
} from 'fumadocs-core/mdx-plugins';
import { type z as Zod } from 'zod';
import rehypeImgSize from 'rehype-img-size';

export type SerializableTOC = {
  title: string;
  url: string;
  depth: number;
}[];

export async function transformMDX<
  D extends {
    _meta: Meta;
    content: string;
  },
>(
  document: D,
  context: Context,
  options: MDXOptions = {},
): Promise<
  D & {
    body: string;
    toc: SerializableTOC;
    /**
     * `StructuredData` for search indexes
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Avoid wrong type errors
    structuredData: any;
  }
> {
  let data: Record<string, unknown> = {};
  const body = await compileMDX(context, document, {
    ...options,
    remarkPlugins: [
      remarkGfm,
      remarkHeading,
      ...(options.remarkPlugins ?? []),
      remarkStructure,
      () => {
        return (_, file) => {
          data = file.data;
        };
      },
    ],
    rehypePlugins: [
      rehypeCode,
      [rehypeImgSize, { dir: './public' }],
      ...(options.rehypePlugins ?? []),
    ],
  });

  return {
    ...document,
    toc: data.toc as SerializableTOC,
    structuredData: data.structuredData,
    body,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- The type is dynamically generated by Zod
export function createDocSchema(z: typeof Zod) {
  return {
    title: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    full: z.boolean().optional(),
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- The type is dynamically generated by Zod
export function createMetaSchema(z: typeof Zod) {
  return {
    title: z.string().optional(),
    pages: z.array(z.string()).optional(),
    defaultOpen: z.boolean().optional(),
  };
}
