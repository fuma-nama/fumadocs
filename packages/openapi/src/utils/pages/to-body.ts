import type { ApiPageProps } from '@/ui/api-page';
import type { OutputEntry } from '@/utils/pages/builder';

export function toBody(entry: OutputEntry): ApiPageProps {
  if (entry.type === 'operation')
    return {
      document: entry.schemaId,
      operations: [entry.item],
    };
  if (entry.type === 'webhook')
    return {
      document: entry.schemaId,
      webhooks: [entry.item],
    };

  return {
    showTitle: true,
    showDescription: true,
    document: entry.schemaId,
    operations: entry.operations,
    webhooks: entry.webhooks,
  };
}
