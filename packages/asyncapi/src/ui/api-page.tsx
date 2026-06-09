import { Operation } from '@/ui/operation';
import type { GeneratedPageProps } from '@/utils/pages/builder';
import { ServerProvider, useRenderContext } from './contexts/api';

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
      operations: operations?.map((item) => ({
        item,
        children: (
          <Operation
            key={`${item.id}:${item.action}`}
            id={item.id}
            action={item.action}
            showTitle={hasHead}
            showDescription={showDescription}
          />
        ),
      })),
    },
    ctx,
  );

  return <ServerProvider servers={dereferenced.servers ?? {}}>{content}</ServerProvider>;
}
