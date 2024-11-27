import type { Document } from '@/types';
import Slugger from 'github-slugger';
import Parser from '@apidevtools/json-schema-ref-parser';
import { Operation } from '@/render/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/schema/method';
import { createRenders, type Renderer } from '@/render/renderer';
import { OpenAPIV3_1 } from 'openapi-types';
import type { NoReference } from '@/utils/schema';

export interface ApiPageProps
  extends Pick<
    RenderContext,
    'generateCodeSamples' | 'generateTypeScriptSchema' | 'shikiOptions'
  > {
  document: string | Document;

  /**
   * An array of operations
   */
  operations: Operation[];
  hasHead: boolean;
  renderer?: Partial<Renderer>;

  /**
   * By default, it is disabled on dev mode
   */
  disableCache?: boolean;
}

const cache = new Map<string, NoReference<Document>>();

export interface Operation {
  path: string;
  method: OpenAPIV3_1.HttpMethods;
}

export async function APIPage(props: ApiPageProps) {
  const {
    operations,
    hasHead = true,
    disableCache = process.env.NODE_ENV === 'development',
  } = props;
  let document: NoReference<Document>;

  if (typeof props.document === 'string' && !disableCache) {
    const cached = cache.get(props.document);

    document = cached ?? (await Parser.dereference(props.document));
    cache.set(props.document, document);
  } else {
    document = await Parser.dereference(props.document);
  }

  const ctx = await getContext(document, props);
  return (
    <ctx.renderer.Root baseUrl={ctx.baseUrl}>
      {operations.map((item) => {
        const pathItem = document.paths?.[item.path];
        if (!pathItem) return null;

        const operation = pathItem[item.method];
        if (!operation) return null;

        const method = createMethod(item.method, pathItem, operation);

        return (
          <Operation
            key={`${item.path}:${item.method}`}
            method={method}
            path={item.path}
            ctx={ctx}
            baseUrls={document.servers?.map((s) => s.url) ?? []}
            hasHead={hasHead}
          />
        );
      })}
    </ctx.renderer.Root>
  );
}

async function getContext(
  document: NoReference<Document>,
  options: ApiPageProps,
): Promise<RenderContext> {
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
