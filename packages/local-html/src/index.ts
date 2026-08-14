import type { MetaData, DynamicSource, StaticSource } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createLocalSource,
  type SourceOptions,
  type WatchableSource,
} from '@fumadocs/local-content';
import { htmlIntegration, type HtmlPage } from './integration';
import type * as defaultSchemas from 'fumadocs-core/source/schema';
import { fromAst, type HtmlRenderer } from './html/renderer';
import { parseHtml, processHtml, type ProcessHtmlOptions } from './html/compiler';

export interface LocalHtmlConfig<MetaSchema extends StandardSchemaV1> extends ProcessHtmlOptions {
  /** root directory for content files */
  dir: string;
  /** a list of glob patterns, customize the content files to be scanned */
  include?: string[];
  metaSchema?: MetaSchema;
}

export interface LocalHtml<MetaSchema extends StandardSchemaV1> extends WatchableSource {
  /**
   * Connect to the standalone dev server for hot reload. On Vite, prefer
   * `watchWithVite()` from `@fumadocs/local-content/dev/vite`.
   */
  devServer: (url?: string) => Promise<void>;
  staticSource: (options?: SourceOptions) => Promise<
    StaticSource<{
      pageData: LocalHtmlPage;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>
  >;
  dynamicSource: (options?: SourceOptions) => DynamicSource<{
    pageData: LocalHtmlPage;
    metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
  }>;

  invalidateFile: (file: string) => void;
}

export type LocalHtmlPage = HtmlPage<HtmlRenderer>;

export function localHtml<MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema>(
  config: LocalHtmlConfig<MetaSchema>,
): LocalHtml<MetaSchema> {
  const source = createLocalSource({
    dir: config.dir,
    include: config.include,
    integration: htmlIntegration({
      include: config.include,
      metaSchema: config.metaSchema,
      async load(page) {
        const res = await processHtml(parseHtml(page.content), config);

        return fromAst({
          tree: res.tree,
          filePath: page.absolutePath,
          rehypeToc: res.toc,
          structuredData: res.structuredData,
        });
      },
    }),
  });

  return source as unknown as LocalHtml<MetaSchema>;
}

export type { RawHtmlPage, HtmlPage } from './integration';
export type { ProcessHtmlOptions, ProcessedHtml } from './html/compiler';
export type { HtmlRenderer, HtmlRendererOptions, HtmlRendererResult } from './html/renderer';
