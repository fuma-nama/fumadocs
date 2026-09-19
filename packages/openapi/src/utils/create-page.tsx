'use client';
import type { ExampleRequest, PageOperationProps, ResponseTab } from '@/operation';
import { createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type { Awaitable, Document, HttpMethods, OperationObject, PathItemObject } from '@/types';
import type { OperationItem, OpenAPIPageProps, WebhookItem } from '@/utils/pages/builder';
import type { DereferencedDocument } from '@/utils/document/dereference';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import type { MediaAdapter } from '@/requests/media/adapter';
import { defaultAdapters } from '@/requests/media/adapter';
import type { CodeUsageGeneratorRegistry, InlineCodeUsageGenerator } from '@/requests/generators';
import type { JsonSchema } from '@fumadocs/json-schema';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import type { PlaygroundClientOptions } from '@/ui/playground/client';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import {
  createPageComponents,
  defaultShikiOptions,
  type PageComponents,
  type ShikiOptions,
} from 'shared-api/components/defaults';
import { AuthProvider } from '@/playground/auth';
import { ServerProvider } from './use-server';

/** components the UI renders through, so a page can replace them */
export interface OpenAPIComponents extends PageComponents {
  SchemaUI: FC<SchemaUIOptions>;
}

export interface GenerateTypeScriptDefinitionsContext {
  name: string;
  readOnly: boolean;
  writeOnly: boolean;
  doc: DereferencedDocument;
}

export interface OpenAPIRuntimeOptions {
  /**
   * Support other media types.
   */
  mediaAdapters?: Record<string, MediaAdapter>;
  /**
   * Set a prefix for `localStorage` keys.
   *
   * Useful when using multiple OpenAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-openapi-`
   */
  storageKeyPrefix?: string;
  /**
   * Generate example code usage for all endpoints.
   */
  codeUsages?: CodeUsageGeneratorRegistry;
  /**
   * Generate example code usage for each endpoint.
   */
  generateCodeSamples?: (options: {
    path: string;
    operation: OperationObject;
    method: HttpMethods;
    pathItem: PathItemObject;
  }) => InlineCodeUsageGenerator[];
  /**
   * Generate TypeScript definitions from JSON schema.
   *
   * Pass `false` to disable it.
   */
  generateTypeScriptDefinitions?:
    | ((
        schema: JsonSchema,
        ctx: GenerateTypeScriptDefinitionsContext,
      ) => Awaitable<string | undefined>)
    | false;
}

/**
 * The document and request options of the page, read from `useOpenAPI()`.
 */
export interface OpenAPIRuntime extends OpenAPIRuntimeOptions {
  doc: DereferencedDocument;
  proxyUrl?: string;
  mediaAdapters: Record<string, MediaAdapter>;
  storageKeyPrefix: string;
}

export interface APIPlaygroundProps {
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;
}

export interface OperationPlaygroundOptions extends PlaygroundClientOptions {
  /**
   * @defaultValue true
   */
  enabled?: boolean;

  /**
   * Replace the renderer, e.g. the playground installed with Fumadocs CLI.
   */
  render?: (props: APIPlaygroundProps) => ReactNode;
}

export interface PageLayoutProps {
  operations?: { item: OperationItem; children: ReactNode }[];
  webhooks?: { item: WebhookItem; children: ReactNode }[];
}

/**
 * The options the UI renders with, read from `useRenderContext()`.
 */
export interface OpenAPIRenderOptions {
  /** the Shiki highlighter of code blocks */
  shiki?: ShikiFactory;
  shikiOptions?: ShikiOptions;

  /**
   * Show full response schema instead of only example response & Typescript definitions.
   *
   * @default true
   */
  showResponseSchema?: boolean;

  /**
   * Customize page content.
   */
  content?: {
    renderResponseTabs?: (options: { tabs: ResponseTab[] }, ctx: RenderContext) => ReactNode;

    renderRequestTabs?: (
      options: {
        route: string;
        items: ExampleRequest[];
        method: HttpMethods;
        pathItem: PathItemObject;
        operation: OperationObject;
      },
      ctx: RenderContext,
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
    renderPageLayout?: (slots: PageLayoutProps, ctx: RenderContext) => ReactNode;

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
        path: string;
        operation: OperationObject;
        method: HttpMethods;
        pathItem: PathItemObject;
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
   * Info UI for JSON schemas.
   */
  schemaUI?: {
    /**
     * Show examples under the generated content of JSON schemas.
     *
     * @defaultValue false
     */
    showExample?: boolean;
  };

  /**
   * Customize API playground.
   */
  playground?: OperationPlaygroundOptions;
}

/**
 * The render options of the page with their defaults applied, read from `useRenderContext()`.
 */
export interface RenderContext extends OpenAPIRenderOptions {
  shiki: ShikiFactory;
  shikiOptions: ShikiOptions;
}

interface OpenAPIProviderProps extends OpenAPIRuntimeOptions, OpenAPIRenderOptions {
  shiki: ShikiFactory;
  /** the bundled OpenAPI document */
  document: Document;
  proxyUrl?: string;
  components: OpenAPIComponents;
  children: ReactNode;
}

export interface CreateOpenAPIRendererOptions extends OpenAPIRuntimeOptions, OpenAPIRenderOptions {
  components: Partial<PageComponents> & {
    SchemaUI: FC<SchemaUIOptions>;
    /** renders an operation or webhook of the page */
    Operation: FC<PageOperationProps>;
    /** wraps the rendered operations and webhooks */
    Layout?: FC<PageLayoutProps>;
  };
}

const OpenAPIContext = createContext<OpenAPIRuntime | null>(null);
const ComponentsContext = createContext<OpenAPIComponents | null>(null);
const OptionsContext = createContext<RenderContext | null>(null);

/**
 * The runtime of the API page: the document and request options.
 */
export function useOpenAPI(): OpenAPIRuntime {
  const ctx = use(OpenAPIContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');

  return ctx;
}

export function useComponents(): OpenAPIComponents {
  const components = use(ComponentsContext);
  if (!components) throw new Error('Component must be used under <OpenAPIProvider />');

  return components;
}

/**
 * The render options of the page, available under a page created with `createOpenAPIRenderer()`.
 */
export function useRenderContext(): RenderContext {
  const ctx = use(OptionsContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');

  return ctx;
}

/**
 * Generate TypeScript definitions of a JSON schema, `undefined` when disabled.
 */
export function useTypeScriptDefinitions(
  schema: JsonSchema | undefined,
  options: Pick<GenerateTypeScriptDefinitionsContext, 'name' | 'readOnly' | 'writeOnly'>,
): string | undefined {
  const runtime = useOpenAPI();
  const { name, readOnly, writeOnly } = options;
  const result = useMemo(() => {
    if (!schema || !runtime.generateTypeScriptDefinitions) return;
    return runtime.generateTypeScriptDefinitions(schema, {
      name,
      readOnly,
      writeOnly,
      doc: runtime.doc,
    });
  }, [runtime, schema, name, readOnly, writeOnly]);

  // assume it is on server component when returned async
  return result instanceof Promise ? use(result) : result;
}

function OpenAPIProvider({
  document,
  mediaAdapters,
  codeUsages,
  generateCodeSamples,
  generateTypeScriptDefinitions,
  proxyUrl,
  storageKeyPrefix = 'fumadocs-openapi-',
  shiki,
  shikiOptions = defaultShikiOptions,
  showResponseSchema,
  content,
  schemaUI,
  playground,
  components,
  children,
}: OpenAPIProviderProps) {
  const runtime = useMemo<OpenAPIRuntime>(
    () => ({
      doc: dereferenceBundledDocument(document),
      mediaAdapters: { ...defaultAdapters, ...mediaAdapters },
      codeUsages,
      generateCodeSamples,
      generateTypeScriptDefinitions,
      proxyUrl,
      storageKeyPrefix,
    }),
    [
      document,
      mediaAdapters,
      codeUsages,
      generateCodeSamples,
      generateTypeScriptDefinitions,
      proxyUrl,
      storageKeyPrefix,
    ],
  );
  const render = useMemo<RenderContext>(
    () => ({ shiki, shikiOptions, showResponseSchema, content, schemaUI, playground }),
    [shiki, shikiOptions, showResponseSchema, content, schemaUI, playground],
  );

  return (
    <OpenAPIContext value={runtime}>
      <ComponentsContext value={components}>
        <OptionsContext value={render}>
          <ServerProvider
            servers={runtime.doc.dereferenced.servers}
            storageKeyPrefix={runtime.storageKeyPrefix}
          >
            <AuthProvider>{children}</AuthProvider>
          </ServerProvider>
        </OptionsContext>
      </ComponentsContext>
    </OpenAPIContext>
  );
}

/**
 * Create `<OpenAPIPage />` from your own UI, it takes the props of generated pages.
 *
 * Code blocks are highlighted with the full Shiki bundle, pass `shiki` to trim it.
 */
export function createOpenAPIRenderer(options: CreateOpenAPIRendererOptions): FC<OpenAPIPageProps> {
  return createOpenAPIBaseRenderer({ ...options, shiki: options.shiki ?? defaultShikiFactory });
}

/**
 * `createOpenAPIRenderer()` without the Shiki bundle, code blocks are highlighted through the `shiki` you pass.
 */
export function createOpenAPIBaseRenderer({
  components,
  ...options
}: CreateOpenAPIRendererOptions & { shiki: ShikiFactory }): FC<OpenAPIPageProps> {
  const { Operation, Layout = DefaultLayout } = components;
  const slots: OpenAPIComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ ...options, components }),
  };

  function Content({ showTitle, showDescription, operations, webhooks }: OpenAPIPageProps) {
    const { dereferenced, resolve } = useOpenAPI().doc;
    const ctx = useRenderContext();
    const layout: PageLayoutProps = {
      operations: operations?.map((item) => {
        const pathItem = resolve(dereferenced.paths?.[item.path]);
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
              type="operation"
              path={item.path}
              method={item.method}
              operation={operation}
              pathItem={pathItem}
              showTitle={showTitle}
              showDescription={showDescription}
            />
          ),
        };
      }),
      webhooks: webhooks?.map((item) => {
        const pathItem = resolve(dereferenced.webhooks?.[item.name]);
        if (!pathItem)
          throw new Error(`[Fumadocs OpenAPI] Webhook not found in OpenAPI schema: ${item.name}`);
        const operation = pathItem[item.method];
        if (!operation)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in webhook: ${item.name}`,
          );

        return {
          item,
          children: (
            <Operation
              key={`${item.name}:${item.method}`}
              type="webhook"
              path={`/${item.name}`}
              method={item.method}
              operation={operation}
              pathItem={pathItem}
              showTitle={showTitle}
              showDescription={showDescription}
            />
          ),
        };
      }),
    };

    if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(layout, ctx);
    return <Layout {...layout} />;
  }

  return function OpenAPIPage(props) {
    let document: Document;
    let proxyUrl: string | undefined;
    if ('preloaded' in props) {
      document = props.preloaded.docs[props.document];
      if (!document)
        throw new Error(
          `[Fumadocs OpenAPI] the document ${props.document} is not preloaded, make sure to pass the "preloaded" prop to <OpenAPIPage />`,
        );
      proxyUrl = props.preloaded.proxyUrl;
    } else {
      document = props.payload.bundled;
      proxyUrl = props.payload.proxyUrl;
    }

    return (
      <OpenAPIProvider {...options} document={document} proxyUrl={proxyUrl} components={slots}>
        <Content {...props} />
      </OpenAPIProvider>
    );
  };
}

function DefaultLayout({ operations, webhooks }: PageLayoutProps) {
  return (
    <>
      {operations?.map((item) => item.children)}
      {webhooks?.map((item) => item.children)}
    </>
  );
}
