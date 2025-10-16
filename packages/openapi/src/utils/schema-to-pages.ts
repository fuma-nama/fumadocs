import * as path from 'node:path';
import { type ProcessedDocument } from '@/utils/process-document';
import type { OpenAPIServer } from '@/server';
import type { OperationItem, WebhookItem } from '@/render/api-page';
import { idToTitle } from '@/utils/id-to-title';
import { getAPIPageItems } from '@/build-routes';
import type { TagObject } from '@/types';
import { getTagDisplayName } from '@/utils/schema';

interface BaseEntry {
  path: string;
  schemaId: string;
  info: {
    title: string;
    description?: string;
  };
}

export interface OutputOperationEntry extends BaseEntry {
  type: 'operation';
  item: OperationItem;
}

export interface OutputWebhookEntry extends BaseEntry {
  type: 'webhook';
  item: WebhookItem;
}

export interface OutputTagEntry extends BaseEntry {
  type: 'tag';
  tag: string;
  rawTag: TagObject;
  operations: OperationItem[];
  webhooks: WebhookItem[];
}

export interface OutputSchemaEntry extends BaseEntry {
  type: 'schema';
  operations: OperationItem[];
  webhooks: WebhookItem[];
}

export type OutputEntry =
  | OutputTagEntry
  | OutputOperationEntry
  | OutputWebhookEntry
  | OutputSchemaEntry;

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
  name?: NameFn<OutputOperationEntry | OutputWebhookEntry>;
}

interface TagConfig extends BaseConfig {
  /**
   * Generate a page for each tag.
   */
  per: 'tag';

  /**
   * Specify name for output file
   */
  name?: NameFn<OutputTagEntry>;
}

interface SchemaConfig extends BaseConfig {
  /**
   * Generate a page for each schema file.
   */
  per: 'file';

  /**
   * Specify name for output file
   */
  name?: NameFn<OutputSchemaEntry>;
}

export type SchemaToPagesOptions = SchemaConfig | TagConfig | OperationConfig;

type NameFn<Entry> =
  | ((output: Entry, document: ProcessedDocument['dereferenced']) => string)
  | {
      /**
       * The version of algorithm used to generate file paths.
       *
       * v1: Fumadocs OpenAPI v8
       * v2: Fumadocs OpenAPI v9
       *
       * @defaultValue v2
       */
      algorithm?: 'v2' | 'v1';
    };

interface BaseConfig {
  /**
   * Custom function to convert names into file names.
   *
   * By default, it only escapes whitespaces and upper case (English) characters
   */
  slugify?: (name: string) => string;
}

export async function serverToPages(
  server: OpenAPIServer,
  options: SchemaToPagesOptions,
): Promise<Record<string, OutputEntry[]>> {
  const schemas = await server.getSchemas();
  const generated: Record<string, OutputEntry[]> = {};

  const entries = Object.entries(schemas);
  if (entries.length === 0) {
    throw new Error('No input files found.');
  }

  for (const [id, schema] of entries) {
    generated[id] = schemaToPages(id, schema, options);
  }

  return generated;
}

export function schemaToPages(
  schemaId: string,
  processed: ProcessedDocument,
  options: SchemaToPagesOptions,
): OutputEntry[] {
  const files: OutputEntry[] = [];
  const { dereferenced } = processed;
  const { slugify = defaultSlugify } = options;

  let nameFn: (
    output: OutputEntry,
    document: ProcessedDocument['dereferenced'],
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
    entry: OutputOperationEntry | OutputWebhookEntry,
  ): string[] {
    if (groupBy === 'route') {
      return [
        path.join(
          getOutputPathFromRoute(
            entry.type === 'operation' ? entry.item.path : entry.item.name,
          ),
          `${entry.item.method.toLowerCase()}.mdx`,
        ),
      ];
    }

    const file = nameFn(entry, dereferenced);
    if (groupBy === 'tag') {
      let tags =
        entry.type === 'operation'
          ? dereferenced.paths![entry.item.path]![entry.item.method]!.tags
          : dereferenced.webhooks![entry.item.name][entry.item.method]!.tags;

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
    const items = getAPIPageItems(dereferenced);
    const entry: OutputSchemaEntry = {
      type: 'schema',
      schemaId,
      path: '',
      info: {
        title: dereferenced.info.title,
        description: dereferenced.info.description,
      },
      ...items,
    };
    entry.path = nameFn(entry, dereferenced) + '.mdx';

    files.push(entry);
    return files;
  }

  if (options.per === 'tag') {
    const items = getAPIPageItems(dereferenced);
    const tags = dereferenced.tags ?? [];
    for (const tag of tags) {
      const entry: OutputTagEntry = {
        type: 'tag',
        path: '',
        schemaId,
        info: {
          title: getTagDisplayName(tag),
          description: tag.description,
        },
        webhooks: items.webhooks.filter((webhook) =>
          webhook.tags?.includes(tag.name),
        ),
        operations: items.operations.filter((op) =>
          op.tags?.includes(tag.name),
        ),
        tag: tag.name,
        rawTag: tag,
      };

      entry.path = nameFn(entry, dereferenced) + '.mdx';
      files.push(entry);
    }

    return files;
  }

  const results = getAPIPageItems(dereferenced);

  for (const op of results.operations) {
    const pathItem = dereferenced.paths![op.path]!;
    const operation = pathItem[op.method]!;

    const entry: OutputOperationEntry = {
      type: 'operation',
      schemaId,
      item: op,
      path: '',
      info: {
        title:
          operation.summary ??
          pathItem.summary ??
          idToTitle(operation.operationId ?? 'unknown'),
        description: operation.description ?? pathItem.description,
      },
    };

    for (const outputPath of getOutputPaths(options.groupBy, entry)) {
      files.push({ ...entry, path: outputPath });
    }
  }

  for (const webhook of results.webhooks) {
    const pathItem = dereferenced.webhooks![webhook.name]!;
    const operation = pathItem[webhook.method]!;

    const entry: OutputWebhookEntry = {
      type: 'webhook',
      schemaId,
      info: {
        title: operation.summary ?? pathItem.summary ?? idToTitle(webhook.name),
        description: operation.description ?? pathItem.description,
      },
      item: webhook,
      path: '',
    };

    for (const outputPath of getOutputPaths(options.groupBy, entry)) {
      files.push({ ...entry, path: outputPath });
    }
  }

  return files;
}

function defaultNameFn(
  schemaId: string,
  result: OutputEntry,
  document: ProcessedDocument['dereferenced'],
  options: SchemaToPagesOptions,
  algorithm: 'v2' | 'v1' = 'v2',
) {
  const { slugify = defaultSlugify } = options;

  if (result.type === 'tag') {
    return slugify(result.tag);
  }

  if (result.type === 'schema') {
    return isUrl(schemaId)
      ? 'index'
      : path.basename(schemaId, path.extname(schemaId));
  }

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

export function isUrl(schemaId: string): boolean {
  return schemaId.startsWith('https://') || schemaId.startsWith('http://');
}

function getOutputPathFromRoute(path: string): string {
  return path
    .toLowerCase()
    .replaceAll('.', '-')
    .split('/')
    .flatMap((v) => {
      if (v.startsWith('{') && v.endsWith('}')) return v.slice(1, -1);
      if (v.length === 0) return [];
      return v;
    })
    .join('/');
}

function defaultSlugify(s: string): string {
  return s.replace(/\s+/g, '-').toLowerCase();
}
