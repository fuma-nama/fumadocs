'use client';
import { useAnchorId } from 'shared-api/auto-anchor';
import { type SchemaViewProps, useRenderContext } from '@/utils/create-page';

type Props = Omit<SchemaViewProps, 'client'> & {
  client: Omit<SchemaViewProps['client'], 'rootId'>;
};

/**
 * The Schema UI of the page, with the anchor ID of the root schema resolved.
 */
export function SchemaUI({ client, ...props }: Props) {
  const ctx = useRenderContext();
  const options: SchemaViewProps = {
    ...props,
    client: { ...client, rootId: useAnchorId([client.name]) },
  };

  if (ctx.schemaUI?.render) return ctx.schemaUI.render(options, ctx);
  return <ctx.SchemaUI {...options} />;
}
