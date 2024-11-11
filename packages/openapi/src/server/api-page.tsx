import type { ReactElement } from 'react';
import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import Slugger from 'github-slugger';
import Parser from '@apidevtools/json-schema-ref-parser';
import { Operation } from '@/render/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/schema/method';
import { createRenders, type Renderer } from '@/render/renderer';

export interface ApiPageProps
  extends Pick<
    RenderContext,
    'generateCodeSamples' | 'generateTypeScriptSchema' | 'shikiOptions'
  > {
  document: string | OpenAPI.Document;

  /**
   * An array of operations
   */
  operations: Operation[];
  hasHead: boolean;
  renderer?: Partial<Renderer>;

  disableCache?: boolean;
}

const cache = new Map<string, OpenAPI.Document>();

export interface Operation {
  path: string;
  method: OpenAPI.HttpMethods;
}

export async function APIPage(props: ApiPageProps): Promise<ReactElement> {
  const { operations, hasHead = true } = props;
  let document: OpenAPI.Document;

  if (typeof props.document === 'string' && !props.disableCache) {
    const cached = cache.get(props.document);
    document =
      cached ?? (await Parser.dereference<OpenAPI.Document>(props.document));
    cache.set(props.document, document);
  } else {
    document = await Parser.dereference<OpenAPI.Document>(props.document);
  }

  const ctx = getContext(document, props);
  return (
    <ctx.renderer.Root baseUrl={ctx.baseUrl}>
      {operations.map((item) => {
        const pathItem = document.paths[item.path];
        if (!pathItem) return null;

        const operation = pathItem[item.method];
        if (!operation) return null;

        const method = createMethod(item.method, pathItem, operation);

        return (
          <Operation
            servers={document.servers ?? []}
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
      ...createRenders(options.shikiOptions),
      ...options.renderer,
    },
    shikiOptions: options.shikiOptions,
    generateTypeScriptSchema: options.generateTypeScriptSchema,
    generateCodeSamples: options.generateCodeSamples,
    baseUrl: document.servers?.[0].url ?? 'https://example.com',
    slugger: new Slugger(),
  };
}
