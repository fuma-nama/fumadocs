/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import Slugger from 'github-slugger';
import type { Awaitable, MethodInformation, RenderContext } from '@/types';
import type { NoReference } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';
import { defaultAdapters, MediaAdapter } from '@/requests/media/adapter';
import type { FC, HTMLAttributes, ReactNode } from 'react';
import type { OpenAPIServer } from '@/server';
import type { APIPageClientOptions } from './client';
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
import { APIPage, type ApiPageProps, type OperationItem, type WebhookItem } from './api-page';
import type { CodeUsageGeneratorRegistry, InlineCodeUsageGenerator } from '@/requests/generators';
import type { JSONSchema } from 'json-schema-typed';
import type { BundledTheme, CodeOptionsThemes, CodeToHastOptionsCommon } from 'shiki';
import { highlightHast, type ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { ExampleRequestItem } from './operation/get-example-requests';
import { compile } from '@fumari/json-schema-ts';
import * as ClientBoundary from '@/ui/client/boundary.lazy';

export interface GenerateTypeScriptDefinitionsContext extends RenderContext {
  operation: NoReference<MethodInformation>;
  readOnly: boolean;
  writeOnly: boolean;
  /** @deprecated */
  _internal_legacy?: {
    statusCode: string;
    contentType: string;
  };
}

export interface CreateAPIPageOptions {
  /**
   * Generate TypeScript definitions from response schema.
   *
   * Pass `false` to disable it.
   *
   * @param method - the operation object
   * @param statusCode - status code
   * @deprecated use `generateTypeScriptDefinitions` instead.
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
   * Generate TypeScript definitions from JSON schema.
   *
   * Pass `false` to disable it.
   */
  generateTypeScriptDefinitions?:
    | ((
        schema: JSONSchema,
        ctx: GenerateTypeScriptDefinitionsContext,
      ) => Awaitable<string | undefined>)
    | false;

  /**
   * Generate example code usage for all endpoints.
   */
  codeUsages?: CodeUsageGeneratorRegistry;

  /**
   * Generate example code usage for each endpoint.
   */
  generateCodeSamples?: (method: MethodInformation) => InlineCodeUsageGenerator[];

  shiki: ShikiFactory;
  renderMarkdown?: (md: string) => ReactNode;
  shikiOptions: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;

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
    renderResponseTabs?: (tabs: ResponseTab[], ctx: RenderContext) => ReactNode;

    renderRequestTabs?: (
      items: ExampleRequestItem[],
      ctx: RenderContext & {
        route: string;
        operation: NoReference<MethodInformation>;
      },
    ) => ReactNode;

    renderAPIExampleLayout?: (
      slots: {
        selector: ReactNode;
        usageTabs: ReactNode;
        responseTabs: ReactNode;
      },
      ctx: RenderContext,
    ) => ReactNode;

    /**
     * @param generators - codegens for API example usages
     */
    renderAPIExampleUsageTabs?: (
      generators: CodeUsageGeneratorRegistry,
      ctx: RenderContext,
    ) => ReactNode;

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
    ) => ReactNode;

    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        apiExample: ReactNode;
        apiPlayground: ReactNode;

        authSchemes: ReactNode;
        parameters: ReactNode;
        body: ReactNode;
        responses: ReactNode;
        callbacks: ReactNode;
      },
      ctx: RenderContext,
      method: NoReference<MethodInformation>,
    ) => ReactNode;

    renderWebhookLayout?: (slots: {
      header: ReactNode;
      description: ReactNode;
      authSchemes: ReactNode;
      parameters: ReactNode;
      body: ReactNode;
      requests: ReactNode;
      responses: ReactNode;
      callbacks: ReactNode;
    }) => ReactNode;
  };

  /**
   * Info UI for JSON schemas
   */
  schemaUI?: {
    render?: (options: SchemaUIOptions, ctx: RenderContext) => ReactNode;

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

  renderHeading?: (props: HTMLAttributes<HTMLHeadingElement>, depth: number) => ReactNode;
  renderCodeBlock?: (props: { lang: string; code: string }) => ReactNode;

  client?: APIPageClientOptions;
}

export interface ServerApiPageProps extends Omit<ApiPageProps, 'document'> {
  document: string | ProcessedDocument;
}

export function createAPIPage(
  server: OpenAPIServer,
  options: CreateAPIPageOptions,
): FC<ServerApiPageProps> {
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
        defaultColor: false,
        ...options.shikiOptions,
      })
      .use(rehypeReact);
  }

  return async function APIPageWrapper({ document, ...props }) {
    let processed: ProcessedDocument;
    if (typeof document === 'string') {
      processed = await server.getSchema(document);
    } else {
      processed = document;
    }

    const slugger = new Slugger();

    const ctx: RenderContext = {
      schema: processed,
      proxyUrl: server.options.proxyUrl,
      clientBoundary: ClientBoundary,
      ...options,
      mediaAdapters: {
        ...defaultAdapters,
        ...options.mediaAdapters,
      },
      renderHeading(depth, text, props) {
        const id = typeof text === 'string' ? slugger.slug(text) : props?.id;
        if (!id) throw new Error("missing 'id' for non-string children");

        if (options.renderHeading) {
          return options.renderHeading({ id, children: text, ...props }, depth);
        }

        return (
          <Heading id={id} key={id} as={`h${depth}` as `h1`} {...props}>
            {text}
          </Heading>
        );
      },
      generateTypeScriptDefinitions:
        options.generateTypeScriptDefinitions ??
        ((schema, ctx) => {
          if (options.generateTypeScriptSchema && ctx._internal_legacy) {
            const { statusCode, contentType } = ctx._internal_legacy;
            return options.generateTypeScriptSchema(ctx.operation, statusCode, contentType, ctx);
          }

          if (typeof schema !== 'object') return;
          try {
            return compile(schema, {
              name: 'Response',
              readOnly: ctx.readOnly,
              writeOnly: ctx.writeOnly,
              getSchemaId: ctx.schema.getRawRef,
            });
          } catch (e) {
            console.warn('Failed to generate typescript schema:', e);
          }
        }),
      async renderMarkdown(text) {
        if (options.renderMarkdown) return options.renderMarkdown(text);
        processor ??= createMarkdownProcessor();

        const out = await processor.process({
          value: text,
        });

        return out.result as ReactNode;
      },
      async renderCodeBlock(lang, code) {
        if (options.renderCodeBlock) {
          return options.renderCodeBlock({ lang, code });
        }

        const hast = await highlightHast(await options.shiki.getOrInit(), code, {
          lang,
          defaultColor: false,
          ...options.shikiOptions,
        });
        const rendered = toJsxRuntime(hast, {
          ...JsxRuntime,
          components: {
            pre: Pre,
          },
        });

        return <CodeBlock className="my-0">{rendered}</CodeBlock>;
      },
    };

    return <APIPage {...props} ctx={ctx} />;
  };
}

export { ClientCodeBlockProvider } from './components/codeblock';
