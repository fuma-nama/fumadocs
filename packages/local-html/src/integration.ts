import path from 'node:path';
import type { MetaData, PageData } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import * as defaultSchemas from 'fumadocs-core/source/schema';
import type { ContentIntegration, SourceFile } from '@fumadocs/local-content';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { parseHtml, textOf } from './html/compiler';

export const defaultInclude = ['**/*.{html,json}'];

export interface RawHtmlPage {
  path: string;
  absolutePath: string;
  content: string;
  /** every `<meta name>`/`content` pair of the document */
  metadata: Record<string, string>;
}

export interface HtmlPage<Loaded = unknown> extends PageData {
  title: string;
  description?: string;
  icon?: string;
  metadata: Record<string, string>;
  content: string;
  load: () => Promise<Loaded>;
}

export interface HtmlIntegrationConfig<MetaSchema extends StandardSchemaV1, Loaded> {
  include?: string[];
  metaSchema?: MetaSchema;
  /** called at most once per page, until the file is invalidated */
  load: (page: RawHtmlPage) => Promise<Loaded>;
}

function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues
    .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join('\n');
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

/** reads `.html` files as pages and `.json` as meta, validated with Standard Schema */
export function htmlIntegration<
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
  Loaded = unknown,
>(
  config: HtmlIntegrationConfig<MetaSchema, Loaded>,
): ContentIntegration<HtmlPage<Loaded>, StandardSchemaV1.InferOutput<MetaSchema> & MetaData> {
  const { include = defaultInclude, metaSchema = defaultSchemas.metaSchema, load } = config;

  type $Meta = StandardSchemaV1.InferOutput<MetaSchema> & MetaData;

  async function page(file: SourceFile): Promise<HtmlPage<Loaded>> {
    const content = await file.read();
    // the source caches every page, so only the metadata is kept: `load()` parses again, once
    const { title, metadata } = extractMetadata(parseHtml(content));

    const raw: RawHtmlPage = {
      path: file.path,
      absolutePath: file.absolutePath,
      content,
      metadata,
    };
    // the parsed file is cached until invalidated, so this compiles once
    let loaded: Promise<Loaded> | undefined;

    return {
      title:
        metadata['fumadocs:title'] || title || path.basename(file.path, path.extname(file.path)),
      description: metadata['fumadocs:description'] || metadata.description,
      icon: metadata['fumadocs:icon'],

      metadata,
      content,
      load: () => (loaded ??= load(raw)),
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

  return {
    include,
    async parse(file) {
      switch (path.extname(file.path)) {
        case '.json':
          return { type: 'meta', data: await meta(file) };
        case '.html':
          return { type: 'page', data: await page(file) };
      }
    },
  };
}
