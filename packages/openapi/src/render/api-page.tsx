import Slugger from 'github-slugger';
import { Operation } from '@/render/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/server/create-method';
import { createRenders } from '@/render/renderer';
import type { OpenAPIV3_1 } from 'openapi-types';
import {
  processDocument,
  type ProcessedDocument,
} from '@/utils/process-document';
import { defaultAdapters } from '@/media/adapter';
import type { SharedOpenAPIOptions } from '@/server';

export interface ApiPageProps extends SharedOpenAPIOptions {
  document: Promise<ProcessedDocument> | string | ProcessedDocument;
  hasHead: boolean;

  /**
   * An array of operations
   */
  operations?: OperationItem[];

  webhooks?: WebhookItem[];
}

export interface WebhookItem {
  name: string;
  method: OpenAPIV3_1.HttpMethods;
}

export interface OperationItem {
  path: string;
  method: OpenAPIV3_1.HttpMethods;
}

export async function APIPage(props: ApiPageProps) {
  const { operations, hasHead = true, webhooks } = props;
  const processed =
    typeof props.document === 'string'
      ? await processDocument(props.document)
      : await props.document;
  const ctx = await getContext(processed, props);
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

export async function getContext(
  schema: ProcessedDocument,
  options: SharedOpenAPIOptions = {},
): Promise<RenderContext> {
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
