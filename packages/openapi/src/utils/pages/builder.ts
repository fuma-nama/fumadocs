import type { Document, HttpMethods, OperationObject, PathItemObject, TagObject } from '@/types';
import { getTagDisplayName, methodKeys } from '@/utils/schema';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
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

export interface WebhookOutput extends BaseEntry {
  type: 'webhook';
  item: WebhookItem;
}

export interface PageOutput extends BaseEntry {
  type: 'page';
  operations: OperationItem[];
  webhooks: WebhookItem[];
  /** tag info if the page is generated from a tag. */
  tag?: TagObject;
}

export interface OutputGroup extends BaseEntry {
  type: 'group';
  entries: OutputEntry[];
  /** tag info if the group is generated from a tag. */
  tag?: TagObject;
}

export interface WebhookItem {
  /**
   * webhook name in `webhooks`
   */
  name: string;
  method: HttpMethods;
}

export interface OperationItem {
  /**
   * the path of operation in `paths`
   */
  path: string;
  /**
   * the HTTP method of operation
   */
  method: HttpMethods;
}

export type OutputEntry = PageOutput | OperationOutput | WebhookOutput | OutputGroup;

export interface PagesBuilderConfig {
  toPages: (builder: PagesBuilder) => void;
}

export interface PagesBuilder {
  /**
   * the input ID in OpenAPI server
   */
  id: string;
  /** bundled OpenAPI document (not dereferenced) */
  document: Document;
  dereferenceShallow: <T>(schema: T) => NoReferenceSwallow<T>;
  /**
   * add output entry.
   */
  create: (entry: OutputEntry) => void;

  /**
   * get file path from operation path, useful for generating output paths.
   */
  routePathToFilePath: (path: string) => string;

  /**
   * Extract useful info for rendering
   */
  extract: () => ExtractedInfo;
  fromExtractedWebhook: (item: WebhookItem) =>
    | {
        get displayName(): string;
        pathItem: PathItemObject;
        operation: OperationObject;
      }
    | undefined;
  fromExtractedOperation: (item: OperationItem) =>
    | {
        get displayName(): string;
        pathItem: PathItemObject;
        operation: OperationObject;
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
  webhooks: (WebhookItem & { tags?: string[] })[];
  operations: (OperationItem & {
    tags?: string[];
  })[];
}

export function fromSchema(
  schemaId: string,
  bundled: Document,
  config: PagesBuilderConfig,
): OutputEntry[] {
  const files: OutputEntry[] = [];
  const { toPages } = config;
  // wrap in a magic proxy so that `dereferenceShallow` can resolve refs lazily
  const document = createMagicProxy(bundled as Record<string, unknown>) as Document;

  toPages({
    id: schemaId,
    document,
    dereferenceShallow: (s) => dereferenceShallow(s),
    create(entry) {
      files.push(entry);
    },
    extract() {
      const result: ExtractedInfo = { webhooks: [], operations: [] };

      for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
        if (!pathItem) continue;

        for (const methodKey of methodKeys) {
          if (!pathItem[methodKey]) continue;

          result.operations.push({
            method: methodKey,
            path,
            tags: pathItem[methodKey]?.tags,
          });
        }
      }

      for (const [name, _pathItem] of Object.entries(document.webhooks ?? {})) {
        const pathItem = dereferenceShallow(_pathItem);
        if (!pathItem) continue;

        for (const methodKey of methodKeys) {
          if (!pathItem[methodKey]) continue;

          result.webhooks.push({
            method: methodKey,
            name,
            tags: pathItem[methodKey]?.tags,
          });
        }
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
    fromExtractedWebhook(item) {
      const pathItem = dereferenceShallow(document.webhooks?.[item.name]);
      if (!pathItem) return;
      const operation = pathItem?.[item.method];
      if (!operation) return;
      return {
        pathItem,
        operation,
        get displayName() {
          return operation.summary || pathItem.summary || idToTitle(item.name);
        },
      };
    },
    fromExtractedOperation(item) {
      const pathItem = dereferenceShallow(document.paths?.[item.path]);
      if (!pathItem) return;
      const operation = pathItem?.[item.method];
      if (!operation) return;
      return {
        pathItem,
        operation,
        get displayName() {
          return (
            operation.summary ||
            pathItem.summary ||
            (operation.operationId ? idToTitle(operation.operationId) : item.path)
          );
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
      const tag = document.tags?.find((item) => item.name === name);
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
  /** schema ID */
  document: string;
  showTitle?: boolean;
  showDescription?: boolean;

  /**
   * An array of operations
   */
  operations?: OperationItem[];

  webhooks?: WebhookItem[];
}

export function getPageProps(
  entry: PageOutput | OperationOutput | WebhookOutput,
): GeneratedPageProps {
  if (entry.type === 'operation')
    return {
      document: entry.schemaId,
      operations: [entry.item],
      showDescription: true,
    };
  if (entry.type === 'webhook')
    return {
      document: entry.schemaId,
      webhooks: [entry.item],
      showDescription: true,
    };

  return {
    showTitle: true,
    showDescription: true,
    document: entry.schemaId,
    operations: entry.operations,
    webhooks: entry.webhooks,
  };
}
