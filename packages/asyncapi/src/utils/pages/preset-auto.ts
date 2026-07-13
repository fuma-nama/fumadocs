import * as path from 'node:path';
import type {
  OperationItem,
  OperationOutput,
  OutputEntry,
  OutputGroup,
  PageOutput,
  PagesBuilder,
  PagesBuilderConfig,
} from '@/utils/pages/builder';
import type { DistributiveOmit, TagObject } from '@/types';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { getOperationDisplayName, getTagDisplayName } from '../schema';

interface OperationConfig extends BaseConfig {
  per?: 'operation';
  groupBy?:
    | 'tag'
    | 'channel'
    | 'none'
    | ((entry: DistributiveOmit<OperationOutput, 'path'>) => string);
  name?: NameFn<OperationOutput> | NameFnOptions;
}

interface TagConfig extends BaseConfig {
  per: 'tag';
  name?: NameFn<PageOutput> | NameFnOptions;
}

interface SchemaConfig extends BaseConfig {
  per: 'file';
  name?: NameFn<PageOutput> | NameFnOptions;
}

export type SchemaToPagesOptions =
  | SchemaConfig
  | TagConfig
  | OperationConfig
  | ({
      per: 'custom';
    } & PagesBuilderConfig);

type NameFn<Entry extends OperationOutput | PageOutput = OperationOutput | PageOutput> = (
  this: PagesBuilder,
  output: DistributiveOmit<Entry, 'path'>,
) => string;

interface NameFnOptions {
  algorithm?: 'v2' | 'v1';
}

interface BaseConfig {
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
        if (result.tag) return slugify(result.tag.name);
        const schemaId = result.schemaId;

        return schemaId.startsWith('http://') || schemaId.startsWith('https://')
          ? 'index'
          : path.basename(schemaId, path.extname(schemaId));
      }

      if (algorithm === 'v2') {
        return result.item.id;
      }

      return path.join(this.routePathToFilePath(result.item.id), result.item.action);
    };
  }

  function group(
    builder: PagesBuilder,
    entries: DistributiveOmit<OperationOutput, 'path'>[],
  ): OutputEntry[] {
    const groups = new Map<string, OutputGroup>();
    const rest: OutputEntry[] = [];
    const doc = builder.document;
    const { groupBy = 'none' } = options as OperationConfig;

    for (const entry of entries) {
      switch (groupBy) {
        case 'channel': {
          const operation = dereferenceShallow(doc.operations?.[entry.item.id]);
          const channel = operation ? dereferenceShallow(operation.channel) : undefined;
          const groupName = slugify(channel?.address || entry.item.id);

          let group = groups.get(groupName);
          if (!group) {
            group = {
              type: 'group',
              info: {
                title: channel?.title || channel?.address || groupName,
                description: channel?.description,
              },
              entries: [],
              schemaId: builder.id,
              path: groupName,
            };
            groups.set(groupName, group);
          }

          group.entries.push({
            ...entry,
            path: path.join(groupName, `${entry.item.action}.mdx`),
          });
          break;
        }
        case 'tag': {
          const operation = dereferenceShallow(doc.operations?.[entry.item.id])!;
          let tags = operation.tags?.map((t) => dereferenceShallow(t));

          if (!tags || tags.length === 0) {
            console.warn(
              'When `groupBy` is set to `tag`, make sure a `tags` is defined for every operation schema.',
            );
            tags = [{ name: 'unknown' }];
          }

          for (const tag of tags) {
            const groupId = slugify(tag.name);
            let group = groups.get(groupId);
            if (!group) {
              group = {
                type: 'group',
                info: { title: getTagDisplayName(tag), description: tag.description },
                tag,
                entries: [],
                schemaId: builder.id,
                path: groupId,
              };
              groups.set(groupId, group);
            }

            group.entries.push({
              ...entry,
              path: path.join(groupId, `${nameFn.call(builder, entry)}.mdx`),
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

      if (options.per === 'file') {
        const entry: PageOutput = {
          type: 'page',
          schemaId: builder.id,
          path: '',
          info: {
            title: doc.info.title ?? 'Unknown',
            description: doc.info.description,
          },
          operations: Object.entries(doc.operations ?? {}).map(([id, operation]) => ({
            id,
            action: dereferenceShallow(operation).action,
          })),
        };
        entry.path = `${nameFn.call(builder, entry)}.mdx`;
        builder.create(entry);
        return;
      }

      if (options.per === 'tag') {
        const uniqueTags = new Map<string, TagObject>();
        for (const _op of Object.values(doc.operations ?? {})) {
          const operation = dereferenceShallow(_op);

          if (!operation.tags) continue;
          for (const _tag of operation.tags) {
            const tag = dereferenceShallow(_tag);
            uniqueTags.set(tag.name, tag);
          }
        }

        for (const tag of uniqueTags.values()) {
          const operations: OperationItem[] = [];
          for (const [id, _op] of Object.entries(doc.operations ?? {})) {
            const operation = dereferenceShallow(_op);
            if (operation.tags && operation.tags.includes(tag)) {
              operations.push({ id, action: operation.action });
            }
          }

          const entry: PageOutput = {
            type: 'page',
            path: '',
            schemaId: builder.id,
            info: {
              title: getTagDisplayName(tag),
              description: tag.description,
            },
            operations,
            tag,
          };

          entry.path = `${nameFn.call(builder, entry)}.mdx`;
          builder.create(entry);
        }

        return;
      }

      const entries: DistributiveOmit<OperationOutput, 'path'>[] = [];
      for (const [id, _op] of Object.entries(doc.operations ?? {})) {
        const operation = dereferenceShallow(_op);

        entries.push({
          type: 'operation',
          schemaId: builder.id,
          item: { id, action: operation.action },
          info: {
            title: getOperationDisplayName(id, operation),
            description: operation.description,
          },
        });
      }

      for (const entry of group(builder, entries)) {
        builder.create(entry);
      }
    },
  };
}
