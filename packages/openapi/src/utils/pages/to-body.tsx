import type { OutputEntry } from '@/utils/schema-to-pages';
import type { ApiPageProps } from '@/render/api-page';
import type { OpenAPIServer } from '@/server';

export function toBody(
  server: OpenAPIServer,
  entry: OutputEntry,
): ApiPageProps {
  if (entry.type === 'operation')
    return server.getAPIPageProps({
      hasHead: false,
      document: entry.schemaId,
      operations: [entry.item],
    });
  if (entry.type === 'webhook')
    return server.getAPIPageProps({
      hasHead: false,
      document: entry.schemaId,
      webhooks: [entry.item],
    });

  return server.getAPIPageProps({
    hasHead: true,
    document: entry.schemaId,
    operations: entry.operations,
    webhooks: entry.webhooks,
  });
}
