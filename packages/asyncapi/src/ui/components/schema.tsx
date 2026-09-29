'use client';
import { type ComponentProps, useMemo } from 'react';
import { useAnchorId } from 'shared-api/auto-anchor/client';
import { type AsyncAPIComponents, useComponents, useRenderContext } from '@/utils/create-page';

type SlotProps = ComponentProps<AsyncAPIComponents['SchemaUI']>;

type Props = Omit<SlotProps, 'client' | 'renderMarkdown' | 'renderCodeblock'> & {
  client: Omit<SlotProps['client'], 'rootId'>;
};

/**
 * The Schema UI of the page, with the anchor ID of the root schema resolved.
 */
export function SchemaUI({ client, ...props }: Props) {
  const { SchemaUI: Comp, Markdown, CodeBlock } = useComponents();
  const ctx = useRenderContext();
  // stable renderers, the Schema UI is regenerated when they change
  const renderers = useMemo<Pick<SlotProps, 'renderMarkdown' | 'renderCodeblock'>>(
    () => ({
      renderMarkdown: (md) => <Markdown md={md} />,
      renderCodeblock: (props) => <CodeBlock {...props} />,
    }),
    [Markdown, CodeBlock],
  );
  const options: SlotProps = {
    ...renderers,
    showExample: ctx.schemaUI?.showExample,
    ...props,
    client: { ...client, rootId: useAnchorId([client.name]) },
  };

  if (ctx.schemaUI?.render) return ctx.schemaUI.render(options, ctx);
  return <Comp {...options} />;
}
