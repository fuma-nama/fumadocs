import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import Parser from '@apidevtools/json-schema-ref-parser';
import type { FC } from 'react';
import Slugger from 'github-slugger';
import { APIPage, type ApiPageProps } from '@/server/api-page';
import type { RenderContext } from '@/types';
import { defaultRenderer, type Renderer } from '@/render/renderer';

export interface OpenAPIOptions
  extends Pick<
    RenderContext,
    'generateCodeSamples' | 'generateTypeScriptSchema'
  > {
  documentOrPath: string | OpenAPI.Document;

  renderer?: Partial<Renderer>;
}

export interface OpenAPIServer {
  APIPage: FC<Omit<ApiPageProps, 'ctx'>>;
}

export function createOpenAPI(options: OpenAPIOptions): OpenAPIServer {
  const document = Parser.dereference(options.documentOrPath);

  return {
    APIPage: async (props) => {
      const ctx = getContext((await document) as OpenAPI.Document, options);

      return <APIPage ctx={ctx} {...props} />;
    },
  };
}

function getContext(
  document: OpenAPI.Document,
  options: OpenAPIOptions,
): RenderContext {
  return {
    document,
    renderer: {
      ...defaultRenderer,
      ...options.renderer,
    },
    generateTypeScriptSchema: options.generateTypeScriptSchema,
    generateCodeSamples: options.generateCodeSamples,
    baseUrl: document.servers?.[0].url ?? 'https://example.com',
    slugger: new Slugger(),
  };
}
