import * as path from 'node:path';
import type {
  OperationItem,
  OperationOutput,
  OutputGroup,
  PageOutput,
  PagesBuilder,
  PagesBuilderConfig,
} from '@/utils/pages/builder';
import type { DistributiveOmit, OperationObject, TagObject } from '@/types';
import { dereference } from '@fumadocs/json-schema';
import { getOperationDisplayName, getRefKey, getTagDisplayName } from '../schema';
import { applyTraits } from '../traits';

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
  item: OperationItem;
  /** with traits applied */
  operation: OperationObject;
  /** names of its tags */
  tags: string[];
}

export function createAutoPreset(options: SchemaToPagesOptions): PagesBuilderConfig {
  if (options.per === 'custom') return options;
  const { slugify = (s) => s.replace(/\s+/g, '-').toLowerCase() } = options;
  let nameFn: NameFn;

  if (typeof options.name === 'function') {
    nameFn = options.name as NameFn;
  } else {
    const { algorithm = 'v2' } = options.name ?? {};

    nameFn = function (result) {
      if (result.type === 'operation') {
        if (algorithm === 'v2') return result.item.id;
        return path.join(this.routePathToFilePath(result.item.id), result.item.action);
      }

      if (result.tag) return slugify(result.tag.name);
      const { schemaId } = result;
      return schemaId.startsWith('http://') || schemaId.startsWith('https://')
        ? 'index'
        : path.basename(schemaId, path.extname(schemaId));
    };
  }

  return {
    toPages(builder) {
      const { document } = builder;
      // tags are matched by name, `info.tags` describes them
      const tags = new Map<string, TagObject>();
      for (const item of document.info.tags ?? []) {
        const tag = dereference(item);
        tags.set(tag.name, tag);
      }

      const operations: ResolvedOperation[] = [];
      for (const [id, value] of Object.entries(document.operations ?? {})) {
        const operation = applyTraits(dereference(value));
        const names: string[] = [];
        for (const item of operation.tags ?? []) {
          const tag = dereference(item);
          if (!tags.has(tag.name)) tags.set(tag.name, tag);
          names.push(tag.name);
        }

        operations.push({ item: { id, action: operation.action }, operation, tags: names });
      }

      function page(info: PageOutput['info'], items: ResolvedOperation[], tag?: TagObject) {
        const operations: OperationItem[] = [];
        for (const { item } of items) operations.push(item);

        const entry: PageOutput = {
          type: 'page',
          schemaId: builder.id,
          path: '',
          info,
          operations,
          tag,
        };
        entry.path = `${nameFn.call(builder, entry)}.mdx`;
        builder.create(entry);
      }

      if (options.per === 'file') {
        page(
          { title: document.info.title ?? 'Unknown', description: document.info.description },
          operations,
        );
        return;
      }

      if (options.per === 'tag') {
        for (const [name, items] of groupByTag(operations)) {
          const tag = tags.get(name) ?? { name };
          page({ title: getTagDisplayName(tag), description: tag.description }, items, tag);
        }
        return;
      }

      const { groupBy = 'none' } = options;
      const groups = new Map<string, OutputGroup>();

      function getGroup(key: string, info: () => Pick<OutputGroup, 'info' | 'tag'>): OutputGroup {
        let group = groups.get(key);
        if (!group) {
          group = { type: 'group', entries: [], schemaId: builder.id, path: key, ...info() };
          groups.set(key, group);
        }
        return group;
      }

      function add(
        { item, operation }: ResolvedOperation,
        getParent?: (entry: OperationOutput) => OutputGroup,
      ) {
        // `path` is set once its folder is known
        const entry = {
          type: 'operation',
          schemaId: builder.id,
          item,
          info: {
            title: getOperationDisplayName(item.id, operation),
            description: operation.description,
          },
        } as OperationOutput;
        const fileName = `${nameFn.call(builder, entry)}.mdx`;
        const parent = getParent?.(entry);

        if (parent) {
          entry.path = path.join(parent.path, fileName);
          parent.entries.push(entry);
        } else {
          entry.path = fileName;
          builder.create(entry);
        }
      }

      if (groupBy === 'tag') {
        for (const [name, items] of groupByTag(operations)) {
          const tag = tags.get(name) ?? { name };
          const group = getGroup(slugify(name), () => ({
            info: { title: getTagDisplayName(tag), description: tag.description },
            tag,
          }));

          for (const item of items) add(item, () => group);
        }
      } else if (groupBy === 'channel') {
        for (const item of operations) {
          add(item, () => {
            // the key of channel in `channels` is path-safe, unlike its address
            const ref = (item.operation.channel as { $ref?: string }).$ref;
            const key = ref ? getRefKey(ref) : item.item.id;

            return getGroup(slugify(key), () => {
              const channel = dereference(item.operation.channel);
              return {
                info: {
                  title: channel.title || channel.address || key,
                  description: channel.summary ?? channel.description,
                },
              };
            });
          });
        }
      } else if (typeof groupBy === 'function') {
        for (const item of operations) {
          add(item, (entry) => {
            const title = groupBy(entry);
            return getGroup(slugify(title), () => ({ info: { title } }));
          });
        }
      } else {
        for (const item of operations) add(item);
      }

      for (const group of groups.values()) builder.create(group);
    },
  };
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
