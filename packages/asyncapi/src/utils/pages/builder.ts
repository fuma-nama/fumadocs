import type { AsyncAPIObject, ChannelObject, OperationObject, TagObject } from '@/types';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { getTagDisplayName } from '@/utils/schema';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import {
  collectDocumentTags,
  getOperationDisplayName,
  getOperationTags,
  resolveOperation,
} from '@/utils/operation';
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
  extract: () => ExtractedInfo;
  fromExtractedOperation: (item: OperationItem) =>
    | {
        get displayName(): string;
        channel: NoReference<ChannelObject>;
        operation: NoReference<OperationObject>;
      }
    | undefined;
  fromTag: (tag: TagObject) => {
    get displayName(): string;
  };
  fromTagName: (tag: string) =>
    | {
        info: TagObject;
        get displayName(): string;
      }
    | undefined;
}

interface ExtractedInfo {
  operations: (OperationItem & {
    tags?: string[];
    channelAddress?: string;
  })[];
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
    extract() {
      const result: ExtractedInfo = { operations: [] };

      for (const [id, operationRef] of Object.entries(bundled.operations ?? {})) {
        const operation = dereferenceShallow(operationRef, bundled);
        if (!operation) continue;

        const channel = dereferenceShallow(operation.channel, bundled);
        result.operations.push({
          id,
          action: operation.action,
          tags: getOperationTags(operation, bundled),
          channelAddress: channel?.address ?? undefined,
        });
      }

      return result;
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
    fromExtractedOperation(item) {
      const resolved = resolveOperation(item.id, bundled);
      if (!resolved) return;

      return {
        channel: resolved.channel,
        operation: resolved.operation,
        get displayName() {
          return getOperationDisplayName(item.id, resolved.operation, resolved.channel);
        },
      };
    },
    fromTag(tag) {
      return {
        get displayName() {
          return getTagDisplayName(tag);
        },
      };
    },
    fromTagName(name) {
      const tag = collectDocumentTags(bundled).find((item) => item.name === name);
      if (!tag) return;

      return {
        info: tag,
        ...this.fromTag(tag),
      };
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
