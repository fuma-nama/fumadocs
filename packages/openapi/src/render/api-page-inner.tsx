import { defaultAdapters } from '@/media/adapter';
import { Operation } from '@/render/operation';
import { createRenders, type Renderer } from '@/render/renderer';
import { createMethod } from '@/server/create-method';
import type { RenderContext } from '@/types';
import { type ProcessedDocument } from '@/utils/process-document';
import Slugger from 'github-slugger';
import type { OpenAPIV3_1 } from 'openapi-types';

export function getContext(
  schema: ProcessedDocument,
  options: ApiPageContextProps & {
    renderer?: Partial<Renderer>;
  } = {},
): RenderContext {
  const document = schema.document;
  const servers =
    document.servers && document.servers.length > 0
      ? document.servers
      : [{ url: '/' }];

  return {
    schema,
    proxyUrl: options.proxyUrl,
    disablePlayground: options.disablePlayground,
    showResponseSchema: options.showResponseSchema,
    renderer: {
      ...createRenders(),
      ...options.renderer,
    },
    shikiOptions: options.shikiOptions,
    generateTypeScriptSchema: options.generateTypeScriptSchema,
    generateCodeSamples: options.generateCodeSamples,
    servers,
    mediaAdapters: {
      ...defaultAdapters,
      ...options.mediaAdapters,
    },
    slugger: new Slugger(),
  };
}

type ApiPageContextProps = Pick<
  Partial<RenderContext>,
  | 'shikiOptions'
  | 'generateTypeScriptSchema'
  | 'generateCodeSamples'
  | 'proxyUrl'
  | 'showResponseSchema'
  | 'disablePlayground'
  | 'mediaAdapters'
>;

export interface ApiPageProps extends ApiPageContextProps {
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

  /**
   * The OpenAPI document
   */
  document?: any;
}

export interface ApiPagePropsInner extends ApiPageContextProps {
  processed: ProcessedDocument;
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

export interface WebhookItem {
  name: string;
  method: OpenAPIV3_1.HttpMethods;
}

export interface OperationItem {
  path: string;
  method: OpenAPIV3_1.HttpMethods;
}

export function APIPageInner(props: ApiPagePropsInner) {
  const { operations, hasHead = true, webhooks, processed, ...rest } = props;
  const ctx = getContext(processed, rest);

  const { document } = processed;

  return (
    <ctx.renderer.Root ctx={ctx}>
      {operations?.map((item) => {
        const pathItem = document.paths?.[item.path];
        if (!pathItem)
          throw new Error(
            `[Fumadocs OpenAPI] Path not found in OpenAPI schema: ${item.path}`,
          );

        const operation = pathItem[item.method];
        if (!operation)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in operation: ${item.path}`,
          );

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
        if (!webhook)
          throw new Error(
            `[Fumadocs OpenAPI] Webhook not found in OpenAPI schema: ${item.name}`,
          );

        const hook = webhook[item.method];
        if (!hook)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in webhook: ${item.name}`,
          );

        const method = createMethod(item.method, webhook, hook);

        return (
          <Operation
            type="webhook"
            key={`${item.name}:${item.method}`}
            method={method}
            ctx={ctx}
            path={`/${item.name}`}
            hasHead={hasHead}
          />
        );
      })}
    </ctx.renderer.Root>
  );
}
