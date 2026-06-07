import { Operation } from '@/ui/operation';
import type { AsyncAPIObject, ServerObject } from '@/types';
import type { GeneratedPageProps } from '@/utils/pages/builder';
import { ServerProvider, useRenderContext } from './contexts/api';
import { resolveOperation } from '@/utils/operation';

export function PageContent({
  showTitle: hasHead = false,
  showDescription,
  operations,
}: Omit<GeneratedPageProps, 'document'>) {
  const ctx = useRenderContext();
  const { dereferenced } = ctx.schema;
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm @container">
      {slots.operations?.map((op) => op.children)}
    </div>
  );

  let content = renderPageLayout(
    {
      operations: operations?.map((item) => {
        const resolved = resolveOperation(item.id, dereferenced as AsyncAPIObject);
        if (!resolved)
          throw new Error(`[Fumadocs AsyncAPI] Operation not found in schema: ${item.id}`);

        return {
          item,
          children: (
            <Operation
              key={`${item.id}:${item.action}`}
              id={item.id}
              action={item.action}
              operation={resolved.operation}
              channel={resolved.channel}
              messages={resolved.messages}
              reply={resolved.reply}
              showTitle={hasHead}
              showDescription={showDescription}
            />
          ),
        };
      }),
    },
    ctx,
  );

  const servers = Object.values(dereferenced.servers ?? {}) as ServerObject[];
  if (servers.length > 0) {
    content = <ServerProvider servers={servers}>{content}</ServerProvider>;
  }

  return content;
}
