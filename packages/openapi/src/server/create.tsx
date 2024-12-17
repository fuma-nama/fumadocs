import { type FC } from 'react';
import { APIPage, type ApiPageProps } from '@/server/api-page';
import type { DocumentInput } from '@/utils/process-document';
import { createProxy } from '@/server/proxy';

export interface OpenAPIOptions
  extends Omit<Partial<ApiPageProps>, 'document'> {
  /**
   * @deprecated Pass document to `APIPage` instead
   */
  documentOrPath?: DocumentInput;
}

export interface OpenAPIServer {
  APIPage: FC<ApiPageProps>;
  createProxy: typeof createProxy;
}

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
  return {
    createProxy,
    APIPage(props) {
      return <APIPage {...options} {...props} />;
    },
  };
}
