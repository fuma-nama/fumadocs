import { Operation } from '@/ui/operation';
import type { ServerObject } from '@/types';
import { createMethod } from '@/utils/schema';
import type { GeneratedPageProps } from '@/utils/pages/builder';
import { useRenderContext } from './contexts/api';

export function PageContent({
  showTitle: hasHead = false,
  showDescription,
  operations,
  webhooks,
}: Omit<GeneratedPageProps, 'document'>) {
  const ctx = useRenderContext();
  const { dereferenced } = ctx.schema;
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm @container">
      {slots.operations?.map((op) => op.children)}
      {slots.webhooks?.map((op) => op.children)}
    </div>
  );

  let content = renderPageLayout(
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

  if (ctx.playground?.enabled !== false && ctx.playground?.provider) {
    content = ctx.playground.provider({ children: content });
  }

  return (
    <ctx.clientBoundary.ServerProvider servers={dereferenced.servers as ServerObject[]}>
      {content}
    </ctx.clientBoundary.ServerProvider>
  );
}
