import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Collection } from 'fuma-content/collections';
import {
  dataCollection,
  DataCollection,
  DataCollectionConfig,
} from 'fuma-content/collections/data';
import { MDXCollection } from 'fuma-content/collections/mdx';
import { mdxCollection, type MDXCollectionConfig } from 'fuma-content/collections/mdx';
import { type MDXBundlerPresetOptions, mdxPreset } from 'fumadocs-core/content/mdx/preset-bundler';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

export interface DocsMDXCollectionConfig<
  FrontmatterSchema extends StandardSchemaV1 | undefined,
> extends Omit<MDXCollectionConfig<FrontmatterSchema>, 'options'> {
  options?:
    | MDXBundlerPresetOptions
    | (() => MDXBundlerPresetOptions | Promise<MDXBundlerPresetOptions>);
}

export function docsMdxCollection<
  FrontmatterSchema extends StandardSchemaV1 | typeof pageSchema = typeof pageSchema,
>(config: DocsMDXCollectionConfig<FrontmatterSchema>) {
  const { options = {}, frontmatter = pageSchema, ...rest } = config;

  return mdxCollection<FrontmatterSchema>({
    ...rest,
    frontmatter: frontmatter as never,
    async options() {
      const mdxOptions = typeof options === 'object' ? options : await options();
      const { remarkInclude } = await import('fuma-content/plugins/remark/include');
      return mdxPreset({
        ...mdxOptions,
        _include: remarkInclude,
      });
    },
  });
}

export interface DocsCollectionConfig<
  FrontmatterSchema extends StandardSchemaV1 | undefined,
  MetaSchema extends StandardSchemaV1 | undefined,
> {
  dir: string;
  docs: Omit<DocsMDXCollectionConfig<FrontmatterSchema>, 'dir'>;
  meta: Omit<DataCollectionConfig<MetaSchema>, 'dir'>;
}

export function docsCollection<
  FrontmatterSchema extends StandardSchemaV1 | typeof pageSchema = typeof pageSchema,
  MetaSchema extends StandardSchemaV1 | typeof metaSchema = typeof metaSchema,
>(config: DocsCollectionConfig<FrontmatterSchema, MetaSchema>) {
  return new DocsCollection(
    docsMdxCollection({ dir: config.dir, ...config.docs }),
    dataCollection({ dir: config.dir, ...config.meta }),
  );
}

export class DocsCollection<
  FrontmatterSchema extends StandardSchemaV1 | undefined,
  MetaSchema extends StandardSchemaV1 | undefined,
> extends Collection {
  constructor(
    readonly mdx: MDXCollection<FrontmatterSchema>,
    readonly meta: DataCollection<MetaSchema>,
  ) {
    super();
    this.onConfig.hook((config) => {
      const collections = config.config.collections;
      const mdxName = `$${this.name}_mdx`;
      const metaName = `$${this.name}_meta`;
      for (const name of [mdxName, metaName]) {
        if (collections.has(name)) {
          throw new Error(`collection ${name} is taken.`);
        }
      }

      collections.set(mdxName, mdx as never);
      collections.set(metaName, meta);
    });
  }
}
