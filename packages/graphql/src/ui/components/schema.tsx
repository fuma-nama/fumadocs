'use client';
import type { ComponentProps } from 'react';
import { useAnchorId } from 'shared-api/auto-anchor/client';
import { type GraphQLComponents, useComponents, useRenderContext } from '@/utils/create-page';

type SlotProps = ComponentProps<GraphQLComponents['SchemaUI']>;

type Props = Omit<SlotProps, 'client'> & {
  client: Omit<SlotProps['client'], 'rootId'>;
};

/**
 * The Schema UI of the page, with the anchor ID of the root schema resolved.
 */
export function SchemaUI({ client, ...props }: Props) {
  const { SchemaUI: Comp } = useComponents();
  const ctx = useRenderContext();
  const options: SlotProps = {
    ...props,
    client: { ...client, rootId: useAnchorId([client.name]) },
  };

  if (ctx.schemaUI?.render) return ctx.schemaUI.render(options, ctx);
  return <Comp {...options} />;
}
