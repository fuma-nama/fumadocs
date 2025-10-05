import type { OutputEntry } from '@/utils/schema-to-pages';
import type { FC } from 'react';
import type { ApiPageProps } from '@/render/api-page';
import type { OpenAPIServer } from '@/server';

export function toBody(
  server: OpenAPIServer,
  APIPage: FC<ApiPageProps>,
  entry: OutputEntry,
): FC<unknown> {
  return function body() {
    if (entry.type === 'operation')
      return (
        <APIPage
          {...server.getAPIPageProps({
            hasHead: false,
            document: entry.schemaId,
            operations: [entry.item],
          })}
        />
      );
    if (entry.type === 'webhook')
      return (
        <APIPage
          {...server.getAPIPageProps({
            hasHead: false,
            document: entry.schemaId,
            webhooks: [entry.item],
          })}
        />
      );

    return (
      <APIPage
        {...server.getAPIPageProps({
          hasHead: true,
          document: entry.schemaId,
          operations: entry.operations,
          webhooks: entry.webhooks,
        })}
      />
    );
  };
}
