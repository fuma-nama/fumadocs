import type { ReactElement } from 'react';
import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import Slugger from 'github-slugger';
import { Operation } from '@/render/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/schema/method';
import { defaultRenderer, type Renderer } from '@/render/renderer';

export interface ApiPageProps
  extends Pick<
    RenderContext,
    'generateCodeSamples' | 'generateTypeScriptSchema'
  > {
  document: OpenAPI.Document;

  /**
   * An array of operation
   */
  operations: { path: string; method: OpenAPI.HttpMethods }[];
  hasHead: boolean;
  renderer?: Partial<Renderer>;
}

export function APIPage(props: ApiPageProps): ReactElement {
  const { operations, document, hasHead = true } = props;

  const ctx = getContext(document, props);
  return (
    <ctx.renderer.Root baseUrl={ctx.baseUrl}>
      {operations.map((item) => {
        const operation = document.paths[item.path]?.[item.method];
        if (!operation) return null;
        const method = createMethod(item.method, operation);

        return (
          <Operation
            key={`${item.path}:${item.method}`}
            method={method}
            path={item.path}
            ctx={ctx}
            hasHead={hasHead}
          />
        );
      })}
    </ctx.renderer.Root>
  );
}

function getContext(
  document: OpenAPI.Document,
  options: ApiPageProps,
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
