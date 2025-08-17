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

  /**
   * Inline the entire OpenAPI document into the MDX file.
   *
   * @deprecated Use the new `input` API on `createOpenAPI()` instead.
   * @defaultValue false
   */
  inlineDocument?: boolean;
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
  schemaId: string,
  processed: ProcessedDocument,
  options: GenerateOptions = {},
): Promise<string> {
  const { document } = processed;
  const items = getAPIPageItems(document);

  return generateDocument(
    schemaId,
    processed,
    {
      operations: items.operations,
      webhooks: items.webhooks,
      hasHead: true,
    },
    {
      ...options,
      title: document.info.title,
      description: document.info.description,
    },
    {
      type: 'file',
    },
  );
}

export async function generatePages(
  schemaId: string,
  processed: ProcessedDocument,
  options: GenerateOptions = {},
): Promise<GeneratePageOutput[]> {
  const { document } = processed;
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
      content: generateDocument(
        schemaId,
        processed,
        {
          operations: [item],
          hasHead: false,
        },
        {
          ...options,
          title:
            operation.summary ??
            pathItem.summary ??
            idToTitle(operation.operationId ?? 'unknown'),
          description: operation.description ?? pathItem.description,
        },
        {
          type: 'operation',
        },
      ),
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
      content: generateDocument(
        schemaId,
        processed,
        {
          webhooks: [item],
          hasHead: false,
        },
        {
          ...options,
          title: operation.summary ?? pathItem.summary ?? idToTitle(item.name),
          description: operation.description ?? pathItem.description,
        },
        {
          type: 'operation',
        },
      ),
    });
  }

  return result;
}

export async function generateTags(
  schemaId: string,
  processed: ProcessedDocument,
  options: GenerateOptions = {},
): Promise<GenerateTagOutput[]> {
  const { document } = processed;
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
      content: generateDocument(
        schemaId,
        processed,
        {
          operations,
          webhooks,
          hasHead: true,
        },
        {
          ...options,
          title: displayName,
          description: tag?.description,
        },
        {
          type: 'tag',
          tag,
        },
      ),
    } satisfies GenerateTagOutput;
  });
}
