import type { ProcessedDocument } from '@/utils/process-document';
import type { OpenAPIServer } from '@/server';
import type { OperationItem, WebhookItem } from '@/ui/api-page';
import type {
  Document,
  OperationObject,
  PathItemObject,
  TagObject,
} from '@/types';
import {
  getTagDisplayName,
  methodKeys,
  type NoReference,
} from '@/utils/schema';
import type { OpenAPIV3_1 } from 'openapi-types';
import { idToTitle } from '@/utils/id-to-title';

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

export interface WebhookOutput extends BaseEntry {
  type: 'webhook';
  item: WebhookItem;
}

export interface TagOutput extends BaseEntry {
  type: 'tag';
  tag: string;
  rawTag: TagObject;
  operations: OperationItem[];
  webhooks: WebhookItem[];
}

export interface OutputGroup extends BaseEntry {
  type: 'group';
  operations: OperationItem[];
  webhooks: WebhookItem[];
}

export type OutputEntry =
  | TagOutput
  | OperationOutput
  | WebhookOutput
  | OutputGroup;

export interface PagesBuilderConfig {
  toPages: (builder: PagesBuilder) => void;
}

export interface PagesBuilder {
  /**
   * the input ID in OpenAPI server
   */
  id: string;
  document: ProcessedDocument;
  /**
   * add output entry.
   *
   * When the `path` property is unspecified, it will generate one.
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
        pathItem: NoReference<PathItemObject>;
        operation: NoReference<OperationObject>;
      }
    | undefined;
  fromExtractedOperation: (item: OperationItem) =>
    | {
        get displayName(): string;
        pathItem: NoReference<PathItemObject>;
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
  webhooks: (WebhookItem & { tags?: string[] })[];
  operations: (OperationItem & {
    tags?: string[];
  })[];
}

export async function fromServer(
  server: OpenAPIServer,
  config: PagesBuilderConfig,
): Promise<Record<string, OutputEntry[]>> {
  const schemas = await server.getSchemas();
  const generated: Record<string, OutputEntry[]> = {};

  const entries = Object.entries(schemas);
  if (entries.length === 0) {
    throw new Error('No input files found.');
  }

  for (const [id, schema] of entries) {
    generated[id] = fromSchema(id, schema, config);
  }

  return generated;
}

export function fromSchema(
  schemaId: string,
  processed: ProcessedDocument,
  config: PagesBuilderConfig,
): OutputEntry[] {
  const files: OutputEntry[] = [];
  const { toPages } = config;
  const { dereferenced } = processed;

  toPages({
    id: schemaId,
    document: processed,
    create(entry) {
      files.push(entry);
    },
    extract: () => extractInfo(dereferenced),
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
      const pathItem = dereferenced.webhooks?.[item.name];
      if (!pathItem) return;
      const operation = pathItem?.[item.method];
      if (!operation) return;
      return {
        pathItem,
        operation,
        get displayName() {
          return operation.summary ?? pathItem.summary ?? idToTitle(item.name);
        },
      };
    },
    fromExtractedOperation(item) {
      const pathItem = dereferenced.paths?.[item.path];
      if (!pathItem) return;
      const operation = pathItem?.[item.method];
      if (!operation) return;
      return {
        pathItem,
        operation,
        get displayName() {
          return (
            operation.summary ??
            pathItem.summary ??
            (operation.operationId
              ? idToTitle(operation.operationId)
              : item.path)
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
      const tag = dereferenced.tags?.find((item) => item.name === name);
      if (!tag) return;

      return {
        info: tag,
        ...this.fromTag(tag),
      };
    },
  });

  return files;
}

function extractInfo(document: NoReference<Document>): ExtractedInfo {
  const result: ExtractedInfo = { webhooks: [], operations: [] };

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem) continue;

    for (const methodKey of methodKeys) {
      if (!pathItem[methodKey]) continue;

      result.operations.push({
        method: methodKey as OpenAPIV3_1.HttpMethods,
        path,
        tags: pathItem[methodKey]?.tags,
      });
    }
  }

  for (const [name, pathItem] of Object.entries(document.webhooks ?? {})) {
    if (!pathItem) continue;

    for (const methodKey of methodKeys) {
      if (!pathItem[methodKey]) continue;

      result.webhooks.push({
        method: methodKey as OpenAPIV3_1.HttpMethods,
        name,
        tags: pathItem[methodKey]?.tags,
      });
    }
  }

  return result;
}
