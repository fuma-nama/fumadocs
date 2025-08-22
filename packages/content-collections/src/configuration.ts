/**
 * Default configuration
 *
 * You may copy and modify the code
 */
import type { Context, Meta } from '@content-collections/core';
import {
  compileMDX as baseCompileMDX,
  type Options as MDXOptions,
} from '@content-collections/mdx';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import * as Plugins from 'fumadocs-core/mdx-plugins';
import { z, z as Zod } from 'zod';
import {
  resolvePlugin,
  resolvePlugins,
  type ResolvePlugins,
} from '@/resolve-plugins';

export interface TransformOptions
  extends Omit<MDXOptions, 'remarkPlugins' | 'rehypePlugins'> {
  remarkPlugins?: ResolvePlugins;
  rehypePlugins?: ResolvePlugins;

  /**
   * Generate `structuredData`
   *
   * @defaultValue true
   * @deprecated use `remarkStructureOptions` instead
   */
  generateStructuredData?: boolean;

  remarkStructureOptions?: Plugins.StructureOptions | boolean;
  remarkHeadingOptions?: Plugins.RemarkHeadingOptions | boolean;
  rehypeCodeOptions?: Plugins.RehypeCodeOptions | boolean;
  remarkImageOptions?: Plugins.RemarkImageOptions | boolean;
  remarkCodeTabOptions?: Plugins.RemarkCodeTabOptions | boolean;
}

/**
 * The default TOC types support `ReactNode`, which isn't serializable
 */
export type SerializableTOC = {
  title: string;
  url: string;
  depth: number;
}[];

interface BaseDoc {
  _meta: Meta;
  content: string;
}

/**
 * We need to convert interface types to object types.
 *
 * Otherwise, `T extends Serializable? true : false` gives us `false`.
 * Because interface types cannot extend a union type, but `Serializable` is.
 */
type InterfaceToObject<T> = T extends object
  ? {
      [K in keyof T]: InterfaceToObject<T[K]>;
    }
  : T;

export async function transformMDX<D extends BaseDoc>(
  document: D,
  context: Context,
  options: TransformOptions = {},
): Promise<
  D & {
    body: string;
    toc: SerializableTOC;
    /**
     * `StructuredData` for search indexes
     */
    structuredData: InterfaceToObject<StructuredData>;
  }
> {
  const {
    generateStructuredData,
    remarkStructureOptions = generateStructuredData ?? true,
    rehypeCodeOptions = true,
    remarkHeadingOptions = true,
    remarkImageOptions = true,
    remarkCodeTabOptions = true,
    ...rest
  } = options;

  return context.cache(
    {
      type: 'fumadocs',
      document,
    },
    async () => {
      let data: Record<string, unknown> = {};

      const body = await baseCompileMDX(
        {
          ...context,
          // avoid nested caching
          cache: async (input, fn) => fn(input),
        },
        document,
        {
          cwd: process.cwd(),
          ...rest,
          rehypePlugins: resolvePlugins(
            (plugins) => [
              resolvePlugin(Plugins.rehypeCode, rehypeCodeOptions),
              ...plugins,
            ],
            rest.rehypePlugins,
          ),
          remarkPlugins: resolvePlugins(
            (plugins) => [
              Plugins.remarkGfm,
              Plugins.remarkWikilink,
              resolvePlugin(Plugins.remarkHeading, remarkHeadingOptions),
              resolvePlugin(Plugins.remarkImage, remarkImageOptions, {
                useImport: false,
              }),
              'remarkCodeTab' in Plugins &&
                resolvePlugin(Plugins.remarkCodeTab, remarkCodeTabOptions),
              ...plugins,
              resolvePlugin(Plugins.remarkStructure, remarkStructureOptions),
              () => {
                return (_, file) => {
                  data = file.data;
                };
              },
            ],
            rest.remarkPlugins,
          ),
        },
      );

      return {
        ...document,
        toc: data.toc as SerializableTOC,
        structuredData: data.structuredData as StructuredData,
        body,
      };
    },
  );
}

export const metaSchema = z.object({
  title: z.string().optional(),
  pages: z.array(z.string()).optional(),
  description: z.string().optional(),
  root: z.boolean().optional(),
  defaultOpen: z.boolean().optional(),
  icon: z.string().optional(),
});

export const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  full: z.boolean().optional(),

  // Fumadocs OpenAPI generated
  _openapi: z.looseObject({}).optional(),
});

export function createDocSchema(z: typeof Zod) {
  return {
    title: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    full: z.boolean().optional(),
    // Fumadocs OpenAPI generated
    _openapi: z.record(z.string(), z.any()).optional(),
  };
}

export function createMetaSchema(z: typeof Zod) {
  return {
    title: z.string().optional(),
    description: z.string().optional(),
    pages: z.array(z.string()).optional(),
    icon: z.string().optional(),
    root: z.boolean().optional(),
    defaultOpen: z.boolean().optional(),
  };
}
