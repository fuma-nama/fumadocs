import { type FC } from 'react';
import { APIPage, type ApiPageProps } from '@/server/api-page';
import type { DocumentInput } from '@/utils/process-document';

export interface OpenAPIOptions
  extends Omit<Partial<ApiPageProps>, 'document'> {
  /**
   * @deprecated Pass document to `APIPage` instead
   */
  documentOrPath?: DocumentInput;
}

export interface OpenAPIServer {
  APIPage: FC<ApiPageProps>;
}

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
  return {
    APIPage(props) {
      return <APIPage {...options} {...props} />;
    },
  };
}
