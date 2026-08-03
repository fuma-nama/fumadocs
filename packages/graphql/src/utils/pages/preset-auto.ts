import * as path from 'node:path';
import type { GraphQLField, GraphQLNamedType } from 'graphql';
import type {
  GraphQLPageItem,
  OperationOutput,
  OutputEntry,
  OutputGroup,
  PageOutput,
  PagesBuilder,
  PagesBuilderConfig,
  TypeOutput,
} from '@/utils/pages/builder';
import type { DistributiveOmit } from '@/types';
import {
  getDocumentedTypes,
  getNamedTypeKind,
  getOperationTitle,
  getRootType,
  type NamedTypeKind,
  type OperationKind,
  OperationKinds,
} from '@/utils/schema';

interface ItemConfig extends BaseConfig {
  per?: 'item';
  /**
   * how to group generated pages into folders:
   *
   * - `kind`: by their kind, e.g. `queries/`, `mutations/`, `objects/`.
   * - `none`: no folders.
   * - a function that returns the group name of entry.
   *
   * @default 'kind'
   */
  groupBy?:
    | 'kind'
    | 'none'
    | ((entry: DistributiveOmit<OperationOutput | TypeOutput, 'path'>) => string);
  /**
   * generate pages for operations (query/mutation/subscription fields).
   *
   * @default true
   */
  includeOperations?:
    | boolean
    | ((kind: OperationKind, field: GraphQLField<unknown, unknown>) => boolean);
  /**
   * generate pages for named types (objects, interfaces, unions, enums, inputs, scalars).
   *
   * @default true
   */
  includeTypes?: boolean | ((type: GraphQLNamedType) => boolean);
  name?: NameFn<OperationOutput | TypeOutput>;
}

interface SchemaConfig extends BaseConfig {
  per: 'file';
  name?: NameFn<PageOutput>;
}

export type SchemaToPagesOptions =
  | ItemConfig
  | SchemaConfig
  | ({
      per: 'custom';
    } & PagesBuilderConfig);

type NameFn<Entry extends OutputEntry = OutputEntry> = (
  this: PagesBuilder,
  output: DistributiveOmit<Entry, 'path'>,
) => string;

interface BaseConfig {
  /**
   * convert a name into a URL-friendly segment.
   *
   * GraphQL names are already URL-safe, hence it keeps the original name (including its case) by default.
   */
  slugify?: (name: string) => string;
}

const KindGroups: Record<OperationKind | NamedTypeKind, { path: string; title: string }> = {
  query: { path: 'queries', title: 'Queries' },
  mutation: { path: 'mutations', title: 'Mutations' },
  subscription: { path: 'subscriptions', title: 'Subscriptions' },
  object: { path: 'objects', title: 'Objects' },
  interface: { path: 'interfaces', title: 'Interfaces' },
  union: { path: 'unions', title: 'Unions' },
  enum: { path: 'enums', title: 'Enums' },
  input: { path: 'inputs', title: 'Input Objects' },
  scalar: { path: 'scalars', title: 'Scalars' },
};

export function createAutoPreset(options: SchemaToPagesOptions): PagesBuilderConfig {
  if (options.per === 'custom') return options;
  const { slugify = (name) => name } = options;

  return {
    toPages(builder) {
      const { schema } = builder;

      if (options.per === 'file') {
        const nameFn: NameFn<PageOutput> =
          options.name ??
          ((result) => {
            const schemaId = result.schemaId;

            return schemaId.startsWith('http://') || schemaId.startsWith('https://')
              ? 'index'
              : path.basename(schemaId, path.extname(schemaId));
          });

        const items: GraphQLPageItem[] = [];
        for (const kind of OperationKinds) {
          const root = getRootType(schema, kind);
          if (!root) continue;

          for (const field of Object.values(root.getFields())) {
            items.push({ type: 'operation', kind, name: field.name });
          }
        }
        for (const type of getDocumentedTypes(schema)) {
          items.push({ type: 'type', kind: getNamedTypeKind(type), name: type.name });
        }

        const entry: PageOutput = {
          type: 'page',
          schemaId: builder.id,
          path: '',
          info: {
            title:
              builder.id.startsWith('http://') || builder.id.startsWith('https://')
                ? 'Overview'
                : path.basename(builder.id, path.extname(builder.id)),
          },
          items,
        };
        entry.path = `${nameFn.call(builder, entry)}.mdx`;
        builder.create(entry);
        return;
      }

      const { groupBy = 'kind', includeOperations = true, includeTypes = true } = options;
      const nameFn: NameFn<OperationOutput | TypeOutput> =
        options.name ?? ((result) => slugify(result.item.name));

      const groups = new Map<string, OutputGroup>();
      const rest: OutputEntry[] = [];

      function place(
        entry: DistributiveOmit<OperationOutput | TypeOutput, 'path'>,
        kindGroup: { path: string; title: string },
      ) {
        const fileName = `${nameFn.call(builder, entry)}.mdx`;
        let groupInfo: { path: string; title: string } | undefined;

        if (groupBy === 'kind') {
          groupInfo = kindGroup;
        } else if (typeof groupBy === 'function') {
          const displayName = groupBy(entry);
          groupInfo = { path: slugify(displayName), title: displayName };
        }

        if (!groupInfo) {
          rest.push({ ...entry, path: fileName } as OutputEntry);
          return;
        }

        let group = groups.get(groupInfo.path);
        if (!group) {
          group = {
            type: 'group',
            schemaId: builder.id,
            path: groupInfo.path,
            info: { title: groupInfo.title },
            entries: [],
          };
          groups.set(groupInfo.path, group);
        }

        group.entries.push({
          ...entry,
          path: path.join(groupInfo.path, fileName),
        } as OutputEntry);
      }

      if (includeOperations !== false) {
        for (const kind of OperationKinds) {
          const root = getRootType(schema, kind);
          if (!root) continue;

          for (const field of Object.values(root.getFields())) {
            if (typeof includeOperations === 'function' && !includeOperations(kind, field))
              continue;

            place(
              {
                type: 'operation',
                schemaId: builder.id,
                item: { kind, name: field.name },
                info: {
                  title: getOperationTitle(field.name),
                  description: field.description ?? undefined,
                  deprecated: field.deprecationReason != null || undefined,
                },
              },
              KindGroups[kind],
            );
          }
        }
      }

      if (includeTypes !== false) {
        for (const type of getDocumentedTypes(schema)) {
          if (typeof includeTypes === 'function' && !includeTypes(type)) continue;
          const kind = getNamedTypeKind(type);

          place(
            {
              type: 'type',
              schemaId: builder.id,
              item: { kind, name: type.name },
              info: {
                title: type.name,
                description: type.description ?? undefined,
              },
            },
            KindGroups[kind],
          );
        }
      }

      for (const entry of rest) builder.create(entry);
      // emit groups in a canonical order for `kind` grouping
      if (groupBy === 'kind') {
        for (const { path: groupPath } of Object.values(KindGroups)) {
          const group = groups.get(groupPath);
          if (group) builder.create(group);
        }
      } else {
        for (const group of groups.values()) builder.create(group);
      }
    },
  };
}
