import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import Parser from '@apidevtools/json-schema-ref-parser';
import type { FC } from 'react';
import Slugger from 'github-slugger';
import { type TableOfContents } from 'fumadocs-core/server';
import { type StructuredData } from 'fumadocs-core/mdx-plugins';
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

interface GeneratedProps {
  /**
   * TOC to write to
   */
  toc?: TableOfContents;

  /**
   * structured data to write to
   */
  structuredData?: StructuredData;
}

export interface OpenAPIServer {
  APIPage: FC<Omit<ApiPageProps, 'ctx'> & GeneratedProps>;
}

export function createOpenAPI(options: OpenAPIOptions): OpenAPIServer {
  const document = Parser.dereference(options.documentOrPath);

  return {
    APIPage: async (props) => {
      const ctx = getContext(
        (await document) as OpenAPI.Document,
        options,
        props,
      );

      return <APIPage ctx={ctx} {...props} />;
    },
  };
}

function getContext(
  document: OpenAPI.Document,
  options: OpenAPIOptions,
  generated: GeneratedProps,
): RenderContext {
  if (generated.structuredData) {
    generated.structuredData.headings = [];
    generated.structuredData.contents = [];
  }

  if (generated.toc) {
    while (generated.toc.length > 0) generated.toc.pop();
  }

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
    toc: generated.toc ?? [],
    structuredData: generated.structuredData ?? { headings: [], contents: [] },
  };
}
