import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { glob } from 'tinyglobby';
import {
  generateAll,
  type GenerateOptions,
  type GeneratePageOutput,
  generatePages,
  type GenerateTagOutput,
  generateTags,
} from './generate';
import {
  processDocument,
  type ProcessedDocument,
} from '@/utils/process-document';
import type { OpenAPIServer } from '@/server';

interface GenerateFileOutput {
  /**
   * The original schema file path/url from `input`
   */
  pathOrUrl: string;

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
}

export async function generateFiles(options: Config): Promise<void> {
  const { cwd = process.cwd() } = options;
  const input =
    typeof options.input === 'string' ? [options.input] : options.input;
  let schemas: Record<string, ProcessedDocument> = {};

  if (Array.isArray(input)) {
    const targets: string[] = [];

    for (const item of input) {
      if (isUrl(item)) {
        targets.push(item);
      } else {
        targets.push(...(await glob(item, { cwd, absolute: true })));
      }
    }

    await Promise.all(
      targets.map(async (item) => {
        schemas[item] = await processDocument(item);
      }),
    );
  } else {
    schemas = await input.getSchemas();
  }

  const resolvedSchemas = Object.entries(schemas);

  if (resolvedSchemas.length === 0) {
    throw new Error('No input files found.');
  }

  await Promise.all(
    resolvedSchemas.map(([id, document]) =>
      generateFromDocument(id, document, options),
    ),
  );
}

async function generateFromDocument(
  schemaId: string,
  document: ProcessedDocument,
  options: Config,
) {
  const { output, cwd = process.cwd(), slugify = defaultSlugify } = options;
  const outputDir = path.join(cwd, output);

  let nameFn: (
    output: GeneratePageOutput | GenerateTagOutput | GenerateFileOutput,
    document: ProcessedDocument['document'],
  ) => string;

  if (!options.name || typeof options.name !== 'function') {
    const { algorithm = 'v2' } = options.name ?? {};

    nameFn = (output, document) => {
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
        const operation =
          document.paths![result.item.path]![result.item.method]!;

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
    };
  } else {
    nameFn = options.name as typeof nameFn;
  }

  async function write(file: string, content: string) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
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

    const file = nameFn(result, document.document);
    if (groupBy === 'tag') {
      let tags =
        result.type === 'operation'
          ? document.document.paths![result.item.path]![result.item.method]!
              .tags
          : document.document.webhooks![result.item.name][result.item.method]!
              .tags;

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
    const result = await generateAll(schemaId, document, options);
    const filename = nameFn(
      {
        pathOrUrl: schemaId,
        content: result,
      },
      document.document,
    );

    const outPath = path.join(outputDir, `${filename}.mdx`);

    await write(outPath, result);
    console.log(`Generated: ${outPath}`);
  } else if (options.per === 'tag') {
    const results = await generateTags(schemaId, document, options);

    for (const result of results) {
      const filename = nameFn(result, document.document);
      const outPath = path.join(outputDir, `${filename}.mdx`);
      await write(outPath, result.content);
      console.log(`Generated: ${outPath}`);
    }
  } else {
    const results = await generatePages(schemaId, document, options);
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

      await write(path.join(outputDir, outputPath), output.content);
      console.log(`Generated: ${outputPath}`);
    }
  }
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

function defaultSlugify(s: string): string {
  return s.replace(/\s+/g, '-').toLowerCase();
}
