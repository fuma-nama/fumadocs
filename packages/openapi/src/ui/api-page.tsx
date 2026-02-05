import { Operation } from '@/ui/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/utils/schema';
import type { OpenAPIV3_1 } from 'openapi-types';
import type { ProcessedDocument } from '@/utils/process-document';
import { ApiProviderLazy } from './contexts/api.lazy';

export interface ApiPageProps {
  document: Promise<ProcessedDocument> | string | ProcessedDocument;
  showTitle?: boolean;
  showDescription?: boolean;

  /**
   * An array of operations
   */
  operations?: OperationItem[];

  webhooks?: WebhookItem[];
}

export interface WebhookItem {
  /**
   * webhook name in `webhooks`
   */
  name: string;
  method: OpenAPIV3_1.HttpMethods;
}

export interface OperationItem {
  /**
   * the path of operation in `paths`
   */
  path: string;
  /**
   * the HTTP method of operation
   */
  method: OpenAPIV3_1.HttpMethods;
}

export async function APIPage({
  showTitle: hasHead = false,
  showDescription,
  operations,
  webhooks,
  ctx,
}: Omit<ApiPageProps, 'document'> & {
  ctx: RenderContext;
}) {
  const { dereferenced } = ctx.schema;
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm @container">
      {slots.operations?.map((op) => op.children)}
      {slots.webhooks?.map((op) => op.children)}
    </div>
  );

  const content = await renderPageLayout(
    {
      operations: operations?.map((item) => {
        const pathItem = dereferenced.paths?.[item.path];
        if (!pathItem)
          throw new Error(`[Fumadocs OpenAPI] Path not found in OpenAPI schema: ${item.path}`);

        const operation = pathItem[item.method];
        if (!operation)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in operation: ${item.path}`,
          );

        const method = createMethod(item.method, pathItem, operation);

        return {
          item,
          children: (
            <Operation
              key={`${item.path}:${item.method}`}
              method={method}
              path={item.path}
              ctx={ctx}
              showTitle={hasHead}
              showDescription={showDescription}
            />
          ),
        };
      }),
      webhooks: webhooks?.map((item) => {
        const webhook = dereferenced.webhooks?.[item.name];
        if (!webhook)
          throw new Error(`[Fumadocs OpenAPI] Webhook not found in OpenAPI schema: ${item.name}`);

        const hook = webhook[item.method];
        if (!hook)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in webhook: ${item.name}`,
          );

        return {
          item,
          children: (
            <Operation
              type="webhook"
              key={`${item.name}:${item.method}`}
              method={createMethod(item.method, webhook, hook)}
              ctx={ctx}
              path={`/${item.name}`}
              showTitle={hasHead}
              showDescription={showDescription}
            />
          ),
        };
      }),
    },
    ctx,
  );

  return (
    <ApiProviderLazy
      servers={ctx.servers}
      shikiOptions={ctx.shikiOptions}
      client={ctx.client ?? {}}
    >
      {content}
    </ApiProviderLazy>
  );
}
