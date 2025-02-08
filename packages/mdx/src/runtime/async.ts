import { type BaseCollectionEntry, type MarkdownProps } from '@/config/types';
import { createCompiler, type MDXOptions } from '@fumadocs/mdx-remote';
import * as fs from 'node:fs/promises';
import type { LoadedConfig } from '@/utils/config';
import { remarkInclude } from '@/mdx-plugins/remark-include';
import type { defineCollections } from '@/config/define';
import {
  remarkStructure,
  type StructuredData,
} from 'fumadocs-core/mdx-plugins';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { _runtime, createMDXSource, type RuntimeFile } from '@/runtime/index';
import type { MetaData, PageData, Source } from 'fumadocs-core/source';

export interface RuntimeAsync {
  doc: <C>(
    files: RuntimeFile[],
    collection: string,
    config: LoadedConfig,
  ) => C extends ReturnType<
    typeof defineCollections<'doc', infer Schema extends StandardSchemaV1, true>
  >
    ? (StandardSchemaV1.InferOutput<Schema> &
        BaseCollectionEntry & {
          load: () => Promise<MarkdownProps>;
        })[]
    : never;
  docs: <Docs>(
    docs: RuntimeFile[],
    metas: RuntimeFile[],
    collection: string,
    config: LoadedConfig,
  ) => Docs extends {
    type: 'docs';
    docs: unknown;
    meta: unknown;
  }
    ? {
        docs: ReturnType<typeof _runtimeAsync.doc<Docs['docs']>>;
        meta: ReturnType<typeof _runtime.meta<Docs['meta']>>;
        toFumadocsSource: () => Source<{
          pageData: ReturnType<
            typeof _runtimeAsync.doc<Docs['docs']>
          >[number] extends PageData & BaseCollectionEntry
            ? ReturnType<typeof _runtimeAsync.doc<Docs['docs']>>[number]
            : never;
          metaData: ReturnType<
            typeof _runtime.meta<Docs['meta']>
          >[number] extends MetaData & BaseCollectionEntry
            ? ReturnType<typeof _runtime.meta<Docs['meta']>>[number]
            : never;
        }>;
      }
    : never;
}

async function initCompiler(config: LoadedConfig, collection: string) {
  let col = config.collections.get(collection);
  if (col?.type === 'docs') col = col.docs;

  let mdxOptions: MDXOptions;

  if (col?.type === 'doc' && col.mdxOptions) {
    mdxOptions = col.mdxOptions as MDXOptions;
  } else {
    const options =
      typeof config.global?.mdxOptions === 'function'
        ? await config.global.mdxOptions()
        : config.global?.mdxOptions;
    const remarkPlugins = options?.remarkPlugins ?? [];

    mdxOptions = {
      ...options,
      remarkPlugins: (v) =>
        typeof remarkPlugins === 'function'
          ? [remarkInclude, ...remarkPlugins(v), remarkStructure]
          : [remarkInclude, ...v, ...remarkPlugins, remarkStructure],
    };
  }

  return createCompiler(mdxOptions);
}

export const _runtimeAsync: RuntimeAsync = {
  doc(files, collection, config) {
    const init = initCompiler(config, collection);

    return files.map(({ info: file, data: frontmatter }) => {
      return {
        ...frontmatter,
        _file: file,
        async load() {
          const compiler = await init;
          const out = await compiler.compile({
            source: (await fs.readFile(file.absolutePath)).toString(),
            filePath: file.absolutePath,
          });

          return {
            body: out.body,
            toc: out.toc,
            structuredData: out.vfile.data.structuredData as StructuredData,
            _exports: out.exports ?? {},
          };
        },
      };
    }) as any;
  },
  docs(docs, metas, collection, config) {
    const parsedDocs = this.doc(docs, collection, config);
    const parsedMetas = _runtime.meta(metas);

    return {
      docs: parsedDocs,
      meta: parsedMetas,
      toFumadocsSource() {
        return createMDXSource(parsedDocs, parsedMetas);
      },
    } as any;
  },
};

export { buildConfig } from '@/config/build';
