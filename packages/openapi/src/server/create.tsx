import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import Parser from '@apidevtools/json-schema-ref-parser';
import { type FC } from 'react';
import { APIPage, type ApiPageProps } from '@/server/api-page';

export interface OpenAPIOptions
  extends Omit<Partial<ApiPageProps>, 'document'> {
  documentOrPath: string | OpenAPI.Document;
}

export interface OpenAPIServer {
  APIPage: FC<Omit<ApiPageProps, 'document'>>;
}

export function createOpenAPI(options: OpenAPIOptions): OpenAPIServer {
  const document = Parser.dereference(options.documentOrPath);

  return {
    APIPage: async (props) => {
      return (
        <APIPage document={(await document) as OpenAPI.Document} {...props} />
      );
    },
  };
}
