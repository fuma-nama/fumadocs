import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { glob } from 'tinyglobby';
import {
  generateAll,
  generateDocument,
  type GenerateOptions,
  type GeneratePageOutput,
  generatePages,
  type GenerateTagOutput,
  generateTags,
} from './generate';
import {
  processDocumentCached,
  type ProcessedDocument,
} from '@/utils/process-document';
import type { OpenAPIServer } from '@/server';
import { createGetUrl, getSlugs } from 'fumadocs-core/source';
import matter from 'gray-matter';

interface GenerateFileOutput {
  /**
   * The original schema file path/url from `input`
   */
  pathOrUrl: string;

  content: string;
}

export interface OutputFile {
  path: string;
  content: string;
}

interface OperationConfig extends BaseConfig {
  /**
   * Generate a page for each API endpoint/operation (default).
   */
  per?: 'operation';

  /**
   * Group output using folders (Only works on `operation` mode)
   * - tag: `{tag}/{file}`
   * - route: `{endpoint}/{method}` (it will ignore the `name` option)
   * - none: `{file}` (default)
   *
   * @defaultValue 'none'
   */
  groupBy?: 'tag' | 'route' | 'none';

  /**
   * Specify name for output file
   */
  name?:
    | ((
        output: GeneratePageOutput,
        document: ProcessedDocument['document'],
      ) => string)
    | BaseName;
}

interface TagConfig extends BaseConfig {
  /**
   * Generate a page for each tag.
   */
  per: 'tag';

  /**
   * Specify name for output file
   */
  name?:
    | ((
        output: GenerateTagOutput,
        document: ProcessedDocument['document'],
      ) => string)
    | BaseName;
}

interface FileConfig extends BaseConfig {
  /**
   * Generate a page for each schema file.
   */
  per: 'file';

  /**
   * Specify name for output file
   */
  name?:
    | ((
        output: GenerateFileOutput,
        document: ProcessedDocument['document'],
      ) => string)
    | BaseName;
}

export type Config = FileConfig | TagConfig | OperationConfig;

interface BaseName {
  /**
   * The version of algorithm used to generate file paths.
   *
   * v1: Fumadocs OpenAPI v8
   * v2: Fumadocs OpenAPI v9
   *
   * @defaultValue v2
   */
  algorithm?: 'v2' | 'v1';
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

interface HookContext {
  files: OutputFile[];
  readonly generated: Record<string, OutputFile[]>;
  readonly documents: Record<string, ProcessedDocument>;
}

interface BaseConfig extends GenerateOptions {
  /**
   * Schema files, or the OpenAPI server object
   */
  input: string[] | string | OpenAPIServer;

  /**
   * Output directory
   */
  output: string;

  /**
   * Custom function to convert names into file names.
   *
   * By default, it only escapes whitespaces and upper case (English) characters
   */
  slugify?: (name: string) => string;

  /**
   * Generate index files with cards linking to generated pages.
   */
  index?: {
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
  };

  /**
   * Can add/change/remove output files before writing to file system
   **/
  beforeWrite?: (
    this: HookContext,
    files: OutputFile[],
  ) => void | Promise<void>;
}

export async function generateFiles(options: Config): Promise<void> {
  const files = await generateFilesOnly(options);

  await Promise.all(
    files.map(async (file) => {
      await mkdir(path.dirname(file.path), { recursive: true });
      await writeFile(file.path, file.content);
      console.log(`Generated: ${file.path}`);
    }),
  );
}

export async function generateFilesOnly(
  options: Config,
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
    const result = generateFromDocument(id, schema, options);
    files.push(...result);
    generated[id] = result;
  }

  const context: HookContext = {
    files,
    generated,
    documents: schemas,
  };

  if (options.index) {
    writeIndexFiles(context, options);
  }

  await beforeWrite?.call(context, context.files);
  return context.files;
}

function generateFromDocument(
  schemaId: string,
  processed: ProcessedDocument,
  options: Config,
): OutputFile[] {
  const files: OutputFile[] = [];
  const { document } = processed;
  const { output, cwd = process.cwd(), slugify = defaultSlugify } = options;
  const outputDir = path.join(cwd, output);

  let nameFn: (
    output: GeneratePageOutput | GenerateTagOutput | GenerateFileOutput,
    document: ProcessedDocument['document'],
  ) => string;

  if (!options.name || typeof options.name !== 'function') {
    const algorithm = options.name?.algorithm;

    nameFn = (out, doc) =>
      defaultNameFn(schemaId, out, doc, options, algorithm);
  } else {
    nameFn = options.name as typeof nameFn;
  }

  function getOutputPaths(
    groupBy: OperationConfig['groupBy'] = 'none',
    result: GeneratePageOutput,
  ): string[] {
    if (groupBy === 'route') {
      return [
        path.join(
          getOutputPathFromRoute(
            result.type === 'operation' ? result.item.path : result.item.name,
          ),
          `${result.item.method.toLowerCase()}.mdx`,
        ),
      ];
    }

    const file = nameFn(result, document);
    if (groupBy === 'tag') {
      let tags =
        result.type === 'operation'
          ? document.paths![result.item.path]![result.item.method]!.tags
          : document.webhooks![result.item.name][result.item.method]!.tags;

      if (!tags || tags.length === 0) {
        console.warn(
          'When `groupBy` is set to `tag`, make sure a `tags` is defined for every operation schema.',
        );

        tags = ['unknown'];
      }

      return tags.map((tag) => path.join(slugify(tag), `${file}.mdx`));
    }

    return [`${file}.mdx`];
  }

  if (options.per === 'file') {
    const result = generateAll(schemaId, processed, options);
    const filename = nameFn(
      {
        pathOrUrl: schemaId,
        content: result,
      },
      document,
    );

    files.push({
      path: path.join(outputDir, `${filename}.mdx`),
      content: result,
    });
    return files;
  }

  if (options.per === 'tag') {
    const results = generateTags(schemaId, processed, options);

    for (const result of results) {
      const filename = nameFn(result, document);

      files.push({
        path: path.join(outputDir, `${filename}.mdx`),
        content: result.content,
      });
    }

    return files;
  }

  const results = generatePages(schemaId, processed, options);
  const mapping = new Map<string, GeneratePageOutput>();

  for (const result of results) {
    for (const outputPath of getOutputPaths(options.groupBy, result)) {
      mapping.set(outputPath, result);
    }
  }

  for (const [key, output] of mapping.entries()) {
    let outputPath = key;

    // v1 will remove nested directories
    if (typeof options.name === 'object' && options.name.algorithm === 'v1') {
      const isSharedDir = Array.from(mapping.keys()).some(
        (item) =>
          item !== outputPath &&
          path.dirname(item) === path.dirname(outputPath),
      );

      if (!isSharedDir && path.dirname(outputPath) !== '.') {
        outputPath = path.join(path.dirname(outputPath) + '.mdx');
      }
    }

    files.push({
      path: path.join(outputDir, outputPath),
      content: output.content,
    });
  }
  return files;
}

function defaultNameFn(
  schemaId: string,
  output: GeneratePageOutput | GenerateTagOutput | GenerateFileOutput,
  document: ProcessedDocument['document'],
  options: Config,
  algorithm: 'v2' | 'v1' = 'v2',
) {
  const { slugify = defaultSlugify } = options;

  if (options.per === 'tag') {
    const result = output as GenerateTagOutput;

    return slugify(result.tag);
  }

  if (options.per === 'file') {
    return isUrl(schemaId)
      ? 'index'
      : path.basename(schemaId, path.extname(schemaId));
  }

  const result = output as GeneratePageOutput;

  if (result.type === 'operation') {
    const operation = document.paths![result.item.path]![result.item.method]!;

    if (algorithm === 'v2' && operation.operationId) {
      return operation.operationId;
    }

    return path.join(
      getOutputPathFromRoute(result.item.path),
      result.item.method.toLowerCase(),
    );
  }

  const hook = document.webhooks![result.item.name][result.item.method]!;

  if (algorithm === 'v2' && hook.operationId) {
    return hook.operationId;
  }

  return slugify(result.item.name);
}

function isUrl(input: string): boolean {
  return input.startsWith('https://') || input.startsWith('http://');
}

function getOutputPathFromRoute(path: string): string {
  return (
    path
      .toLowerCase()
      .replaceAll('.', '-')
      .split('/')
      .map((v) => {
        if (v.startsWith('{') && v.endsWith('}')) return v.slice(1, -1);
        return v;
      })
      .join('/') ?? ''
  );
}

function writeIndexFiles(context: HookContext, options: Config) {
  const { index, output, cwd = process.cwd() } = options;
  if (!index) return;

  const { items, url } = index;
  let urlFn: (path: string) => string;
  if (typeof url === 'object') {
    const getUrl = createGetUrl(url.baseUrl);
    const contentDir = path.resolve(cwd, url.contentDir);

    urlFn = (file) => getUrl(getSlugs(path.relative(contentDir, file)));
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

      content.push(
        `<Card href="${urlFn(file.path)}" title=${JSON.stringify(data.title)} description=${JSON.stringify(data.description)} />`,
      );
    }

    content.push('</Cards>');
    return generateDocument(
      {
        title: index.title ?? 'Overview',
        description: index.description,
      },
      content.join('\n'),
      options,
    );
  }

  const outputDir = path.join(cwd, output);

  for (const item of typeof items === 'function' ? items(context) : items) {
    const outPath = path.join(
      outputDir,
      path.extname(item.path).length === 0 ? `${item.path}.mdx` : item.path,
    );

    context.files.push({
      path: outPath,
      content: fileContent(item),
    });
  }
}

function defaultSlugify(s: string): string {
  return s.replace(/\s+/g, '-').toLowerCase();
}
