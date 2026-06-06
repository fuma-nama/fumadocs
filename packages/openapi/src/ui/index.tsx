'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import type { Awaitable, Document, MethodInformation, RenderContext } from '@/types';
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
import { PageContent } from './api-page';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { compile } from '@fumari/json-schema-ts';
import { ClientCodeBlock, ClientCodeBlockProvider } from './components/codeblock';
import * as ClientBoundary from '@/ui/client/boundary';
import { dereferenceOpenApiDocument } from '@/utils/document/dereference';
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
import type { ExampleRequestItem } from './operation/get-example-requests';
import type { RequestTabsRenderOptions } from './operation/request-tabs';
import type { ResponseTabsRenderOptions } from './operation/response-tabs';
import type { PlaygroundClientOptions } from '@/playground/client';
import type { GeneratedPageProps, WebhookItem, OperationItem } from '@/utils/pages/builder';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { ParsedSchema } from '@/utils/schema';
import { Markdown } from './components/markdown';
import { TranslationsProvider } from '@fumadocs/api-docs/i18n';

export interface GenerateTypeScriptDefinitionsContext {
  operation: NoReference<MethodInformation>;
  readOnly: boolean;
  writeOnly: boolean;
  ctx: RenderContext;
}

interface APIPlaygroundProps {
  path: string;
  method: MethodInformation;
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
  generateCodeSamples?: (method: MethodInformation) => InlineCodeUsageGenerator[];

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
    // TODO: implement
    render?: (
      options: {
        root: ParsedSchema;
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

export interface OpenAPIPagePayload {
  bundled: Document;
  proxyUrl?: string;
}

export interface OpenAPIPageProps extends Omit<GeneratedPageProps, 'document'> {
  payload: OpenAPIPagePayload;
}

/**
 * Create `<APIPage />` (a client component).
 */
export function createOpenAPIPage({
  shiki = defaultShikiFactory,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
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

  function renderPlaygroundDefault({ method, path, ctx }: APIPlaygroundProps) {
    return (
      <ctx.clientBoundary.PlaygroundClient
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

  return function ClientAPIPage({ payload, ...props }) {
    const processed = useMemo(() => dereferenceOpenApiDocument(payload.bundled), [payload.bundled]);

    const ctx: RenderContext = useMemo(
      () => ({
        schema: processed,
        proxyUrl: payload.proxyUrl,
        shiki,
        shikiOptions,
        generateTypeScriptDefinitions,
        clientBoundary: ClientBoundary,
        _schemaUIProps: {
          renderMarkdown(md) {
            return <Markdown md={md} />;
          },
          resolver(v) {
            // we will only pass dereferenced schema to schema UI
            return {
              dereferenced: v,
              $ref: typeof v === 'object' ? processed.getRawRef(v) : undefined,
            };
          },
        },
        client: options,
        ...options,
        codeUsages: options.codeUsages ?? registerDefault(createCodeUsageGeneratorRegistry()),
        _default_processMarkdown(md) {
          return (processor ??= createMarkdownProcessor()).processSync(md).value as ReactNode;
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
      }),
      [payload.proxyUrl, processed],
    );

    return (
      <TranslationsProvider namespace="openapi">
        <ClientCodeBlockProvider factory={shiki}>
          <ctx.clientBoundary.RenderContextProvider ctx={ctx}>
            <PageContent {...props} />
          </ctx.clientBoundary.RenderContextProvider>
        </ClientCodeBlockProvider>
      </TranslationsProvider>
    );
  };
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
