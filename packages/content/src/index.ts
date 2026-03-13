import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Collection } from 'fuma-content/collections';
import { dataCollection, type DataCollectionConfig } from 'fuma-content/collections/data';
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
  return {
    index: new DocsCollection(),
    meta: dataCollection({ dir: config.dir, ...config.meta }),
    doc: docsMdxCollection({ dir: config.dir, ...config.docs }),
  };
}

export class DocsCollection extends Collection {
  constructor() {
    super();
    this.onEmit.pipe(async (data, ctx) => {
      const file = await ctx.createCodeGenerator(`${this.name}.ts`, ({ codegen }) => {
        const docName = `${this.name}$doc`;
        const metaName = `${this.name}$meta`;
        codegen.addNamedImport([docName], `./${docName}`);
        codegen.addNamedImport([metaName], `./${metaName}`);
        codegen.addNamedImport(['docsStore'], '@fumadocs/content/runtime');
        codegen.push(`export const ${this.name} = docsStore(${docName}, ${metaName})`);
      });
      data.push(file);
      return data;
    });
  }
}
