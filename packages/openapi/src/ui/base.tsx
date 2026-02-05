/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import Slugger from 'github-slugger';
import type { Awaitable, DistributiveOmit, MethodInformation, RenderContext } from '@/types';
import type { NoReference } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';
import { defaultAdapters, MediaAdapter } from '@/requests/media/adapter';
import type { FC, ReactNode } from 'react';
import { highlight, type CoreHighlightOptions } from 'fumadocs-core/highlight/core';
import type { OpenAPIServer } from '@/server';
import type { APIPageClientOptions } from './client';
import type { CodeUsageGenerator } from './operation/usage-tabs';
import { Heading } from 'fumadocs-ui/components/heading';
import { createRehypeCode } from 'fumadocs-core/mdx-plugins/rehype-code.core';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import type { SchemaUIOptions } from './schema';
import type { ResponseTab } from './operation/response-tabs';
import type { ExampleRequestItem } from './operation/request-tabs';
import type { ResolvedShikiConfig } from 'fumadocs-core/highlight/config';
import { APIPage, type ApiPageProps, type OperationItem, type WebhookItem } from './api-page';

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
        contentType: string,
        ctx: RenderContext,
      ) => Awaitable<string | undefined>)
    | false;

  /**
   * Generate example code usage for endpoints.
   */
  generateCodeSamples?: (method: MethodInformation) => Awaitable<CodeUsageGenerator[]>;

  shiki: ResolvedShikiConfig;
  renderMarkdown?: (md: string) => Awaitable<ReactNode>;
  shikiOptions?: DistributiveOmit<CoreHighlightOptions, 'config' | 'lang' | 'components'>;

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
    renderResponseTabs?: (tabs: ResponseTab[], ctx: RenderContext) => Awaitable<ReactNode>;

    renderRequestTabs?: (
      items: ExampleRequestItem[],
      ctx: RenderContext & {
        route: string;
        operation: NoReference<MethodInformation>;
      },
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
      generators: CodeUsageGenerator[],
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
        description: ReactNode;
        apiExample: ReactNode;
        apiPlayground: ReactNode;

        authSchemes: ReactNode;
        paremeters: ReactNode;
        body: ReactNode;
        responses: ReactNode;
        callbacks: ReactNode;
      },
      ctx: RenderContext,
      method: NoReference<MethodInformation>,
    ) => Awaitable<ReactNode>;

    renderWebhookLayout?: (slots: {
      header: ReactNode;
      description: ReactNode;
      authSchemes: ReactNode;
      paremeters: ReactNode;
      body: ReactNode;
      requests: ReactNode;
      responses: ReactNode;
      callbacks: ReactNode;
    }) => Awaitable<ReactNode>;
  };

  /**
   * Info UI for JSON schemas
   */
  schemaUI?: {
    render?: (options: SchemaUIOptions, ctx: RenderContext) => Awaitable<ReactNode>;

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

export function createAPIPage(
  server: OpenAPIServer,
  options: CreateAPIPageOptions,
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
      .use(createRehypeCode(options.shiki), {
        langs: [],
        lazy: true,
      })
      .use(rehypeReact);
  }

  return async function APIPageWrapper({ document, ...props }) {
    let processed: ProcessedDocument;
    if (typeof document === 'string') {
      processed = await server.getSchema(document);
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
      renderHeading(depth, text, props) {
        const id = slugger.slug(text);

        return (
          <Heading id={id} key={id} as={`h${depth}` as `h1`} {...props}>
            {text}
          </Heading>
        );
      },
      async renderMarkdown(text) {
        if (options.renderMarkdown) return options.renderMarkdown(text);
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
          config: options.shiki,
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
