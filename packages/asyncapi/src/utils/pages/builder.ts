import type { AsyncAPIObject, TagObject } from '@/types';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import type { NoReferenceSwallow } from '@fumadocs/api-docs/schema';

interface BaseEntry {
  path: string;
  schemaId: string;
  info: {
    title: string;
    description?: string;
    deprecated?: boolean;
  };
}

export interface OperationOutput extends BaseEntry {
  type: 'operation';
  item: OperationItem;
}

export interface PageOutput extends BaseEntry {
  type: 'page';
  operations: OperationItem[];
  tag?: TagObject;
}

export interface OutputGroup extends BaseEntry {
  type: 'group';
  entries: OutputEntry[];
  tag?: TagObject;
}

export interface OperationItem {
  /**
   * the operation id in `operations`
   */
  id: string;
  /**
   * the action of operation
   */
  action: 'send' | 'receive';
}

export type OutputEntry = PageOutput | OperationOutput | OutputGroup;

export interface PagesBuilderConfig {
  toPages: (builder: PagesBuilder) => void;
}

export interface PagesBuilder {
  id: string;
  document: AsyncAPIObject;
  dereferenceShallow: <T>(schema: T) => NoReferenceSwallow<T>;
  create: (entry: OutputEntry) => void;
  routePathToFilePath: (path: string) => string;
}

export function fromSchema(
  schemaId: string,
  bundled: AsyncAPIObject,
  config: PagesBuilderConfig,
): OutputEntry[] {
  const files: OutputEntry[] = [];
  const { toPages } = config;

  toPages({
    id: schemaId,
    document: bundled,
    dereferenceShallow: (s) => dereferenceShallow(s, bundled),
    create(entry) {
      files.push(entry);
    },
    routePathToFilePath(path) {
      return path
        .toLowerCase()
        .replaceAll('.', '-')
        .split('/')
        .flatMap((v) => {
          if (v.startsWith('{') && v.endsWith('}')) return v.slice(1, -1);
          if (v.length === 0) return [];
          return v;
        })
        .join('/');
    },
  });

  return files;
}

export interface GeneratedPageProps {
  document: string;
  showTitle?: boolean;
  showDescription?: boolean;
  operations?: OperationItem[];
}

export function getPageProps(entry: PageOutput | OperationOutput): GeneratedPageProps {
  if (entry.type === 'operation')
    return {
      document: entry.schemaId,
      operations: [entry.item],
      showDescription: true,
    };

  return {
    showTitle: true,
    showDescription: true,
    document: entry.schemaId,
    operations: entry.operations,
  };
}
