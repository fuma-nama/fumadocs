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
import { dereference } from '@fumadocs/json-schema';
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

      const hook = dereference(this.document.webhooks![result.item.name])[result.item.method]!;

      if (algorithm === 'v2' && hook.operationId) {
        return hook.operationId;
      }

      return slugify(result.item.name);
    };
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

      const root: OutputEntry[] = [];
      const groups = new Map<string, OutputGroup>();
      const tags = new Map<string, TagObject>();
      // tags with a `kind` other than `nav` aren't for navigation (OpenAPI 3.2)
      const hidden = new Set<string>();
      for (const tag of doc.tags ?? []) {
        if (!tag.name) continue;
        tags.set(tag.name, tag);
        if (tag.kind && tag.kind !== 'nav') hidden.add(tag.name);
      }
      let warnedUntagged = false;

      /** the navigation tags of an operation, `unknown` if none */
      function navTags(names: string[] = []): string[] {
        const out: string[] = [];
        for (const name of names) {
          if (!hidden.has(name) && !out.includes(name)) out.push(name);
        }
        if (out.length > 0) return out;

        if (!warnedUntagged) {
          warnedUntagged = true;
          console.warn(
            '[Fumadocs OpenAPI] found operations without tags, they will be grouped under "unknown".',
          );
        }
        return ['unknown'];
      }

      /** the folder of a tag, nested in the folder of its `parent` */
      function tagFolder(name: string, seen?: Set<string>): OutputGroup {
        let group = groups.get(name);
        if (group) return group;

        const tag = tags.get(name);
        let parent: OutputGroup | undefined;
        if (tag?.parent) {
          // `seen` guards against cyclic `parent` references, which are invalid in OpenAPI
          (seen ??= new Set()).add(name);
          if (!seen.has(tag.parent)) parent = tagFolder(tag.parent, seen);
        }

        group = {
          type: 'group',
          info: { title: getTagDisplayName(tag ?? { name }), description: tag?.description },
          tag,
          entries: [],
          schemaId: builder.id,
          path: path.join(parent?.path ?? '', slugify(name)),
        };
        groups.set(name, group);
        (parent?.entries ?? root).push(group);
        return group;
      }

      if (options.per === 'tag') {
        // declared tags come first
        const pages = new Map<string, Pick<PageOutput, 'operations' | 'webhooks'>>();
        const parents = new Set<string>();
        for (const [name, tag] of tags) {
          pages.set(name, { operations: [], webhooks: [] });
          if (tag.parent) parents.add(tag.parent);
        }
        function tagItems(name: string) {
          let out = pages.get(name);
          if (!out) pages.set(name, (out = { operations: [], webhooks: [] }));
          return out;
        }

        for (const item of items.operations) {
          for (const name of navTags(item.tags)) tagItems(name).operations.push(item);
        }
        for (const item of items.webhooks) {
          for (const name of navTags(item.tags)) tagItems(name).webhooks.push(item);
        }

        for (const [name, { operations, webhooks }] of pages) {
          if (operations.length === 0 && webhooks.length === 0) continue;
          const tag: TagObject = tags.get(name) ?? { name };
          const page: PageOutput = {
            type: 'page',
            path: '',
            schemaId: builder.id,
            info: { title: getTagDisplayName(tag), description: tag.description },
            operations,
            webhooks,
            tag,
          };
          // a folder shadows the page next to it in `meta.json`, put the page inside
          const folder = parents.has(name) ? name : tag.parent;
          const group = folder ? tagFolder(folder) : undefined;
          page.path = path.join(group?.path ?? '', `${nameFn.call(builder, page)}.mdx`);
          (group?.entries ?? root).push(page);
        }
      } else {
        const { groupBy = 'none' } = options;

        function folder(dir: string, title: string): OutputGroup {
          let group = groups.get(dir);
          if (!group) {
            group = {
              type: 'group',
              info: { title },
              entries: [],
              schemaId: builder.id,
              path: dir,
            };
            groups.set(dir, group);
            root.push(group);
          }
          return group;
        }

        function add(
          entry: DistributiveOmit<OperationOutput | WebhookOutput, 'path'>,
          tagNames?: string[],
        ) {
          if (groupBy === 'route') {
            const dir = builder.routePathToFilePath(
              entry.type === 'operation' ? entry.item.path : entry.item.name,
            );
            const file = `${entry.item.method.toLowerCase()}.mdx`;
            folder(dir, dir).entries.push({ ...entry, path: path.join(dir, file) });
            return;
          }

          const file = `${nameFn.call(builder, entry)}.mdx`;
          if (groupBy === 'tag') {
            for (const name of navTags(tagNames)) {
              const group = tagFolder(name);
              group.entries.push({ ...entry, path: path.join(group.path, file) });
            }
          } else if (typeof groupBy === 'function') {
            const title = groupBy(entry);
            const dir = slugify(title);
            folder(dir, title).entries.push({ ...entry, path: path.join(dir, file) });
          } else {
            root.push({ ...entry, path: file });
          }
        }

        for (const item of items.operations) {
          const { pathItem, operation, displayName } = builder.fromExtractedOperation(item)!;
          add(
            {
              type: 'operation',
              schemaId: builder.id,
              item,
              info: {
                title: displayName,
                description: operation.description ?? pathItem.description,
                deprecated: operation.deprecated,
              },
            },
            item.tags,
          );
        }

        for (const item of items.webhooks) {
          const { pathItem, operation, displayName } = builder.fromExtractedWebhook(item)!;
          add(
            {
              type: 'webhook',
              schemaId: builder.id,
              item,
              info: {
                title: displayName,
                description: operation.description ?? pathItem.description,
                deprecated: operation.deprecated,
              },
            },
            item.tags,
          );
        }
      }

      for (const entry of root) builder.create(entry);
    },
  };
}
