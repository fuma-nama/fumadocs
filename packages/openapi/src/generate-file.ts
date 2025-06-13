import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { resolve } from 'node:path';
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
  type DocumentInput,
  processDocument,
  type ProcessedDocument,
} from '@/utils/process-document';

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
   * Schema files
   */
  input: string[] | string;

  /**
   * Output directory
   */
  output: string;
}

export async function generateFiles(options: Config): Promise<void> {
  const { input, cwd = process.cwd() } = options;
  const urlInputs: string[] = [];
  const fileInputs: string[] = [];

  for (const v of typeof input === 'string' ? [input] : input) {
    if (isUrl(v)) {
      urlInputs.push(v);
    } else {
      fileInputs.push(v);
    }
  }

  const resolvedInputs = [
    ...(await glob(fileInputs, { cwd, absolute: false })),
    ...urlInputs,
  ];

  if (resolvedInputs.length === 0) {
    throw new Error(
      `No input files found. Tried resolving: ${
        typeof input === 'string' ? input : input.join(', ')
      }`,
    );
  }

  await Promise.all(
    resolvedInputs.map((input) => generateFromDocument(input, options)),
  );
}

async function generateFromDocument(pathOrUrl: string, options: Config) {
  const { output, cwd = process.cwd() } = options;
  let nameFn: (
    output: GeneratePageOutput | GenerateTagOutput | GenerateFileOutput,
    document: ProcessedDocument['document'],
  ) => string;

  if (!options.name || typeof options.name !== 'function') {
    const { algorithm = 'v2' } = options.name ?? {};

    nameFn = (output, document) => {
      if (options.per === 'tag') {
        const result = output as GenerateTagOutput;

        return getFilename(result.tag);
      }

      if (options.per === 'file') {
        return isUrl(pathOrUrl)
          ? 'index'
          : path.basename(pathOrUrl, path.extname(pathOrUrl));
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

      return getFilename(result.item.name);
    };
  } else {
    nameFn = options.name as typeof nameFn;
  }

  const document = await dereference(pathOrUrl, options);
  const outputDir = path.join(cwd, output);

  async function write(file: string, content: string) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }

  function getOutputPaths(
    groupBy: OperationConfig['groupBy'] = 'none',
    result: GeneratePageOutput,
  ): string[] {
    const file = nameFn(result, document.document);

    if (groupBy === 'route') {
      return [
        path.join(
          result.type === 'operation' ? result.item.path : result.item.name,
          result.item.method,
        ) + '.mdx',
      ];
    }

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

      return tags.map((tag) => path.join(getFilename(tag), `${file}.mdx`));
    }

    return [`${file}.mdx`];
  }

  if (options.per === 'file') {
    const result = await generateAll(pathOrUrl, document, options);
    const filename = nameFn(
      {
        pathOrUrl,
        content: result,
      },
      document.document,
    );

    const outPath = path.join(outputDir, `${filename}.mdx`);

    await write(outPath, result);
    console.log(`Generated: ${outPath}`);
  } else if (options.per === 'tag') {
    const results = await generateTags(pathOrUrl, document, options);

    for (const result of results) {
      const filename = nameFn(result, document.document);
      const outPath = path.join(outputDir, `${filename}.mdx`);
      await write(outPath, result.content);
      console.log(`Generated: ${outPath}`);
    }
  } else {
    const results = await generatePages(pathOrUrl, document, options);
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

function getFilename(s: string): string {
  return s.replace(/\s+/g, '-').toLowerCase();
}

async function dereference(
  pathOrDocument: DocumentInput,
  options: GenerateOptions,
) {
  return processDocument(
    // resolve paths
    typeof pathOrDocument === 'string' &&
      !pathOrDocument.startsWith('http://') &&
      !pathOrDocument.startsWith('https://')
      ? resolve(options.cwd ?? process.cwd(), pathOrDocument)
      : pathOrDocument,
  );
}
