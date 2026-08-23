import path from 'node:path';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createLocalSource,
  type SourceFile,
  type SourceOptions,
  type WatchableSource,
} from '@fumadocs/local-content';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { DynamicSource, MetaData, PageData, StaticSource } from 'fumadocs-core/source';
import * as defaultSchemas from 'fumadocs-core/source/schema';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { parseHtml, processHtml, textOf, type ProcessHtmlOptions } from './html/compiler';
import { fromAst, type HtmlRenderer } from './html/renderer';

export const defaultInclude = ['**/*.{html,json}'];

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

export interface LocalHtmlPage extends PageData {
  title: string;
  description?: string;
  icon?: string;
  /** every `<meta name>`/`content` pair of the document */
  metadata: Record<string, string>;
  content: string;
  /** process the page, at most once until the file is invalidated */
  load: () => Promise<HtmlRenderer>;
  structuredData: () => Promise<StructuredData>;
}

export function localHtml<MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema>(
  config: LocalHtmlConfig<MetaSchema>,
): LocalHtml<MetaSchema> {
  type $Meta = StandardSchemaV1.InferOutput<MetaSchema> & MetaData;

  const { include = defaultInclude, metaSchema = defaultSchemas.metaSchema } = config;

  async function compile(file: SourceFile, content: string): Promise<HtmlRenderer> {
    const res = await processHtml(parseHtml(content), config);

    return fromAst({
      tree: res.tree,
      filePath: file.absolutePath,
      rehypeToc: res.toc,
      structuredData: res.structuredData,
    });
  }

  async function page(file: SourceFile): Promise<LocalHtmlPage> {
    const content = await file.read();
    // the source caches every page, so only the metadata is kept: `load()` parses again, once
    const { title, metadata } = extractMetadata(parseHtml(content));
    let loaded: Promise<HtmlRenderer> | undefined;
    const load = () => (loaded ??= compile(file, content));

    return {
      title:
        metadata['fumadocs:title'] || title || path.basename(file.path, path.extname(file.path)),
      description: metadata['fumadocs:description'] || metadata.description,
      icon: metadata['fumadocs:icon'],

      metadata,
      content,
      load,
      structuredData: async () => (await load()).structuredData,
    };
  }

  async function meta(file: SourceFile): Promise<$Meta> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.read());
    } catch (error) {
      throw new Error(`invalid JSON in "${file.absolutePath}": ${String(error)}`);
    }

    const result = await metaSchema['~standard'].validate(parsed);
    if (result.issues) {
      throw new Error(`invalid data in "${file.absolutePath}": ${formatIssues(result.issues)}`);
    }

    return result.value as $Meta;
  }

  const source = createLocalSource<LocalHtmlPage, $Meta>({
    dir: config.dir,
    integration: {
      include,
      async parse(file) {
        switch (path.extname(file.path)) {
          case '.json':
            return { type: 'meta', data: await meta(file) };
          case '.html':
            return { type: 'page', data: await page(file) };
        }
      },
    },
  });

  return source as unknown as LocalHtml<MetaSchema>;
}

function extractMetadata(tree: Root): { title?: string; metadata: Record<string, string> } {
  const metadata: Record<string, string> = {};
  let title: string | undefined;

  visit(tree, 'element', (element: Element) => {
    // `<title>` also exists inside SVG; only the document title is meaningful
    if (element.tagName === 'svg') return 'skip';

    if (element.tagName === 'title') {
      if (!title) {
        const text = textOf(element).trim();
        if (text.length > 0) title = text;
      }
      return 'skip';
    }

    if (element.tagName === 'meta') {
      const { name, content } = element.properties;
      if (typeof name === 'string' && typeof content === 'string') metadata[name] = content;
    }
  });

  return { title, metadata };
}

function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues
    .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join('\n');
}

export type { ProcessHtmlOptions, ProcessedHtml } from './html/compiler';
export type { HtmlRenderer, HtmlRendererOptions, HtmlRendererResult } from './html/renderer';
