import { getAPIPageItems } from '@/build-routes';
import {
  type DocumentContext,
  generateDocument,
} from '@/utils/generate-document';
import { idToTitle } from '@/utils/id-to-title';
import type { OperationItem, WebhookItem } from '@/render/api-page';
import type { ProcessedDocument } from '@/utils/process-document';

export interface GenerateOptions {
  /**
   * Additional imports of your MDX components.
   */
  imports?: {
    names: string[];
    from: string;
  }[];

  /**
   * Customise frontmatter.
   *
   * A `full: true` property will be added by default.
   */
  frontmatter?: (
    title: string,
    description: string | undefined,
    context: DocumentContext,
  ) => Record<string, unknown>;

  /**
   * Add description to document body.
   *
   * We recommend but don't enable it by default because some OpenAPI schemas have invalid description that breaks MDX syntax.
   *
   * @defaultValue false
   */
  includeDescription?: boolean;

  /**
   * Add a comment to the top of generated files indicating they are auto-generated.
   * - `true`: Adds a standardized comment
   * - `false`: No comment is added
   * - `string`: Adds the provided custom comment
   *
   * @defaultValue true
   */
  addGeneratedComment?: boolean | string;

  cwd?: string;
}

export interface GenerateTagOutput {
  tag: string;
  content: string;
}

export type GeneratePageOutput =
  | {
      type: 'operation';
      item: OperationItem;
      content: string;
    }
  | {
      type: 'webhook';
      item: WebhookItem;
      content: string;
    };

export async function generateAll(
  { document, downloaded }: ProcessedDocument,
  options: GenerateOptions = {},
): Promise<string> {
  const items = getAPIPageItems(document);

  return generateDocument({
    ...options,
    dereferenced: document,
    title: document.info.title,
    description: document.info.description,
    page: {
      operations: items.operations,
      webhooks: items.webhooks,
      hasHead: true,
      document: downloaded,
    },

    context: {
      type: 'file',
    },
  });
}

export async function generatePages(
  { document, downloaded }: ProcessedDocument,
  options: GenerateOptions = {},
): Promise<GeneratePageOutput[]> {
  const items = getAPIPageItems(document);
  const result: GeneratePageOutput[] = [];

  for (const item of items.operations) {
    const pathItem = document.paths?.[item.path];
    if (!pathItem) continue;
    const operation = pathItem[item.method];
    if (!operation) continue;

    result.push({
      type: 'operation',
      item,
      content: generateDocument({
        ...options,
        page: {
          operations: [item],
          hasHead: false,
          document: downloaded,
        },
        dereferenced: document,
        title:
          operation.summary ??
          pathItem.summary ??
          idToTitle(operation.operationId ?? 'unknown'),
        description: operation.description ?? pathItem.description,
        context: {
          type: 'operation',
        },
      }),
    });
  }

  for (const item of items.webhooks) {
    const pathItem = document.webhooks?.[item.name];
    if (!pathItem) continue;
    const operation = pathItem[item.method];
    if (!operation) continue;

    result.push({
      type: 'webhook',
      item,
      content: generateDocument({
        ...options,
        page: {
          webhooks: [item],
          hasHead: false,
          document: downloaded,
        },
        dereferenced: document,
        title: operation.summary ?? pathItem.summary ?? idToTitle(item.name),
        description: operation.description ?? pathItem.description,
        context: {
          type: 'operation',
        },
      }),
    });
  }

  return result;
}

export async function generateTags(
  { document, downloaded }: ProcessedDocument,
  options: GenerateOptions = {},
): Promise<GenerateTagOutput[]> {
  if (!document.tags) return [];
  const items = getAPIPageItems(document);

  return document.tags.map((tag) => {
    const webhooks = items.webhooks.filter(
      (v) => v.tags && v.tags.includes(tag.name),
    );
    const operations = items.operations.filter(
      (v) => v.tags && v.tags.includes(tag.name),
    );

    const displayName =
      tag && 'x-displayName' in tag && typeof tag['x-displayName'] === 'string'
        ? tag['x-displayName']
        : idToTitle(tag.name);

    return {
      tag: tag.name,
      content: generateDocument({
        ...options,
        page: {
          document: downloaded,
          operations,
          webhooks,
          hasHead: true,
        },
        dereferenced: document,
        title: displayName,
        description: tag?.description,
        context: {
          type: 'tag',
          tag,
        },
      }),
    } satisfies GenerateTagOutput;
  });
}
