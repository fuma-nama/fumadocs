import * as path from 'node:path';
import type {
  OperationOutput,
  OutputEntry,
  OutputGroup,
  PageOutput,
  PagesBuilder,
  PagesBuilderConfig,
  WebhookOutput,
} from '@/utils/pages/builder';
import type { DistributiveOmit, TagObject } from '@/types';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { getTagDisplayName } from '@/utils/schema';

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
> = (this: PagesBuilder, output: DistributiveOmit<Entry, 'path'>) => string;

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

    nameFn = function (result) {
      if (result.type === 'page') {
        if (result.tag) return slugify(result.tag.name!);
        const schemaId = result.schemaId;

        return schemaId.startsWith('http://') || schemaId.startsWith('https://')
          ? 'index'
          : path.basename(schemaId, path.extname(schemaId));
      }

      if (result.type === 'operation') {
        const operation = this.document.paths![result.item.path]![result.item.method]!;

        if (algorithm === 'v2' && operation.operationId) {
          return operation.operationId;
        }

        return path.join(
          this.routePathToFilePath(result.item.path),
          result.item.method.toLowerCase(),
        );
      }

      const hook = dereferenceShallow(this.document.webhooks![result.item.name])[
        result.item.method
      ]!;

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
    const doc = builder.document;
    const { groupBy = 'none' } = options as OperationConfig;

    const docTags = new Map<string, TagObject>();
    if (groupBy === 'tag') {
      for (const tag of doc.tags ?? []) {
        if (tag.name) docTags.set(tag.name, tag);
      }
    }
    const tagGroups = new Map<string, OutputGroup>();
    let warnedUntagged = false;

    function tagGroup(name: string, seen?: Set<string>): OutputGroup {
      let group = tagGroups.get(name);
      if (group) return group;

      const tag = docTags.get(name);
      let parent: OutputGroup | undefined;
      if (tag?.parent) {
        // `seen` guards against cyclic `parent` references, which are invalid in OpenAPI
        (seen ??= new Set()).add(name);
        if (!seen.has(tag.parent)) parent = tagGroup(tag.parent, seen);
      }

      group = {
        type: 'group',
        info: {
          title: getTagDisplayName(tag ?? { name }),
          description: tag?.description,
        },
        tag,
        entries: [],
        schemaId: builder.id,
        path: path.join(parent?.path ?? '', slugify(name)),
      };
      tagGroups.set(name, group);
      (parent ? parent.entries : rest).push(group);
      return group;
    }

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
          const operation =
            entry.type === 'operation'
              ? dereferenceShallow(doc.paths?.[entry.item.path])?.[entry.item.method]
              : dereferenceShallow(doc.webhooks?.[entry.item.name])?.[entry.item.method];

          const tags: string[] = [];
          for (const name of operation?.tags ?? []) {
            // tags with a `kind` other than `nav` aren't for navigation (OpenAPI 3.2)
            const kind = docTags.get(name)?.kind;
            if (!kind || kind === 'nav') tags.push(name);
          }

          if (tags.length === 0) {
            if (!warnedUntagged) {
              warnedUntagged = true;
              console.warn(
                '[Fumadocs OpenAPI] found operations without tags, they will be grouped under "unknown".',
              );
            }

            tags.push('unknown');
          }

          const fileName = `${nameFn.call(builder, entry)}.mdx`;
          for (const name of tags) {
            const group = tagGroup(name);

            group.entries.push({
              ...entry,
              path: path.join(group.path, fileName),
            });
          }

          break;
        }
        default: {
          const fileName = `${nameFn.call(builder, entry)}.mdx`;

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
      const doc = builder.document;
      const items = builder.extract();

      if (options.per === 'file') {
        const entry: PageOutput = {
          type: 'page',
          schemaId: builder.id,
          path: '',
          info: {
            title: doc.info?.title ?? 'Unknown',
            description: doc.info?.description,
          },
          ...items,
        };
        entry.path = `${nameFn.call(builder, entry)}.mdx`;
        builder.create(entry);
        return;
      }

      if (options.per === 'tag') {
        const tags = doc.tags ?? [];

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

          entry.path = `${nameFn.call(builder, entry)}.mdx`;
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
            deprecated: operation.deprecated,
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
            deprecated: operation.deprecated,
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
