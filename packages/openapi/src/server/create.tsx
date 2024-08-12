import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { type FC } from 'react';
import { APIPage, type ApiPageProps } from '@/server/api-page';

export interface OpenAPIOptions
  extends Omit<Partial<ApiPageProps>, 'document'> {
  /**
   * @deprecated Pass document to `APIPage` instead
   */
  documentOrPath?: string | OpenAPI.Document;
}

export interface OpenAPIServer {
  APIPage: FC<ApiPageProps>;
}

export function createOpenAPI(options: OpenAPIOptions): OpenAPIServer {
  return {
    APIPage(props) {
      return <APIPage {...props} />;
    },
  };
}
