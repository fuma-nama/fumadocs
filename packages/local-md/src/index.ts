import type { MetaData, Source, VirtualFile } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import path from 'node:path';
import { createStorage } from './storage';
import type * as defaultSchemas from 'fumadocs-core/source/schema';
import { createMarkdownRenderer, MarkdownRendererOptions, PageRenderer } from './md/renderer';
import { createMarkdownCompiler, MarkdownCompilerOptions } from './md/compiler';
import { getDevServerPort } from './dev/shared';

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
  devServer: (port?: number) => Promise<void>;
  toSource: () => Promise<
    Source<{
      pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>>;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>
  >;
}

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

  return {
    config,
    async devServer(port) {
      const { connectDevServer } = await import('@/dev/client');
      const resolvedPort = port ?? getDevServerPort();
      if (!resolvedPort) return;

      const conn = connectDevServer(resolvedPort);
      conn.watchDir(path.resolve(config.dir));

      conn.subscribe((event) => {
        if (event.type === 'change') {
          storage.invalidateCache(event.absolutePath);
        }
      });
    },
    async toSource() {
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
    },
  };
}

export type { RawMeta, RawPage } from './storage';
