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
import type { AsyncAPIObject, DistributiveOmit, OperationObject, TagObject } from '@/types';
import { dereference } from '@fumadocs/json-schema';
import { getOperationDisplayName, getTagDisplayName } from '../schema';
import { applyOperationTraits } from '../traits';

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

interface ResolvedOperation {
  id: string;
  /** with traits applied */
  operation: OperationObject;
  /** names of its tags */
  tags: string[];
}

/**
 * Resolve the operations of document with their traits, and the tags they use by name.
 */
function resolveOperations(doc: AsyncAPIObject): {
  operations: ResolvedOperation[];
  tags: Map<string, TagObject>;
} {
  const tags = new Map<string, TagObject>();
  for (const item of doc.info.tags ?? []) {
    const tag = dereference(item);
    tags.set(tag.name, tag);
  }

  const operations: ResolvedOperation[] = [];
  for (const [id, item] of Object.entries(doc.operations ?? {})) {
    const operation = applyOperationTraits(dereference(item));
    const names: string[] = [];
    for (const item of operation.tags ?? []) {
      const tag = dereference(item);
      if (!tags.has(tag.name)) tags.set(tag.name, tag);
      names.push(tag.name);
    }

    operations.push({ id, operation, tags: names });
  }

  return { operations, tags };
}

/** group operations by tag, operations without tags are under `unknown` */
function groupByTag(operations: ResolvedOperation[]): Map<string, ResolvedOperation[]> {
  const out = new Map<string, ResolvedOperation[]>();
  let warned = false;

  for (const item of operations) {
    let names = item.tags;
    if (names.length === 0) {
      if (!warned) {
        warned = true;
        console.warn(
          '[Fumadocs AsyncAPI] found operations without tags, they will be grouped under "unknown".',
        );
      }
      names = ['unknown'];
    }

    for (const name of names) {
      const list = out.get(name);
      if (list) list.push(item);
      else out.set(name, [item]);
    }
  }

  return out;
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

  function toEntry(
    builder: PagesBuilder,
    { id, operation }: ResolvedOperation,
  ): DistributiveOmit<OperationOutput, 'path'> {
    return {
      type: 'operation',
      schemaId: builder.id,
      item: { id, action: operation.action },
      info: {
        title: getOperationDisplayName(id, operation),
        description: operation.description,
      },
    };
  }

  function group(
    builder: PagesBuilder,
    resolved: ResolvedOperation[],
    tags: Map<string, TagObject>,
  ): OutputEntry[] {
    const groups = new Map<string, OutputGroup>();
    const rest: OutputEntry[] = [];
    const { groupBy = 'none' } = options as OperationConfig;

    function getGroup(key: string, info: () => Pick<OutputGroup, 'info' | 'tag'>): OutputGroup {
      let group = groups.get(key);
      if (!group) {
        group = { type: 'group', entries: [], schemaId: builder.id, path: key, ...info() };
        groups.set(key, group);
      }
      return group;
    }

    if (groupBy === 'tag') {
      for (const [name, items] of groupByTag(resolved)) {
        const tag = tags.get(name) ?? { name };
        const group = getGroup(slugify(name), () => ({
          info: { title: getTagDisplayName(tag), description: tag.description },
          tag,
        }));

        for (const item of items) {
          const entry = toEntry(builder, item);
          group.entries.push({
            ...entry,
            path: path.join(group.path, `${nameFn.call(builder, entry)}.mdx`),
          });
        }
      }

      return Array.from(groups.values());
    }

    for (const item of resolved) {
      const { id, operation } = item;
      const entry = toEntry(builder, item);
      const fileName = `${nameFn.call(builder, entry)}.mdx`;

      if (groupBy === 'channel') {
        // the key of channel in `channels` is path-safe, unlike its address
        const ref = (operation.channel as { $ref?: string }).$ref;
        const key = ref ? ref.slice(ref.lastIndexOf('/') + 1) : id;
        const group = getGroup(slugify(key), () => {
          const channel = dereference(operation.channel);
          return {
            info: {
              title: channel.title || channel.address || key,
              description: channel.summary ?? channel.description,
            },
          };
        });

        group.entries.push({ ...entry, path: path.join(group.path, fileName) });
      } else if (typeof groupBy === 'function') {
        const title = groupBy(entry);
        const group = getGroup(slugify(title), () => ({ info: { title } }));

        group.entries.push({ ...entry, path: path.join(group.path, fileName) });
      } else {
        rest.push({ ...entry, path: fileName });
      }
    }

    for (const group of groups.values()) rest.push(group);
    return rest;
  }

  return {
    toPages(builder) {
      const doc = builder.document;
      const { operations, tags } = resolveOperations(doc);

      if (options.per === 'file') {
        const items: OperationItem[] = [];
        for (const { id, operation } of operations) items.push({ id, action: operation.action });

        const entry: PageOutput = {
          type: 'page',
          schemaId: builder.id,
          path: '',
          info: {
            title: doc.info.title ?? 'Unknown',
            description: doc.info.description,
          },
          operations: items,
        };
        entry.path = `${nameFn.call(builder, entry)}.mdx`;
        builder.create(entry);
        return;
      }

      if (options.per === 'tag') {
        for (const [name, list] of groupByTag(operations)) {
          const tag = tags.get(name) ?? { name };
          const items: OperationItem[] = [];
          for (const { id, operation } of list) items.push({ id, action: operation.action });

          const entry: PageOutput = {
            type: 'page',
            path: '',
            schemaId: builder.id,
            info: {
              title: getTagDisplayName(tag),
              description: tag.description,
            },
            operations: items,
            tag,
          };

          entry.path = `${nameFn.call(builder, entry)}.mdx`;
          builder.create(entry);
        }

        return;
      }

      for (const entry of group(builder, operations, tags)) {
        builder.create(entry);
      }
    },
  };
}
