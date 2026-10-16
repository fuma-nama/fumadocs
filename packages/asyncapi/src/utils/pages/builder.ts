import * as path from 'node:path';
import { PathUtils } from 'fumadocs-core/source';
import type { AsyncAPIObject, TagObject } from '@/types';
import { dereference } from '@fumadocs/json-schema';
import type { DereferencedShallow } from '@fumadocs/json-schema';
import { dereferenceBundledDocument } from '../document/dereference';

interface BaseEntry {
  path: string;
  schemaId: string;
  info: {
    title: string;
    description?: string;
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
  dereferenceShallow: <T>(schema: T) => DereferencedShallow<T>;
  create: (entry: OutputEntry) => void;
  routePathToFilePath: (path: string) => string;
}

export function fromSchema(
  schemaId: string,
  bundled: AsyncAPIObject,
  { toPages }: PagesBuilderConfig,
): OutputEntry[] {
  const files: OutputEntry[] = [];

  toPages({
    id: schemaId,
    // the magic proxy of document, shared with its pages, `dereferenceShallow` resolves its refs lazily
    document: dereferenceBundledDocument(bundled).dereferenced,
    dereferenceShallow: dereference,
    create(entry) {
      files.push(entry);
    },
    routePathToFilePath(route) {
      const out: string[] = [];
      for (const segment of route.toLowerCase().replaceAll('.', '-').split('/')) {
        if (segment.startsWith('{') && segment.endsWith('}')) out.push(segment.slice(1, -1));
        else if (segment.length > 0) out.push(segment);
      }

      return out.join('/');
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

/** the `pages` of `meta.json` in the folder of `parent`, for its entries */
export function getMetaPages(
  entries: OutputEntry[],
  parent: OutputGroup | undefined,
  folderStyle: 'folder' | 'separator',
): string[] {
  const pages: string[] = [];

  for (const entry of entries) {
    const relativePath = PathUtils.slash(
      parent ? path.relative(parent.path, entry.path) : entry.path,
    );

    if (entry.type !== 'group') pages.push(relativePath.slice(0, -path.extname(entry.path).length));
    else if (folderStyle === 'folder') pages.push(relativePath);
    else pages.push(`---${entry.info.title}---`, `...${relativePath}`);
  }

  return pages;
}
