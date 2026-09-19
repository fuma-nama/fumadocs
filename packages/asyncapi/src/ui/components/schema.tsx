'use client';
import type { ComponentProps } from 'react';
import { useAnchorId } from 'shared-api/auto-anchor/client';
import { type AsyncAPIComponents, useComponents } from '@/utils/create-page';

type SlotProps = ComponentProps<AsyncAPIComponents['SchemaUI']>;

type Props = Omit<SlotProps, 'client' | 'renderMarkdown' | 'renderCodeblock'> & {
  client: Omit<SlotProps['client'], 'rootId'>;
};

/**
 * The Schema UI of the page, with the anchor ID of the root schema resolved.
 */
export function SchemaUI({ client, ...props }: Props) {
  const { SchemaUI: Comp, Markdown, CodeBlock } = useComponents();

  return (
    <Comp
      renderMarkdown={(md) => <Markdown md={md} />}
      renderCodeblock={(props) => <CodeBlock {...props} />}
      {...props}
      client={{ ...client, rootId: useAnchorId([client.name]) }}
    />
  );
}
