import { MethodInformation } from '@/types';
import { processDocument } from '@/utils/process-document';
import { NoReference } from '@/utils/schema';
import { cache } from 'react';
import {
  APIPageView,
  ApiPageProps,
  ApiPageViewProps,
  OperationItem,
  WebhookItem,
} from './api-page-view';

export type {
  APIPageView,
  ApiPageProps,
  ApiPageViewProps,
  OperationItem,
  WebhookItem,
};

export async function APIPage(props: ApiPageProps) {
  const { disableCache = process.env.NODE_ENV === 'development' } = props;
  const processed = await processDocument(props.document, disableCache);
  const generateTypeScriptSchema = cache(
    async (
      operation: NoReference<MethodInformation>,
      statusCode: string,
      contentType: string,
    ) => {
      // this import can only be run in the server because it relies on Node.js APIs, use dynamic imports so this module can be imported on the client
      const { getTypescriptSchema } = await import(
        '@/utils/get-typescript-schema'
      );
      const schema =
        operation?.responses?.[statusCode]?.content?.[contentType]?.schema;
      if (!schema) {
        return;
      }
      return getTypescriptSchema(schema, processed.dereferenceMap);
    },
  );
  return (
    <APIPageView
      generateTypeScriptSchema={generateTypeScriptSchema}
      {...props}
      processed={processed}
    />
  );
}
