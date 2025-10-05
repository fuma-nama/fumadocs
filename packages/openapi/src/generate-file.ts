import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { glob } from 'tinyglobby';
import {
  generateDocument,
  type PagesToTextOptions,
  toText,
} from './utils/pages/to-text';
import {
  processDocumentCached,
  type ProcessedDocument,
} from '@/utils/process-document';
import type { OpenAPIServer } from '@/server';
import { createGetUrl, getSlugs } from 'fumadocs-core/source';
import matter from 'gray-matter';
import {
  isUrl,
  schemaToPages,
  type SchemaToPagesOptions,
} from '@/utils/schema-to-pages';

export interface OutputFile {
  path: string;
  content: string;
}

interface IndexConfig {
  items: IndexItem[] | ((ctx: HookContext) => IndexItem[]);

  /**
   * Generate URLs for cards
   */
  url:
    | ((filePath: string) => string)
    | {
        baseUrl: string;
        /**
         * Base content directory
         */
        contentDir: string;
      };
}

interface IndexItem {
  path: string;
  title?: string;
  description?: string;

  /**
   * Specify linked pages:
   * - items in `inputs` to include all generated pages of a specific schema.
   * - specific Markdown/MDX files.
   */
  only?: (string | OutputFile)[];
}

interface GenerateFilesConfig extends PagesToTextOptions {
  cwd?: string;

  /**
   * Schema files, or the OpenAPI server object
   */
  input: string[] | string | OpenAPIServer;

  /**
   * Output directory
   */
  output: string;

  /**
   * Generate index files with cards linking to generated pages.
   */
  index?: IndexConfig;

  /**
   * Can add/change/remove output files before writing to file system
   **/
  beforeWrite?: (
    this: HookContext,
    files: OutputFile[],
  ) => void | Promise<void>;
}

export type Config = SchemaToPagesOptions & GenerateFilesConfig;

interface HookContext {
  files: OutputFile[];
  readonly generated: Record<string, OutputFile[]>;
  readonly documents: Record<string, ProcessedDocument>;
}

export async function generateFiles(options: Config): Promise<void> {
  const files = await generateFilesOnly(options);
  const { output, cwd = process.cwd() } = options;
  const baseDir = path.join(cwd, output);

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(baseDir, file.path);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content);
      console.log(`Generated: ${filePath}`);
    }),
  );
}

export async function generateFilesOnly(
  options: SchemaToPagesOptions & Omit<GenerateFilesConfig, 'output'>,
): Promise<OutputFile[]> {
  const { cwd = process.cwd(), beforeWrite } = options;
  const input =
    typeof options.input === 'string' ? [options.input] : options.input;
  let schemas: Record<string, ProcessedDocument> = {};

  async function resolveInput(item: string) {
    if (isUrl(item)) {
      schemas[item] = await processDocumentCached(item);
      return;
    }

    const resolved = await glob(item, { cwd, absolute: true });
    if (resolved.length > 1) {
      console.warn(
        'glob patterns in `input` are deprecated, please specify your schemas explicitly.',
      );

      for (let i = 0; i < resolved.length; i++) {
        schemas[`${item}[${i}]`] = await processDocumentCached(item);
      }
    } else if (resolved.length === 1) {
      schemas[item] = await processDocumentCached(resolved[0]);
    } else {
      throw new Error(`input not found: ${item}`);
    }
  }

  if (Array.isArray(input)) {
    await Promise.all(input.map(resolveInput));
  } else {
    schemas = await input.getSchemas();
  }

  const generated: Record<string, OutputFile[]> = {};
  const files: OutputFile[] = [];

  const entries = Object.entries(schemas);
  if (entries.length === 0) {
    throw new Error('No input files found.');
  }
  for (const [id, schema] of entries) {
    const result = schemaToPages(
      id,
      schema,
      options as SchemaToPagesOptions,
    ).map<OutputFile>((page) => ({
      path: page.path,
      content: toText(page, schema, options),
    }));
    files.push(...result);
    generated[id] = result;
  }

  const context: HookContext = {
    files,
    generated,
    documents: schemas,
  };

  if (options.index) {
    writeIndexFiles(context, options.index, options);
  }

  await beforeWrite?.call(context, context.files);
  return context.files;
}

function writeIndexFiles(
  context: HookContext,
  options: IndexConfig,
  generateOptions: PagesToTextOptions,
) {
  const { items, url } = options;

  let urlFn: (path: string) => string;
  if (typeof url === 'object') {
    const getUrl = createGetUrl(url.baseUrl);

    urlFn = (file) => getUrl(getSlugs(path.relative(url.contentDir, file)));
  } else {
    urlFn = url;
  }

  function fileContent(index: IndexItem): string {
    const generatedPages = context.generated;
    const content: string[] = [];
    content.push('<Cards>');
    const files = new Map<string, OutputFile>();
    const only = index.only ?? Object.keys(context.generated);

    for (const item of only) {
      if (typeof item === 'object') {
        files.set(item.path, item);
        continue;
      }

      const result = generatedPages[item];
      if (!result)
        throw new Error(
          `${item} does not exist on "input", available: ${Object.keys(generatedPages).join(', ')}.`,
        );

      for (const file of result) {
        files.set(file.path, file);
      }
    }

    for (const file of files.values()) {
      const isContent = file.path.endsWith('.mdx') || file.path.endsWith('.md');
      if (!isContent) continue;
      const { data } = matter(file.content);
      if (typeof data.title !== 'string') continue;

      const descriptionAttr = data.description
        ? `description=${JSON.stringify(data.description)} `
        : '';
      content.push(
        `<Card href="${urlFn(file.path)}" title=${JSON.stringify(data.title)} ${descriptionAttr}/>`,
      );
    }

    content.push('</Cards>');
    return generateDocument(
      {
        title: index.title ?? 'Overview',
        description: index.description,
      },
      content.join('\n'),
      generateOptions,
    );
  }

  for (const item of typeof items === 'function' ? items(context) : items) {
    context.files.push({
      path:
        path.extname(item.path).length === 0 ? `${item.path}.mdx` : item.path,
      content: fileContent(item),
    });
  }
}
