import type { MetaData, Source, VirtualFile } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import path from 'node:path';
import { createStorage } from './storage';
import type * as defaultSchemas from 'fumadocs-core/source/schema';
import { createMarkdownRenderer, MarkdownRendererOptions, PageRenderer } from './md/renderer';
import { createMarkdownCompiler, MarkdownCompilerOptions } from './md/compiler';
import { getDevServerUrlFromEnv } from './dev/shared';
import { cache } from 'react';

export interface LocalMarkdownConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> {
  /**
   * root directory for content files.
   */
  dir: string;
  /**
   * a list of glob patterns, customise the content files to be scanned.
   */
  include?: string[];
  mdxOptions?: MarkdownCompilerOptions;
  rendererOptions?: MarkdownRendererOptions;

  frontmatterSchema?: FrontmatterSchema;
  metaSchema?: MetaSchema;
}

export interface LocalMarkdown<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> {
  config: LocalMarkdownConfig<FrontmatterSchema, MetaSchema>;
  /** connect to dev server, required for hot reload */
  devServer: (url?: string) => Promise<void>;
  toSource: () => Promise<GetSource<FrontmatterSchema, MetaSchema>>;

  /**
   * return a cached version of `fn`, the cache will revalidate when the source object (content) is changed.
   */
  toSourceFactory: <R>(
    fn: (source: GetSource<FrontmatterSchema, MetaSchema>) => R,
  ) => () => Promise<R>;
}

type GetSource<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> = Source<{
  pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>>;
  metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
}>;

export interface LocalMarkdownPage<Frontmatter> {
  title: string;
  description?: string;
  content: string;
  frontmatter: Frontmatter;

  load: () => Promise<PageRenderer>;
}

export function localMd<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultSchemas.pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
>(
  config: LocalMarkdownConfig<FrontmatterSchema, MetaSchema>,
): LocalMarkdown<FrontmatterSchema, MetaSchema> {
  const storage = createStorage(config);
  const compiler = createMarkdownCompiler(config.mdxOptions);
  const renderer = createMarkdownRenderer(compiler, config.rendererOptions);

  let cachedSource: Promise<GetSource<FrontmatterSchema, MetaSchema>> | null = null;

  async function createSource() {
    const { metas, pages } = await storage.getPages();
    const files: VirtualFile<{
      pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>>;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>[] = [];

    for (const page of pages) {
      files.push({
        type: 'page',
        path: page.path,
        absolutePath: page.absolutePath,
        data: {
          title: page.title,
          description: page.description,
          content: page.content,
          frontmatter: page.frontmatter,
          load() {
            return renderer.compile(page);
          },
        },
      });
    }

    for (const meta of metas) {
      files.push({
        type: 'meta',
        path: meta.path,
        absolutePath: meta.absolutePath,
        data: meta.data!,
      });
    }

    return { files };
  }

  return {
    config,
    async devServer(url = getDevServerUrlFromEnv()) {
      if (!url) {
        console.warn(
          `[@fumadocs/local-md] dev server URL could not be found, try passing the URL to devServer() explicitly instead`,
        );
        return;
      }

      const { connectDevServer } = await import('@/dev/node-client');
      const conn = connectDevServer(url);
      conn.watchDir(path.resolve(config.dir));

      conn.subscribe((event) => {
        if (event.type === 'change') {
          cachedSource = null;
          storage.invalidateCache(event.absolutePath);
        }
      });
    },
    toSourceFactory<R>(
      fn: (source: GetSource<FrontmatterSchema, MetaSchema>) => R,
    ): () => Promise<R> {
      let k: GetSource<FrontmatterSchema, MetaSchema> | undefined;
      let v: R | undefined;

      return cache(async () => {
        const source = await this.toSource();
        if (k === source) return v!;

        k = source;
        return (v = fn(source));
      });
    },
    async toSource() {
      return (cachedSource ??= createSource());
    },
  };
}

export type { RawMeta, RawPage } from './storage';
