import Slugger from 'github-slugger';
import { CodeSample, Operation } from '@/ui/operation';
import type { MethodInformation, RenderContext } from '@/types';
import { createMethod, NoReference } from '@/utils/schema';
import { createRenders } from '@/ui/renderer';
import type { OpenAPIV3_1 } from 'openapi-types';
import type { ProcessedDocument } from '@/utils/process-document';
import { defaultAdapters, MediaAdapter } from '@/requests/media/adapter';
import { FC, ReactNode } from 'react';
import type {
  HighlightOptionsCommon,
  HighlightOptionsThemes,
} from 'fumadocs-core/highlight';
import { OpenAPIServer } from '@/server';

type Awaitable<T> = T | Promise<T>;

export interface CreateAPIPageOptions {
  /**
   * Disable API Playground
   *
   * @defaultValue false
   * @deprecated Use `playground.enabled` instead
   */
  disablePlayground?: boolean;

  /**
   * Generate TypeScript definitions from response schema.
   *
   * Pass `false` to disable it.
   *
   * @param method - the operation object
   * @param statusCode - status code
   */
  generateTypeScriptSchema?:
    | ((
        method: NoReference<MethodInformation>,
        statusCode: string,
      ) => Awaitable<string>)
    | false;

  /**
   * Generate code samples for endpoint.
   */
  generateCodeSamples?: (method: MethodInformation) => Awaitable<CodeSample[]>;

  shikiOptions?: Omit<HighlightOptionsCommon, 'lang' | 'components'> &
    HighlightOptionsThemes;

  /**
   * Show full response schema instead of only example response & Typescript definitions
   *
   * @default true
   */
  showResponseSchema?: boolean;

  mediaAdapters?: Record<string, MediaAdapter>;

  /**
   * Customise page content
   */
  content?: {
    /**
     * Show examples under the generated content of JSON schemas.
     *
     * @defaultValue false
     */
    showExampleInFields?: boolean;
  };

  /**
   * Customise API playground
   */
  playground?: {
    /**
     * @defaultValue true
     */
    enabled?: boolean;
    /**
     * replace the server-side renderer
     */
    render?: (props: {
      path: string;
      method: MethodInformation;
      ctx: RenderContext;
    }) => ReactNode | Promise<ReactNode>;
  };
}

export interface ApiPageProps {
  document: Promise<ProcessedDocument> | string | ProcessedDocument;
  hasHead?: boolean;

  /**
   * An array of operations
   */
  operations?: OperationItem[];

  webhooks?: WebhookItem[];
}

export interface WebhookItem {
  /**
   * webhook name in `webhooks`
   */
  name: string;
  method: OpenAPIV3_1.HttpMethods;
}

export interface OperationItem {
  /**
   * the path of operation in `paths`
   */
  path: string;
  /**
   * the HTTP method of operation
   */
  method: OpenAPIV3_1.HttpMethods;
}

export function createAPIPage(
  server: OpenAPIServer,
  options: CreateAPIPageOptions = {},
): FC<ApiPageProps> {
  return async function APIPageWrapper({ document, ...props }) {
    let processed: ProcessedDocument;
    if (typeof document === 'string') {
      processed = (await server.getSchemas())[document];
    } else {
      processed = await document;
    }

    const { dereferenced } = processed;
    const servers =
      dereferenced.servers && dereferenced.servers.length > 0
        ? dereferenced.servers
        : [{ url: '/' }];

    const ctx: RenderContext = {
      schema: processed,
      proxyUrl: server.options.proxyUrl,
      disablePlayground: options.disablePlayground,
      showResponseSchema: options.showResponseSchema,
      renderer: {
        ...createRenders(),
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

    return <APIPage {...props} ctx={ctx} />;
  };
}

async function APIPage({
  hasHead = false,
  operations,
  webhooks,
  ctx,
}: Omit<ApiPageProps, 'document'> & {
  ctx: RenderContext;
}) {
  const { dereferenced } = ctx.schema;

  return (
    <ctx.renderer.Root ctx={ctx}>
      {operations?.map((item) => {
        const pathItem = dereferenced.paths?.[item.path];
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
        const webhook = dereferenced.webhooks?.[item.name];
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
