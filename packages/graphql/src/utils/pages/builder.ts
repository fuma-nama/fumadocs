import type { GraphQLSchema } from 'graphql';
import type { NamedTypeKind, OperationKind } from '@/utils/schema';

interface BaseEntry {
  path: string;
  schemaId: string;
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

export interface PagesBuilderConfig {
  toPages: (builder: PagesBuilder) => void;
}

export interface PagesBuilder {
  id: string;
  schema: GraphQLSchema;
  create: (entry: OutputEntry) => void;
}

export function fromSchema(
  schemaId: string,
  schema: GraphQLSchema,
  config: PagesBuilderConfig,
): OutputEntry[] {
  const files: OutputEntry[] = [];

  config.toPages({
    id: schemaId,
    schema,
    create(entry) {
      files.push(entry);
    },
  });

  return files;
}

export interface GeneratedPageProps {
  document: string;
  showTitle?: boolean;
  showDescription?: boolean;
  items?: GraphQLPageItem[];
}

export function getPageProps(entry: OperationOutput | TypeOutput | PageOutput): GeneratedPageProps {
  if (entry.type === 'operation')
    return {
      document: entry.schemaId,
      items: [{ type: 'operation', ...entry.item }],
      showDescription: true,
    };

  if (entry.type === 'type')
    return {
      document: entry.schemaId,
      items: [{ type: 'type', ...entry.item }],
      showDescription: true,
    };

  return {
    document: entry.schemaId,
    items: entry.items,
    showTitle: true,
    showDescription: true,
  };
}
