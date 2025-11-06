/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import Slugger from 'github-slugger';
import { Operation } from '@/ui/operation';
import type { MethodInformation, RenderContext } from '@/types';
import {
  createMethod,
  type NoReference,
  type ResolvedSchema,
} from '@/utils/schema';
import type { OpenAPIV3_1 } from 'openapi-types';
import type { ProcessedDocument } from '@/utils/process-document';
import { defaultAdapters, MediaAdapter } from '@/requests/media/adapter';
import type { FC, ReactNode } from 'react';
import {
  highlight,
  type HighlightOptionsCommon,
  type HighlightOptionsThemes,
} from 'fumadocs-core/highlight';
import type { OpenAPIServer } from '@/server';
import type { APIPageClientOptions } from './client';
import type {
  CodeUsageGenerator,
  ResponseTab,
} from './operation/example-panel';
import { ApiProviderLazy } from './contexts/api.lazy';
import { Heading } from 'fumadocs-ui/components/heading';
import {
  rehypeCode,
  type RehypeCodeOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import type { SchemaUIProps } from './schema/client';

type Awaitable<T> = T | Promise<T>;

export interface CreateAPIPageOptions {
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
   * Generate example code usage for endpoints.
   */
  generateCodeSamples?: (
    method: MethodInformation,
  ) => Awaitable<CodeUsageGenerator[]>;

  shikiOptions?: Omit<HighlightOptionsCommon, 'lang' | 'components'> &
    HighlightOptionsThemes;

  /**
   * Show full response schema instead of only example response & Typescript definitions.
   *
   * @default true
   */
  showResponseSchema?: boolean;

  /**
   * Support other media types (for server-side generation).
   */
  mediaAdapters?: Record<string, MediaAdapter>;

  /**
   * Customise page content
   */
  content?: {
    renderResponseTabs?: (
      tabs: ResponseTab[],
      ctx: RenderContext,
    ) => Awaitable<ReactNode>;

    renderAPIExampleLayout?: (
      slots: {
        selector: ReactNode;
        usageTabs: ReactNode;
        responseTabs: ReactNode;
      },
      ctx: RenderContext,
    ) => Awaitable<ReactNode>;

    /**
     * @param generators - codegens for API example usages
     */
    renderAPIExampleUsageTabs?: (
      generators: CodeUsageGenerator<unknown>[],
      ctx: RenderContext,
    ) => Awaitable<ReactNode>;

    /**
     * renderer of the entire page's layout (containing all operations & webhooks UI)
     */
    renderPageLayout?: (
      slots: {
        operations?: {
          item: OperationItem;
          children: ReactNode;
        }[];
        webhooks?: {
          item: WebhookItem;
          children: ReactNode;
        }[];
      },
      ctx: RenderContext,
    ) => Awaitable<ReactNode>;

    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        apiExample: ReactNode;
        apiPlayground: ReactNode;

        authSchemes: ReactNode;
        paremeters: ReactNode;
        body: ReactNode;
        responses: ReactNode;
        callbacks: ReactNode;
      },
      ctx: RenderContext,
      method: MethodInformation,
    ) => Awaitable<ReactNode>;

    renderWebhookLayout?: (slots: {
      header: ReactNode;
      authSchemes: ReactNode;
      paremeters: ReactNode;
      body: ReactNode;
      responses: ReactNode;
      callbacks: ReactNode;
    }) => Awaitable<ReactNode>;
  };

  /**
   * Info UI for JSON schemas
   */
  schemaUI?: {
    render?: (
      options: Omit<SchemaUIProps, 'generated'> & {
        root: ResolvedSchema;
      },
      ctx: RenderContext,
    ) => Awaitable<ReactNode>;

    /**
     * Show examples under the generated content of JSON schemas.
     *
     * @defaultValue false
     */
    showExample?: boolean;
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
    }) => Awaitable<ReactNode>;
  };

  client?: APIPageClientOptions;
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
  let processor: ReturnType<typeof createMarkdownProcessor>;

  function createMarkdownProcessor() {
    function rehypeReact(this: any) {
      this.compiler = (tree: any, file: any) => {
        return toJsxRuntime(tree, {
          development: false,
          filePath: file.path,
          ...JsxRuntime,
          components: defaultMdxComponents,
        });
      };
    }

    return remark()
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeCode, {
        langs: [],
        lazy: true,
      } satisfies Partial<RehypeCodeOptions>)
      .use(rehypeReact);
  }

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

    const slugger = new Slugger();

    const ctx: RenderContext = {
      schema: processed,
      proxyUrl: server.options.proxyUrl,
      ...options,
      servers,
      mediaAdapters: {
        ...defaultAdapters,
        ...options.mediaAdapters,
      },
      slugger,
      renderHeading(depth, text) {
        const id = slugger.slug(text);

        return (
          <Heading id={id} key={id} as={`h${depth}` as `h1`}>
            {text}
          </Heading>
        );
      },
      async renderMarkdown(text) {
        processor ??= createMarkdownProcessor();

        const out = await processor.process({
          value: text,
        });

        return out.result as ReactNode;
      },
      async renderCodeBlock(lang, code) {
        const rendered = await highlight(code, {
          lang,
          ...options.shikiOptions,
          components: {
            pre: (props) => <Pre {...props} />,
          },
        });

        return <CodeBlock className="my-0">{rendered}</CodeBlock>;
      },
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
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm">
      {slots.operations?.map((op) => op.children)}
      {slots.webhooks?.map((op) => op.children)}
    </div>
  );

  const content = await renderPageLayout(
    {
      operations: operations?.map((item) => {
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

        return {
          item,
          children: (
            <Operation
              key={`${item.path}:${item.method}`}
              method={method}
              path={item.path}
              ctx={ctx}
              hasHead={hasHead}
            />
          ),
        };
      }),
      webhooks: webhooks?.map((item) => {
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

        return {
          item,
          children: (
            <Operation
              type="webhook"
              key={`${item.name}:${item.method}`}
              method={createMethod(item.method, webhook, hook)}
              ctx={ctx}
              path={`/${item.name}`}
              hasHead={hasHead}
            />
          ),
        };
      }),
    },
    ctx,
  );

  return (
    <ApiProviderLazy
      servers={ctx.servers}
      shikiOptions={ctx.shikiOptions}
      client={ctx.client ?? {}}
    >
      {content}
    </ApiProviderLazy>
  );
}
