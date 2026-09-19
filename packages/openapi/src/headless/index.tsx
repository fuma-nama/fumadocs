'use client';
import { type ComponentProps, createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type { Awaitable, Document, HttpMethods, OperationObject, PathItemObject } from '@/types';
import type { OperationItem, OpenAPIPageProps, WebhookItem } from '@/utils/pages/builder';
import type { DereferencedDocument } from '@/utils/document/dereference';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import type { MediaAdapter } from '@/requests/media/adapter';
import { defaultAdapters } from '@/requests/media/adapter';
import type { CodeUsageGeneratorRegistry, InlineCodeUsageGenerator } from '@/requests/generators';
import type { JsonSchema } from '@fumadocs/json-schema';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import {
  createPageComponents,
  type CreatePageComponentsOptions as PageComponentsOptions,
} from 'shared-api/components/defaults';
import { AuthProvider } from '@/playground/auth';
import { ServerProvider } from './server';

export { useServer, type SelectedServer } from './server';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/** components the UI renders through, so a page can replace them */
export interface OpenAPIComponents {
  SchemaUI: FC<SchemaUIOptions>;
  Markdown: FC<{ md: string }>;
  CodeBlock: FC<CodeBlockProps>;
  Heading: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
}

export interface GenerateTypeScriptDefinitionsContext {
  name: string;
  readOnly: boolean;
  writeOnly: boolean;
  doc: DereferencedDocument;
}

export interface OpenAPIRuntime {
  doc: DereferencedDocument;
  /**
   * Support other media types.
   */
  mediaAdapters: Record<string, MediaAdapter>;
  proxyUrl?: string;
  /**
   * Set a prefix for `localStorage` keys.
   *
   * Useful when using multiple OpenAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-openapi-`
   */
  storageKeyPrefix: string;
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

interface OpenAPIProviderProps extends Partial<Omit<OpenAPIRuntime, 'doc'>> {
  /** the bundled OpenAPI document */
  document: Document;
  components: OpenAPIComponents;
  children: ReactNode;
}

/** props of the component rendering an operation or webhook of a page */
export interface PageOperationProps {
  type: 'operation' | 'webhook';
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;
  showTitle?: boolean;
  showDescription?: boolean;
}

export interface PageLayoutProps {
  operations?: { item: OperationItem; children: ReactNode }[];
  webhooks?: { item: WebhookItem; children: ReactNode }[];
}

export interface CreateOpenAPIPageOptions extends Omit<
  OpenAPIProviderProps,
  'document' | 'proxyUrl' | 'components' | 'children'
> {
  /** the Shiki highlighter of code blocks, without it they render unhighlighted */
  shiki?: ShikiFactory;
  shikiOptions?: PageComponentsOptions['shikiOptions'];
  components: Pick<OpenAPIComponents, 'SchemaUI'> &
    Partial<Omit<OpenAPIComponents, 'SchemaUI'>> & {
      /** renders an operation or webhook of the page */
      Operation: FC<PageOperationProps>;
      /** wraps the rendered operations and webhooks */
      Layout?: FC<PageLayoutProps>;
    };
}

const OpenAPIContext = createContext<OpenAPIRuntime | null>(null);
const ComponentsContext = createContext<OpenAPIComponents | null>(null);

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

/**
 * The runtime of an API page, mounted by `createOpenAPIPage()`.
 */
function OpenAPIProvider({
  document,
  mediaAdapters,
  codeUsages,
  generateCodeSamples,
  generateTypeScriptDefinitions,
  proxyUrl,
  storageKeyPrefix = 'fumadocs-openapi-',
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

  return (
    <OpenAPIContext value={runtime}>
      <ComponentsContext value={components}>
        <ServerProvider
          servers={runtime.doc.dereferenced.servers}
          storageKeyPrefix={runtime.storageKeyPrefix}
        >
          <AuthProvider>{children}</AuthProvider>
        </ServerProvider>
      </ComponentsContext>
    </OpenAPIContext>
  );
}

/**
 * Create `<OpenAPIPage />` from your own UI, it takes the props of generated pages.
 */
export function createOpenAPIPage({
  components,
  shiki,
  shikiOptions,
  ...options
}: CreateOpenAPIPageOptions): FC<OpenAPIPageProps> {
  const { Operation, Layout = DefaultLayout } = components;
  const slots: OpenAPIComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ shiki, shikiOptions, components }).components,
  };

  function Content({ showTitle, showDescription, operations, webhooks }: OpenAPIPageProps) {
    const { dereferenced, resolve } = useOpenAPI().doc;

    return (
      <Layout
        operations={operations?.map((item) => {
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
        })}
        webhooks={webhooks?.map((item) => {
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
        })}
      />
    );
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
