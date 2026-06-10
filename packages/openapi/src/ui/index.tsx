'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import type {
  Awaitable,
  Document,
  HttpMethods,
  OperationObject,
  PathItemObject,
  RenderContext,
} from '@/types';
import { defaultAdapters, MediaAdapter } from '@/requests/media/adapter';
import {
  Children,
  type ComponentProps,
  type ReactElement,
  useMemo,
  type FC,
  type ReactNode,
} from 'react';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { Operation } from '@/ui/operation';
import { ServerProvider, useRenderContext } from './contexts/api';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { compile } from '@fumari/json-schema-ts';
import { ClientCodeBlock, ClientCodeBlockProvider } from './components/codeblock';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { AuthProvider } from '@/playground/auth';
import { registerDefault } from '@/requests/generators/all';
import {
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
  type InlineCodeUsageGenerator,
} from '@/requests/generators';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { JSONSchema } from 'json-schema-typed';
import type { CodeToHastOptionsCommon, CodeOptionsThemes, BundledTheme } from 'shiki';
import type { ExampleRequestItem } from '../utils/get-example-requests';
import type { RequestTabsRenderOptions } from './operation/request-tabs';
import type { ResponseTabsRenderOptions } from './operation/response-tabs';
import type { PlaygroundClientOptions } from '@/playground/client';
import type { GeneratedPageProps, WebhookItem, OperationItem } from '@/utils/pages/builder';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { ParsedSchema } from '@/utils/schema';
import { Markdown } from './components/markdown';
import PlaygroundClient from '@/playground/client';
import { Schema } from '@fumadocs/api-docs/components/schema';
import { RenderContextProvider } from './contexts/api';

export interface GenerateTypeScriptDefinitionsContext {
  readOnly: boolean;
  writeOnly: boolean;
  ctx: RenderContext;
}

export interface APIPlaygroundProps {
  path: string;
  method: HttpMethods;
  operation: NoReference<OperationObject>;
  pathItem: NoReference<PathItemObject>;
  ctx: RenderContext;
}

export interface CreateOpenAPIPageOptions {
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
  generateCodeSamples?: (options: {
    operation: NoReference<OperationObject>;
    method: HttpMethods;
    pathItem: NoReference<PathItemObject>;
  }) => InlineCodeUsageGenerator[];

  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;

  /**
   * Show full response schema instead of only example response & Typescript definitions.
   *
   * @default true
   */
  showResponseSchema?: boolean;

  /**
   * Support other media types.
   */
  mediaAdapters?: Record<string, MediaAdapter>;

  /**
   * Customize page content
   */
  content?: {
    renderResponseTabs?: (options: ResponseTabsRenderOptions, ctx: RenderContext) => ReactNode;

    renderRequestTabs?: (options: RequestTabsRenderOptions, ctx: RenderContext) => ReactNode;

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
      context: {
        operation: NoReference<OperationObject>;
        method: HttpMethods;
        pathItem: NoReference<PathItemObject>;
        ctx: RenderContext;
      },
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
    render?: (
      options: {
        root: ParsedSchema;
        readOnly?: boolean;
        writeOnly?: boolean;
      },
      ctx: RenderContext,
    ) => ReactNode;

    /**
     * Show examples under the generated content of JSON schemas.
     *
     * @defaultValue false
     */
    showExample?: boolean;
  };

  /**
   * Customize API playground
   */
  playground?: PlaygroundClientOptions & {
    /**
     * @defaultValue true
     */
    enabled?: boolean;

    /**
     * render a page-level provider (useful for handling auth)
     */
    provider?: (props: { children: ReactNode }) => ReactNode;
    /**
     * replace the renderer
     */
    render?: (props: APIPlaygroundProps) => ReactNode;
  };

  operation?: {
    APIExampleSelector?: FC<{
      items: ExampleRequestItem[];

      value: string | undefined;
      onValueChange: (id: string) => void;
    }>;
  };

  components?: {
    Heading?: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
    CodeBlock?: FC<{ lang: string; code: string }>;
    Markdown?: FC<{ md: string }>;
  };

  /**
   * Set a prefix for `localStorage` keys.
   *
   * Useful when using multiple OpenAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-openapi-`
   */
  storageKeyPrefix?: string;
}

export type OpenAPIPageProps = OpenAPIPageProps_Spec | OpenAPIPageProps_Preloaded;

export type OpenAPIPageProps_Spec = Omit<GeneratedPageProps, 'document'> & {
  payload: {
    bundled: Document;
    proxyUrl?: string;
  };
};

export type OpenAPIPageProps_Preloaded = GeneratedPageProps & {
  preloaded: {
    docs: Record<string, Document>;
    proxyUrl?: string;
  };
};

/**
 * Create `<OpenAPIPage />` (a client component).
 */
export function createOpenAPIPage({
  shiki = defaultShikiFactory,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  schemaUI: schemaUIOptions,
  generateTypeScriptDefinitions = (schema, ctx) => {
    if (typeof schema !== 'object') return;

    try {
      return compile(schema, {
        name: 'Response',
        readOnly: ctx.readOnly,
        writeOnly: ctx.writeOnly,
        getSchemaId: ctx.ctx.schema.getRawRef,
      });
    } catch (e) {
      console.warn('Failed to generate typescript schema:', e);
    }
  },
  ...options
}: CreateOpenAPIPageOptions = {}): FC<OpenAPIPageProps> {
  let processor: ReturnType<typeof createMarkdownProcessor>;

  function renderPlaygroundDefault({ method, operation, path, pathItem }: APIPlaygroundProps) {
    return (
      <PlaygroundClient
        operation={operation}
        pathItem={pathItem}
        route={path}
        method={method}
        writeOnly
        readOnly={false}
      />
    );
  }

  function renderPlaygroundProviderDefault({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  function createMarkdownProcessor() {
    const mdxComponents = {
      ...defaultMdxComponents,
      img: undefined,
      pre: MarkdownPre,
    };

    function rehypeReact(this: any) {
      this.compiler = (tree: any, file: any) => {
        return toJsxRuntime(tree, {
          development: false,
          filePath: file.path,
          ...JsxRuntime,
          components: mdxComponents,
        });
      };
    }

    return remark().use(remarkGfm).use(remarkRehype).use(rehypeReact);
  }

  return function OpenAPIPage(props) {
    let doc: Document;
    let proxyUrl: string | undefined;
    if ('preloaded' in props) {
      doc = props.preloaded.docs[props.document];
      if (!doc)
        throw new Error(
          `[Fumadocs OpenAPI] the document ${props.document} is not preloaded, make sure to pass the "preloaded" prop to <OpenAPIPage />`,
        );
      proxyUrl = props.preloaded.proxyUrl;
    } else {
      doc = props.payload.bundled;
      proxyUrl = props.payload.proxyUrl;
    }

    const processed = useMemo(() => dereferenceBundledDocument(doc), [doc]);

    const ctx: RenderContext = useMemo(() => {
      function renderMarkdown(md: string) {
        return <Markdown md={md} />;
      }
      function resolver(v: ParsedSchema) {
        // we will only pass dereferenced schema to schema UI
        return {
          dereferenced: v,
          $ref: typeof v === 'object' ? processed.getRawRef(v) : undefined,
        };
      }

      return {
        schema: processed,
        proxyUrl,
        shiki,
        shikiOptions,
        generateTypeScriptDefinitions,
        SchemaUI(props) {
          if (schemaUIOptions?.render) return schemaUIOptions.render(props, ctx);
          return (
            <Schema
              {...props}
              showExample={props.showExample ?? schemaUIOptions?.showExample}
              resolver={resolver}
              renderMarkdown={renderMarkdown}
            />
          );
        },
        client: options,
        ...options,
        codeUsages: options.codeUsages ?? registerDefault(createCodeUsageGeneratorRegistry()),
        _default_processMarkdown(md) {
          processor ??= createMarkdownProcessor();
          return processor.processSync(md).result as ReactNode;
        },
        mediaAdapters: {
          ...defaultAdapters,
          ...options.mediaAdapters,
        },
        playground: {
          ...options.playground,
          provider: options.playground?.provider ?? renderPlaygroundProviderDefault,
          render: options.playground?.render ?? renderPlaygroundDefault,
        },
      };
    }, [proxyUrl, processed]);

    return (
      <ClientCodeBlockProvider factory={shiki}>
        <RenderContextProvider ctx={ctx}>
          <PageContent {...props} />
        </RenderContextProvider>
      </ClientCodeBlockProvider>
    );
  };
}

function PageContent({
  showTitle: hasHead = false,
  showDescription,
  operations,
  webhooks,
}: Omit<GeneratedPageProps, 'document'>) {
  const ctx = useRenderContext();
  const { dereferenced } = ctx.schema;
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm @container">
      {slots.operations?.map((op) => op.children)}
      {slots.webhooks?.map((op) => op.children)}
    </div>
  );

  let content = renderPageLayout(
    {
      operations: operations?.map((item) => {
        const pathItem = dereferenced.paths?.[item.path];
        if (!pathItem)
          throw new Error(`[Fumadocs OpenAPI] Path not found in OpenAPI schema: ${item.path}`);

        const operation = pathItem[item.method];
        if (!operation)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in operation: ${item.path}`,
          );

        return {
          item,
          children: (
            <Operation
              key={`${item.path}:${item.method}`}
              method={item.method}
              pathItem={pathItem}
              operation={operation}
              path={item.path}
              showTitle={hasHead}
              showDescription={showDescription}
            />
          ),
        };
      }),
      webhooks: webhooks?.map((item) => {
        const webhook = dereferenced.webhooks?.[item.name];
        if (!webhook)
          throw new Error(`[Fumadocs OpenAPI] Webhook not found in OpenAPI schema: ${item.name}`);

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
              method={item.method}
              pathItem={webhook}
              operation={hook}
              path={`/${item.name}`}
              showTitle={hasHead}
              showDescription={showDescription}
            />
          ),
        };
      }),
    },
    ctx,
  );

  if (ctx.playground?.enabled !== false && ctx.playground?.provider) {
    content = ctx.playground.provider({ children: content });
  }

  return <ServerProvider servers={dereferenced.servers}>{content}</ServerProvider>;
}

function MarkdownPre(props: ComponentProps<'pre'>) {
  const code = Children.only(props.children) as ReactElement;
  const codeProps = code.props as ComponentProps<'code'>;
  const content = codeProps.children;
  if (typeof content !== 'string') return null;

  const lang =
    codeProps.className
      ?.split(' ')
      .find((v) => v.startsWith('language-'))
      ?.slice('language-'.length) ?? 'text';

  return <ClientCodeBlock lang={lang} code={content.trimEnd()} />;
}

// kept for backward compatibility
export type { OperationItem, WebhookItem } from '@/utils/pages/builder';
