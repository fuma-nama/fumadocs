'use client';
import type { ComponentProps } from 'react';
import { useAnchorId } from 'shared-api/auto-anchor/client';
import { type GraphQLComponents, useComponents } from '@/headless';

type SlotProps = ComponentProps<GraphQLComponents['SchemaUI']>;

type Props = Omit<SlotProps, 'client'> & {
  client: Omit<SlotProps['client'], 'rootId'>;
};

/**
 * The Schema UI of the page, with the anchor ID of the root schema resolved.
 */
export function SchemaUI({ client, ...props }: Props) {
  const { SchemaUI: Comp } = useComponents();

  return <Comp {...props} client={{ ...client, rootId: useAnchorId([client.name]) }} />;
}
