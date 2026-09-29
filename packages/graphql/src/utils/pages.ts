import * as path from 'node:path';
import type { GraphQLField, GraphQLNamedType, GraphQLSchema } from 'graphql';
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

interface BaseEntry {
  path: string;
  info: {
    title: string;
    description?: string;
    deprecated?: boolean;
  };
}

export interface OperationItem {
  /**
   * the operation type
   */
  kind: OperationKind;
  /**
   * the field name on the root operation type
   */
  name: string;
}

export interface TypeItem {
  kind: NamedTypeKind;
  /**
   * name of the named type
   */
  name: string;
}

export type GraphQLPageItem =
  | ({ type: 'operation' } & OperationItem)
  | ({ type: 'type' } & TypeItem);

export interface OperationOutput extends BaseEntry {
  type: 'operation';
  item: OperationItem;
}

export interface TypeOutput extends BaseEntry {
  type: 'type';
  item: TypeItem;
}

export interface PageOutput extends BaseEntry {
  type: 'page';
  items: GraphQLPageItem[];
}

export interface OutputGroup extends BaseEntry {
  type: 'group';
  entries: OutputEntry[];
}

export type OutputEntry = OperationOutput | TypeOutput | PageOutput | OutputGroup;

export interface PagesBuilder {
  id: string;
  schema: GraphQLSchema;
  create: (entry: OutputEntry) => void;
}

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
  | {
      per: 'custom';
      toPages: (builder: PagesBuilder) => void;
    };

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

export function schemaToPages(
  id: string,
  schema: GraphQLSchema,
  options: SchemaToPagesOptions,
): OutputEntry[] {
  const entries: OutputEntry[] = [];
  const builder: PagesBuilder = {
    id,
    schema,
    create(entry) {
      entries.push(entry);
    },
  };

  if (options.per === 'custom') {
    options.toPages(builder);
    return entries;
  }

  const { slugify = (name) => name } = options;

  if (options.per === 'file') {
    // named after the schema file, or a generic fallback for remote inputs
    const isRemote = id.startsWith('http://') || id.startsWith('https://');
    const baseName = isRemote ? undefined : path.basename(id, path.extname(id));
    const nameFn: NameFn<PageOutput> = options.name ?? (() => baseName ?? 'index');

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
      path: '',
      info: {
        title: baseName ?? 'Overview',
      },
      items,
    };
    entry.path = `${nameFn.call(builder, entry)}.mdx`;
    builder.create(entry);
    return entries;
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
        if (typeof includeOperations === 'function' && !includeOperations(kind, field)) continue;

        place(
          {
            type: 'operation',
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

  return entries;
}

export interface GeneratedPageProps {
  showTitle?: boolean;
  showDescription?: boolean;
  items?: GraphQLPageItem[];
}

export function getPageProps(entry: OperationOutput | TypeOutput | PageOutput): GeneratedPageProps {
  if (entry.type === 'page') {
    return { items: entry.items, showTitle: true, showDescription: true };
  }

  const item: GraphQLPageItem =
    entry.type === 'operation'
      ? { type: 'operation', ...entry.item }
      : { type: 'type', ...entry.item };
  return { items: [item], showDescription: true };
}
