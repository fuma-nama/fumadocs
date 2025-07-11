import { DocumentInput, processDocument } from '@/utils/process-document';
import {
  APIPageInner,
  ApiPageProps,
  ApiPagePropsInner,
  OperationItem,
  WebhookItem,
} from './api-page-inner';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { cache } from 'react';
import { MethodInformation } from '@/types';
import { NoReference } from '@/utils/schema';

export type { ApiPageProps, ApiPagePropsInner, OperationItem, WebhookItem };

export async function APIPage(
  props: ApiPageProps & { document: DocumentInput },
) {
  const { disableCache = process.env.NODE_ENV === 'development' } = props;
  const processed = await processDocument(props.document, disableCache);
  const generateTypeScriptSchema = cache(
    async (
      operation: NoReference<MethodInformation>,
      statusCode: string,
      contentType: string,
    ) => {
      const schema =
        operation?.responses?.[statusCode]?.content?.[contentType]?.schema;
      if (!schema) {
        return;
      }
      return getTypescriptSchema(schema, processed.dereferenceMap);
    },
  );
  return (
    <APIPageInner
      generateTypeScriptSchema={generateTypeScriptSchema}
      {...props}
      processed={processed}
    />
  );
}
