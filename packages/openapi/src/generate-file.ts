import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { glob } from 'tinyglobby';
import {
  generateAll,
  generateIndexOnly,
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

interface IndexConfig {
  /**
   * Map input schema IDs to index file names
   * - string: Use the same index file name for all inputs
   * - Record<string, string>: Map specific schema IDs to index file names
   */
  name: string | Record<string, string>;

  /**
   * URL path for getPageTreePeers functionality when generating cards
   * Used when multiple inputs share the same index file
   */
  url?: string;

  /**
   * Title for the generated index file of the schema(s).
   * Used in frontmatter
   */
  title?: string;

  /**
   * Description for the generated index file of the schema(s).
   * Used in frontmatter
   */
  description?: string;
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
   * Generate index files with custom paths and content.
   * When multiple inputs share the same index file, generates Cards-based content.
   */
  index?: IndexConfig;
}

export async function generateFiles(options: Config): Promise<void> {
  const { cwd = process.cwd() } = options;
  const input =
    typeof options.input === 'string' ? [options.input] : options.input;
  let schemas: Record<string, ProcessedDocument> = {};

  if (Array.isArray(input)) {
    const targets: string[] = [];
    const patterns: string[] = [];

    for (const item of input) {
      if (isUrl(item)) targets.push(item);
      else patterns.push(item);
    }

    if (patterns.length > 0) targets.push(...(await glob(patterns, { cwd })));

    await Promise.all(
      targets.map(async (item) => {
        schemas[item] = await processDocument(path.join(cwd, item));
      }),
    );
  } else {
    schemas = await input.getSchemas();
  }

  const resolvedSchemas = Object.entries(schemas);

  if (resolvedSchemas.length === 0) {
    throw new Error('No input files found.');
  }

  // Generate regular files first
  await Promise.all(
    resolvedSchemas.map(([id, document]) =>
      generateFromDocument(id, document, options),
    ),
  );

  // Generate index files if configured
  if (options.index) {
    await generateIndexFiles(resolvedSchemas, options, cwd);
  }
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

async function generateIndexFiles(
  resolvedSchemas: [string, ProcessedDocument][],
  options: Config,
  cwd: string,
): Promise<void> {
  const { index, output } = options;
  if (!index) return;

  const outputDir = path.join(cwd, output);

  // Map index filenames to schemas that should contribute to them
  const indexMap = new Map<
    string,
    { schemaId: string; document: ProcessedDocument }[]
  >();

  // Process each schema to determine which index files it should contribute to
  for (const [schemaId, document] of resolvedSchemas) {
    let indexFilename: string | undefined;

    if (typeof index.name === 'string') {
      // All schemas use the same index file
      indexFilename = index.name;
    } else {
      // Look up specific mapping for this schema
      // Try exact match first, then try with ./ prefix
      indexFilename = index.name[schemaId] || index.name[`./${schemaId}`];
    }

    if (indexFilename) {
      if (!indexMap.has(indexFilename)) {
        indexMap.set(indexFilename, []);
      }
      indexMap.get(indexFilename)!.push({ schemaId, document });
    }
  }

  // Generate each index file
  for (const [indexFilename, schemas] of indexMap.entries()) {
    const indexPath = path.join(outputDir, `${indexFilename}.mdx`);

    let content: string;

    if (schemas.length === 1) {
      // Single schema: use traditional title/description format
      const { schemaId, document } = schemas[0];
      content = await generateIndexOnly(schemaId, document, options);
    } else {
      // Multiple schemas: use Cards format
      content = await generateCardsIndexContent(schemas, index, options);
    }

    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(indexPath, content);
    console.log(`Generated: ${indexFilename}.mdx`);
  }
}

async function generateCardsIndexContent(
  schemas: { schemaId: string; document: ProcessedDocument }[],
  indexConfig: IndexConfig,
  options: GenerateOptions,
): Promise<string> {
  // Build frontmatter
  const frontmatter: Record<string, unknown> = {};

  frontmatter.title = indexConfig.title;
  frontmatter.description = indexConfig.description;

  // Build content
  const parts: string[] = [];

  // Add frontmatter
  parts.push('---');
  for (const [key, value] of Object.entries(frontmatter)) {
    parts.push(`${key}: ${JSON.stringify(value)}`);
  }
  parts.push('---');

  if (options.addGeneratedComment !== false) {
    let commentContent =
      'This file was generated by Fumadocs. Do not edit this file directly. Any changes should be made by running the generation command again.';

    if (typeof options.addGeneratedComment === 'string') {
      commentContent = options.addGeneratedComment;
    }

    commentContent = commentContent.replaceAll('/', '\\/');
    parts.push(`{/* ${commentContent} */}`);
  }

  const imports = options.imports
    ?.map(
      (item) =>
        `import { ${item.names.join(', ')} } from ${JSON.stringify(item.from)};`,
    )
    .join('\n');

  if (imports) {
    parts.push(imports);
  }

  // Add Cards content
  parts.push('');

  const containsSourceImport = options.imports?.some((importObj) =>
    importObj.names.includes('source'),
  );

  const containsGetPageTreePeersImport = options.imports?.some((importObj) =>
    importObj.names.includes('getPageTreePeers'),
  );

  if (
    indexConfig.url &&
    containsSourceImport &&
    containsGetPageTreePeersImport
  ) {
    parts.push('<Cards>');
    parts.push(
      `  {getPageTreePeers(source.pageTree, '${indexConfig.url}').map((peer) => (`,
    );
    parts.push('    <Card key={peer.url} title={peer.name} href={peer.url}>');
    parts.push('      {peer.description}');
    parts.push('    </Card>');
    parts.push('  ))}');
    parts.push('</Cards>');
  }

  return parts.join('\n');
}

function defaultSlugify(s: string): string {
  return s.replace(/\s+/g, '-').toLowerCase();
}
