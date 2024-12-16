import type { DereferenceMap, Document } from '@/types';
import Slugger from 'github-slugger';
import { Operation } from '@/render/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/server/create-method';
import { createRenders, type Renderer } from '@/render/renderer';
import type { OpenAPIV3_1 } from 'openapi-types';
import type { NoReference } from '@/utils/schema';
import { type DocumentInput, processDocument } from '@/utils/process-document';

export interface ApiPageProps
  extends Pick<
    RenderContext,
    | 'generateCodeSamples'
    | 'generateTypeScriptSchema'
    | 'shikiOptions'
    | 'enableServerActionProxy'
  > {
  document: DocumentInput;
  hasHead: boolean;

  renderer?: Partial<Renderer>;

  /**
   * An array of operations
   */
  operations?: OperationItem[];

  webhooks?: WebhookItem[];

  /**
   * By default, it is disabled on dev mode
   */
  disableCache?: boolean;
}

type ProcessedDocument = {
  document: NoReference<Document>;
  dereferenceMap: DereferenceMap;
};

export interface WebhookItem {
  name: string;
  method: OpenAPIV3_1.HttpMethods;
}

export interface OperationItem {
  path: string;
  method: OpenAPIV3_1.HttpMethods;
}

export async function APIPage(props: ApiPageProps) {
  const {
    operations,
    hasHead = true,
    webhooks,
    disableCache = process.env.NODE_ENV === 'development',
  } = props;

  const processed = await processDocument(props.document, disableCache);
  const ctx = await getContext(processed, props);
  const { document } = processed;
  return (
    <ctx.renderer.Root baseUrl={ctx.baseUrl}>
      {operations?.map((item) => {
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
            hasHead={hasHead}
          />
        );
      })}
      {webhooks?.map((item) => {
        const webhook = document.webhooks?.[item.name];
        if (!webhook) return;

        const hook = webhook[item.method];
        if (!hook) return;

        const method = createMethod(item.method, webhook, hook);

        return (
          <Operation
            type="webhook"
            key={`${item.name}:${item.method}`}
            method={method}
            ctx={{
              ...ctx,
              baseUrl: 'http://localhost:8080',
            }}
            path={`/${item.name}`}
            hasHead={hasHead}
          />
        );
      })}
    </ctx.renderer.Root>
  );
}

export async function getContext(
  { document, dereferenceMap }: ProcessedDocument,
  options: Pick<
    Partial<RenderContext>,
    'shikiOptions' | 'generateTypeScriptSchema' | 'generateCodeSamples'
  > & {
    renderer?: Partial<Renderer>;
  } = {},
): Promise<RenderContext> {
  return {
    document: document,
    dereferenceMap,
    renderer: {
      ...createRenders(options.shikiOptions),
      ...options.renderer,
    },
    shikiOptions: options.shikiOptions,
    generateTypeScriptSchema: options.generateTypeScriptSchema,
    generateCodeSamples: options.generateCodeSamples,
    baseUrl: document.servers?.[0].url ?? 'https://example.com',
    baseUrls: document.servers?.map((s) => s.url) ?? [],
    slugger: new Slugger(),
  };
}
