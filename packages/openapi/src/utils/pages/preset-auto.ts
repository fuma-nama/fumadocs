import * as path from 'node:path';
import type { ProcessedDocument } from '@/utils/process-document';
import type {
  OperationOutput,
  OutputEntry,
  OutputGroup,
  PageOutput,
  PagesBuilder,
  PagesBuilderConfig,
  WebhookOutput,
} from '@/utils/pages/builder';
import { isUrl } from '@/utils/url';
import type { DistributiveOmit } from '@/types';

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
    | ((entry: DistributiveOmit<OperationOutput | WebhookOutput, 'path'>) => string);

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
  name?: NameFn<PageOutput> | NameFnOptions;
}

interface SchemaConfig extends BaseConfig {
  /**
   * Generate a page for each schema file.
   */
  per: 'file';

  /**
   * Specify name for output file
   */
  name?: NameFn<PageOutput> | NameFnOptions;
}

export type SchemaToPagesOptions =
  | SchemaConfig
  | TagConfig
  | OperationConfig
  | ({
      per: 'custom';
    } & PagesBuilderConfig);

type NameFn<
  Entry extends OperationOutput | WebhookOutput | PageOutput =
    | OperationOutput
    | WebhookOutput
    | PageOutput,
> = (
  this: PagesBuilder,
  output: DistributiveOmit<Entry, 'path'>,
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

export function createAutoPreset(options: SchemaToPagesOptions): PagesBuilderConfig {
  if (options.per === 'custom') return options;
  const {
    slugify = (s) => {
      return s.replace(/\s+/g, '-').toLowerCase();
    },
  } = options;
  let nameFn: NameFn;

  if (typeof options.name === 'function') {
    nameFn = options.name as NameFn;
  } else {
    const { algorithm = 'v2' } = options.name ?? {};

    nameFn = function (result, document) {
      if (result.type === 'page') {
        if (result.tag) return slugify(result.tag.name!);
        const schemaId = result.schemaId;

        return isUrl(schemaId) ? 'index' : path.basename(schemaId, path.extname(schemaId));
      }

      if (result.type === 'operation') {
        const operation = document.paths![result.item.path]![result.item.method]!;

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

  function group(
    builder: PagesBuilder,
    entries: DistributiveOmit<OperationOutput | WebhookOutput, 'path'>[],
  ): OutputEntry[] {
    const groups = new Map<string, OutputGroup>();
    const rest: OutputEntry[] = [];
    const { dereferenced } = builder.document;
    const { groupBy = 'none' } = options as OperationConfig;

    for (const entry of entries) {
      switch (groupBy) {
        case 'route': {
          const groupName = builder.routePathToFilePath(
            entry.type === 'operation' ? entry.item.path : entry.item.name,
          );

          let group = groups.get(groupName);
          if (!group) {
            group = {
              type: 'group',
              info: { title: groupName },
              entries: [],
              schemaId: builder.id,
              path: groupName,
            };
            groups.set(groupName, group);
          }

          group.entries.push({
            ...entry,
            path: path.join(groupName, `${entry.item.method.toLowerCase()}.mdx`),
          });
          break;
        }
        case 'tag': {
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

          for (const tag of tags) {
            const groupName = slugify(tag);
            const { displayName, info } = builder.fromTagName(tag)!;
            let group = groups.get(groupName);
            if (!group) {
              group = {
                type: 'group',
                info: { title: displayName, description: info.description },
                tag: info,
                entries: [],
                schemaId: builder.id,
                path: groupName,
              };
              groups.set(groupName, group);
            }

            group.entries.push({
              ...entry,
              path: path.join(groupName, `${nameFn.call(builder, entry, dereferenced)}.mdx`),
            });
          }

          break;
        }
        default: {
          const fileName = `${nameFn.call(builder, entry, dereferenced)}.mdx`;

          if (typeof groupBy === 'function') {
            const groupDisplayName = groupBy(entry);
            const groupName = slugify(groupDisplayName);

            let group = groups.get(groupName);
            if (!group) {
              group = {
                type: 'group',
                info: { title: groupDisplayName },
                entries: [],
                schemaId: builder.id,
                path: groupName,
              };
              groups.set(groupName, group);
            }

            group.entries.push({
              ...entry,
              path: path.join(groupName, fileName),
            });
            break;
          }

          rest.push({
            ...entry,
            path: fileName,
          });
        }
      }
    }

    rest.push(...groups.values());
    return rest;
  }

  return {
    toPages(builder) {
      const { dereferenced } = builder.document;
      const items = builder.extract();

      if (options.per === 'file') {
        const entry: PageOutput = {
          type: 'page',
          schemaId: builder.id,
          path: '',
          info: {
            title: dereferenced.info?.title ?? 'Unknown',
            description: dereferenced.info?.description,
          },
          ...items,
        };
        entry.path = `${nameFn.call(builder, entry, dereferenced)}.mdx`;
        builder.create(entry);
        return;
      }

      if (options.per === 'tag') {
        const tags = dereferenced.tags ?? [];

        for (const tag of tags) {
          const { displayName } = builder.fromTag(tag);
          const entry: PageOutput = {
            type: 'page',
            path: '',
            schemaId: builder.id,
            info: {
              title: displayName,
              description: tag.description,
            },
            webhooks: items.webhooks.filter((webhook) => webhook.tags?.includes(tag.name!)),
            operations: items.operations.filter((op) => op.tags?.includes(tag.name!)),
            tag,
          };

          entry.path = `${nameFn.call(builder, entry, dereferenced)}.mdx`;
          builder.create(entry);
        }

        return;
      }

      const entries: DistributiveOmit<OperationOutput | WebhookOutput, 'path'>[] = [];
      for (const op of items.operations) {
        const { pathItem, operation, displayName } = builder.fromExtractedOperation(op)!;

        entries.push({
          type: 'operation',
          schemaId: builder.id,
          item: op,
          info: {
            title: displayName,
            description: operation.description ?? pathItem.description,
          },
        });
      }

      for (const webhook of items.webhooks) {
        const { pathItem, operation, displayName } = builder.fromExtractedWebhook(webhook)!;

        entries.push({
          type: 'webhook',
          schemaId: builder.id,
          info: {
            title: displayName,
            description: operation.description ?? pathItem.description,
          },
          item: webhook,
        });
      }

      for (const entry of group(builder, entries)) {
        builder.create(entry);
      }
    },
  };
}
