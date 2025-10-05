import type { OutputEntry } from '@/utils/schema-to-pages';
import { FC, lazy } from 'react';
import type { ApiPageProps } from '@/render/api-page';
import type { OpenAPIServer } from '@/server';

const APIPageDefault = lazy(() =>
  import('@/ui').then((mod) => ({
    default: mod.APIPage,
  })),
);

export function toBody(server: OpenAPIServer, entry: OutputEntry): FC<unknown> {
  const APIPage = (props: ApiPageProps) => (
    <APIPageDefault {...server.getAPIPageProps(props)} />
  );

  return function body() {
    if (entry.type === 'operation')
      return (
        <APIPage
          hasHead={false}
          document={entry.schemaId}
          operations={[entry.item]}
        />
      );
    if (entry.type === 'webhook')
      return (
        <APIPage
          hasHead={false}
          document={entry.schemaId}
          webhooks={[entry.item]}
        />
      );

    return (
      <APIPage
        hasHead
        document={entry.schemaId}
        operations={entry.operations}
        webhooks={entry.webhooks}
      />
    );
  };
}
