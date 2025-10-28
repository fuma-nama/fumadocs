import * as path from 'node:path';
import type { ProcessedDocument } from '@/utils/process-document';
import type {
  OperationOutput,
  OutputEntry,
  OutputGroup,
  PagesBuilder,
  PagesBuilderConfig,
  TagOutput,
  WebhookOutput,
} from '@/utils/pages/builder';
import { isUrl } from '@/utils/url';

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
   * - a function that aligns group name (folder path) to each entry
   *
   * @defaultValue 'none'
   */
  groupBy?:
    | 'tag'
    | 'route'
    | 'none'
    | ((entry: OperationOutput | WebhookOutput) => string);

  /**
   * Specify name for output file
   */
  name?: NameFn<OperationOutput | WebhookOutput> | NameFnOptions;
}

interface TagConfig extends BaseConfig {
  /**
   * Generate a page for each tag.
   */
  per: 'tag';

  /**
   * Specify name for output file
   */
  name?: NameFn<TagOutput> | NameFnOptions;
}

interface SchemaConfig extends BaseConfig {
  /**
   * Generate a page for each schema file.
   */
  per: 'file';

  /**
   * Specify name for output file
   */
  name?: NameFn<OutputGroup> | NameFnOptions;
}

export type SchemaToPagesOptions =
  | SchemaConfig
  | TagConfig
  | OperationConfig
  | ({
      per: 'custom';
    } & PagesBuilderConfig);

type NameFn<Entry> = (
  this: PagesBuilder,
  output: Entry,
  document: ProcessedDocument['dereferenced'],
) => string;

interface NameFnOptions {
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

interface BaseConfig {
  /**
   * Custom function to convert names into file names.
   *
   * By default, it only escapes whitespaces and upper case (English) characters
   */
  slugify?: (name: string) => string;
}

export function createAutoPreset(
  options: SchemaToPagesOptions,
): PagesBuilderConfig {
  if (options.per === 'custom') return options;
  const {
    slugify = (s) => {
      return s.replace(/\s+/g, '-').toLowerCase();
    },
  } = options;
  let nameFn: NameFn<OutputEntry>;

  if (typeof options.name === 'function') {
    nameFn = options.name as NameFn<OutputEntry>;
  } else {
    const { algorithm = 'v2' } = options.name ?? {};

    nameFn = function (result, document) {
      if (result.type === 'tag') {
        return slugify(result.tag);
      }

      if (result.type === 'group') {
        const schemaId = result.schemaId;

        return isUrl(schemaId)
          ? 'index'
          : path.basename(schemaId, path.extname(schemaId));
      }

      if (result.type === 'operation') {
        const operation =
          document.paths![result.item.path]![result.item.method]!;

        if (algorithm === 'v2' && operation.operationId) {
          return operation.operationId;
        }

        return path.join(
          this.routePathToFilePath(result.item.path),
          result.item.method.toLowerCase(),
        );
      }

      const hook = document.webhooks![result.item.name][result.item.method]!;

      if (algorithm === 'v2' && hook.operationId) {
        return hook.operationId;
      }

      return slugify(result.item.name);
    };
  }

  function groupOutput(
    builder: PagesBuilder,
    entry: OperationOutput | WebhookOutput,
  ): string[] {
    const { dereferenced } = builder.document;
    const { groupBy = 'none' } = options as OperationConfig;

    if (groupBy === 'route') {
      return [
        path.join(
          builder.routePathToFilePath(
            entry.type === 'operation' ? entry.item.path : entry.item.name,
          ),
          `${entry.item.method.toLowerCase()}.mdx`,
        ),
      ];
    }

    const file = nameFn.call(builder, entry, dereferenced);
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

    if (typeof groupBy === 'function') {
      return [path.join(slugify(groupBy(entry)), `${file}.mdx`)];
    }

    return [`${file}.mdx`];
  }

  return {
    toPages(builder) {
      const { dereferenced } = builder.document;
      const items = builder.extract();

      if (options.per === 'file') {
        const entry: OutputGroup = {
          type: 'group',
          schemaId: builder.id,
          path: '',
          info: {
            title: dereferenced.info.title,
            description: dereferenced.info.description,
          },
          ...items,
        };
        entry.path = nameFn.call(builder, entry, dereferenced) + '.mdx';
        builder.create(entry);
        return;
      }

      if (options.per === 'tag') {
        const tags = dereferenced.tags ?? [];
        for (const tag of tags) {
          const { displayName } = builder.fromTag(tag);
          const entry: TagOutput = {
            type: 'tag',
            path: '',
            schemaId: builder.id,
            info: {
              title: displayName,
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

          entry.path = nameFn.call(builder, entry, dereferenced) + '.mdx';
          builder.create(entry);
        }

        return;
      }

      for (const op of items.operations) {
        const { pathItem, operation, displayName } =
          builder.fromExtractedOperation(op)!;

        const entry: OperationOutput = {
          type: 'operation',
          schemaId: builder.id,
          item: op,
          path: '',
          info: {
            title: displayName,
            description: operation.description ?? pathItem.description,
          },
        };

        for (const outputPath of groupOutput(builder, entry)) {
          builder.create({ ...entry, path: outputPath });
        }
      }

      for (const webhook of items.webhooks) {
        const { pathItem, operation, displayName } =
          builder.fromExtractedWebhook(webhook)!;

        const entry: WebhookOutput = {
          type: 'webhook',
          schemaId: builder.id,
          info: {
            title: displayName,
            description: operation.description ?? pathItem.description,
          },
          item: webhook,
          path: '',
        };

        for (const outputPath of groupOutput(builder, entry)) {
          builder.create({ ...entry, path: outputPath });
        }
      }
    },
  };
}
