import type { GeneratedPageProps } from '@/utils/pages';
import { Operation } from '@/ui/operation';
import { TypeDocs } from '@/ui/type-docs';
import { useRenderContext } from './contexts/api';

export function PageContent({ showTitle = false, showDescription, items }: GeneratedPageProps) {
  const ctx = useRenderContext();
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm @container">
      {slots.items?.map((item) => item.children)}
    </div>
  );

  return renderPageLayout(
    {
      items: items?.map((item) => ({
        item,
        children:
          item.type === 'operation' ? (
            <Operation
              key={`${item.kind}:${item.name}`}
              kind={item.kind}
              name={item.name}
              showTitle={showTitle}
              showDescription={showDescription}
            />
          ) : (
            <TypeDocs
              key={`type:${item.name}`}
              name={item.name}
              showTitle={showTitle}
              showDescription={showDescription}
            />
          ),
      })),
    },
    ctx,
  );
}
